import { useCallback, useEffect, useRef, useState } from "react";

const SILENT_LEVEL = 0.08;
const WAVEFORM_POINTS = 28;

function createInitialLevels() {
  return Array.from({ length: WAVEFORM_POINTS }, () => SILENT_LEVEL);
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getVoiceErrorMessage(error) {
  const name = error?.name || error?.error || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "not-allowed") {
    return "Microphone permission is blocked. Please allow microphone access and try again.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "audio-capture") {
    return "No microphone was found. Please connect a microphone and try again.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your microphone is already in use by another app.";
  }

  if (name === "SecurityError") {
    return "Microphone access requires a secure HTTPS connection.";
  }

  if (name === "network" || name === "service-not-allowed") {
    return "Voice recognition is temporarily unavailable. Please try again.";
  }

  return "Could not capture voice input. Please try again.";
}

export default function useVoiceInput({ onTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState(createInitialLevels);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(0);
  const baseTextRef = useRef("");
  const committedTranscriptRef = useRef("");
  const shouldRestartRecognitionRef = useRef(false);

  const stopAnalyzer = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    try {
      audioContextRef.current?.close?.();
    } catch {
      // The browser can throw when an AudioContext is already closed.
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setAudioLevels(createInitialLevels());
  }, []);

  const stop = useCallback(() => {
    shouldRestartRecognitionRef.current = false;

    try {
      recognitionRef.current?.stop?.();
    } catch {
      // SpeechRecognition throws if stop is called while not active.
    }

    recognitionRef.current = null;
    stopAnalyzer();
    setIsListening(false);
  }, [stopAnalyzer]);

  const cancel = useCallback(() => {
    onTranscript?.(baseTextRef.current);
    stop();
  }, [onTranscript, stop]);

  const startWaveform = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("AudioContext is not supported in this browser.");
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    streamRef.current = stream;
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const samples = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      let sum = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const centered = (samples[index] - 128) / 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / samples.length);
      const nextLevel = Math.max(SILENT_LEVEL, Math.min(1, rms * 4.8));

      setAudioLevels((current) => [...current.slice(1), nextLevel]);
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  }, []);

  const startRecognition = useCallback(({ language }) => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language || navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";

        if (event.results[index].isFinal) {
          committedTranscriptRef.current = `${committedTranscriptRef.current} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const nextText = [baseTextRef.current, committedTranscriptRef.current, interimTranscript]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trimStart();

      onTranscript?.(nextText);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;

      shouldRestartRecognitionRef.current = false;
      onError?.(getVoiceErrorMessage(event));
      stop();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!shouldRestartRecognitionRef.current) return;

      window.setTimeout(() => {
        if (!shouldRestartRecognitionRef.current) return;
        try {
          recognitionRef.current = recognition;
          recognition.start();
        } catch {
          recognitionRef.current = null;
        }
      }, 180);
    };

    recognitionRef.current = recognition;
    shouldRestartRecognitionRef.current = true;
    recognition.start();
    return true;
  }, [onError, onTranscript, stop]);

  const start = useCallback(async ({ baseText = "", language } = {}) => {
    if (isListening) {
      stop();
      return;
    }

    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      onError?.("Microphone access requires a secure HTTPS connection.");
      return;
    }

    baseTextRef.current = String(baseText || "");
    committedTranscriptRef.current = "";

    try {
      await startWaveform();
      const recognitionStarted = startRecognition({ language });
      setIsListening(true);

      if (!recognitionStarted) {
        onError?.("Speech recognition is not supported in this browser, but microphone recording is active.");
      }
    } catch (error) {
      stopAnalyzer();
      setIsListening(false);
      onError?.(getVoiceErrorMessage(error));
    }
  }, [isListening, onError, startRecognition, startWaveform, stop, stopAnalyzer]);

  useEffect(() => () => stop(), [stop]);

  return {
    isListening,
    audioLevels,
    start,
    stop,
    cancel,
  };
}
