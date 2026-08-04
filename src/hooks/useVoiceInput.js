import { useCallback, useEffect, useRef, useState } from "react";

const SILENT_LEVEL = 0.08;
const WAVEFORM_POINTS = 28;

function createInitialLevels() {
  return Array.from({ length: WAVEFORM_POINTS }, () => SILENT_LEVEL);
}

function getSupportedMimeType() {
  if (!window.MediaRecorder) return "";

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ].find((type) => window.MediaRecorder.isTypeSupported(type)) || "";
}

function getMicrophoneErrorMessage(error) {
  const name = error?.name || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone permission denied.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone detected.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your microphone is already in use by another app.";
  }

  if (name === "SecurityError") {
    return "Microphone access requires a secure HTTPS connection.";
  }

  return error?.message || "Microphone capture failed.";
}

export default function useVoiceInput({ onRecordingComplete, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("idle");
  const [audioLevels, setAudioLevels] = useState(createInitialLevels);
  const [liveTranscript, setLiveTranscript] = useState("");
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(0);
  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const stopPromiseRef = useRef(null);
  const cancelledRef = useRef(false);
  const stoppingRef = useRef(false);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  const getLiveTranscript = useCallback(() => {
    return [finalTranscriptRef.current, interimTranscriptRef.current].filter(Boolean).join(" ").trim();
  }, []);

  const updateLiveTranscript = useCallback(() => {
    setLiveTranscript(getLiveTranscript());
  }, [getLiveTranscript]);

  const stopSpeechRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;

    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop?.();
    } catch {
      try {
        recognition.abort?.();
      } catch {
        // Browser speech recognition may already be stopped.
      }
    }
  }, []);

  const startSpeechRecognition = useCallback((language) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language || navigator.language || "en-US";

      recognition.onresult = (event) => {
        let finalText = finalTranscriptRef.current;
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = String(result?.[0]?.transcript || "").trim();
          if (!transcript) continue;

          if (result.isFinal) {
            finalText = [finalText, transcript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          } else {
            interimText = [interimText, transcript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          }
        }

        finalTranscriptRef.current = finalText;
        interimTranscriptRef.current = interimText;
        updateLiveTranscript();
      };

      recognition.onerror = (event) => {
        if (["no-speech", "aborted"].includes(event?.error)) return;
        if (event?.error === "not-allowed") {
          onError?.("Microphone permission is required for voice input.");
        }
      };

      recognition.onend = () => {
        if (listeningRef.current && !stoppingRef.current && !cancelledRef.current) {
          try {
            recognition.start();
          } catch {
            // Some browsers throttle restarts; recording continues through MediaRecorder.
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      return false;
    }
  }, [onError, updateLiveTranscript]);

  const stopAnalyzer = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    try {
      audioContextRef.current?.close?.();
    } catch {
      // AudioContext may already be closed by the browser.
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setAudioLevels(createInitialLevels());
  }, []);

  const startWaveform = useCallback(async (stream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    await audioContext.resume?.();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    audioContext.createMediaStreamSource(stream).connect(analyser);

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

  const cleanup = useCallback(() => {
    stopSpeechRecognition();
    recorderRef.current = null;
    chunksRef.current = [];
    stopPromiseRef.current = null;
    stoppingRef.current = false;
    listeningRef.current = false;
    setIsListening(false);
    setStatus("idle");
    setLiveTranscript("");
    stopAnalyzer();
  }, [stopAnalyzer, stopSpeechRecognition]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    stoppingRef.current = true;
    stopSpeechRecognition();

    if (!recorder || recorder.state === "inactive") {
      cleanup();
      return Promise.resolve(null);
    }

    if (!stopPromiseRef.current) {
      stopPromiseRef.current = new Promise((resolve) => {
        recorder.onstop = () => {
          const chunks = chunksRef.current;
          const mimeType = recorder.mimeType || getSupportedMimeType() || "audio/webm";
          const blob = chunks.length ? new Blob(chunks, { type: mimeType }) : null;
          const cancelled = cancelledRef.current;
          cleanup();
          resolve(cancelled ? null : blob);
        };
      });
    }
    const stopPromise = stopPromiseRef.current;

    try {
      recorder.stop();
    } catch (error) {
      cleanup();
      onError?.(getMicrophoneErrorMessage(error));
      return Promise.resolve(null);
    }

    return stopPromise.then((blob) => {
      if (blob) onRecordingComplete?.(blob);
      return blob;
    });
  }, [cleanup, onError, onRecordingComplete, stopSpeechRecognition]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    return stop();
  }, [stop]);

  const start = useCallback(async ({ language } = {}) => {
    if (isListening) return false;

    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      onError?.("Microphone access requires a secure HTTPS connection.");
      setStatus("error");
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("No microphone detected.");
      setStatus("error");
      return false;
    }

    if (!window.MediaRecorder) {
      onError?.("Audio recording is not supported in this browser.");
      setStatus("error");
      return false;
    }

    try {
      setStatus("requesting");
      cancelledRef.current = false;
      stoppingRef.current = false;
      chunksRef.current = [];
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      setLiveTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (cancelledRef.current) {
        stream.getTracks?.().forEach((track) => track.stop());
        cleanup();
        return false;
      }
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = (event) => {
        onError?.(getMicrophoneErrorMessage(event.error));
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      await startWaveform(stream);
      recorder.start(250);
      listeningRef.current = true;
      setIsListening(true);
      setStatus("listening");
      startSpeechRecognition(language);
      return true;
    } catch (error) {
      cleanup();
      setStatus("error");
      onError?.(getMicrophoneErrorMessage(error));
      return false;
    }
  }, [cleanup, isListening, onError, startSpeechRecognition, startWaveform]);

  useEffect(() => () => {
    cancelledRef.current = true;
    if (recorderRef.current?.state && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore teardown failures.
      }
    }
    stopAnalyzer();
    stopSpeechRecognition();
  }, [stopAnalyzer, stopSpeechRecognition]);

  return {
    isListening,
    status,
    audioLevels,
    liveTranscript,
    start,
    stop,
    cancel,
  };
}
