import { useCallback, useEffect, useRef, useState } from "react";

const SILENT_LEVEL = 0.08;
const WAVEFORM_POINTS = 28;

function createInitialLevels() {
  return Array.from({ length: WAVEFORM_POINTS }, () => SILENT_LEVEL);
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function logVoiceDebug(label, details, level = "debug") {
  const payload = {
    label,
    details,
    secureContext: window.isSecureContext,
    host: window.location.host,
    hasMediaDevices: Boolean(navigator.mediaDevices),
    hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    hasSpeechRecognition: Boolean(getSpeechRecognition()),
    userAgent: navigator.userAgent,
  };

  if (level === "error") {
    console.error("[BlueMind Voice]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[BlueMind Voice]", payload);
    return;
  }

  console.debug("[BlueMind Voice]", payload);
}

function getMicrophoneErrorMessage(error) {
  const name = error?.name || error?.error || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "not-allowed") {
    return "Microphone permission denied.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "audio-capture") {
    return "No microphone detected.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your microphone is already in use by another app.";
  }

  if (name === "SecurityError") {
    return "Microphone access requires a secure HTTPS connection.";
  }

  if (error?.message) {
    return error.message;
  }

  return `Microphone capture failed${name ? `: ${name}` : ""}.`;
}

function getSpeechRecognitionErrorMessage(error) {
  const name = error?.error || error?.name || "";

  switch (name) {
    case "not-allowed":
      return "Microphone permission denied.";
    case "audio-capture":
      return "No microphone detected.";
    case "network":
      return "Speech Recognition service failed: network error.";
    case "service-not-allowed":
      return "Speech Recognition service is not allowed in this browser.";
    case "language-not-supported":
      return "Speech Recognition does not support the selected language.";
    case "bad-grammar":
      return "Speech Recognition grammar error.";
    case "aborted":
      return "Recognition aborted unexpectedly.";
    case "no-speech":
      return "No speech was detected.";
    default:
      return `Speech Recognition service failed${name ? `: ${name}` : ""}.`;
  }
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
  const recognitionErrorRef = useRef("");

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
    let permissionState = "unknown";
    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: "microphone" });
        permissionState = permission.state;
      }
    } catch (error) {
      permissionState = `unavailable: ${error?.name || "unknown"}`;
    }

    logVoiceDebug("startWaveform:before-getUserMedia", { permissionState });

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
    await audioContext.resume?.();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    streamRef.current = stream;
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    logVoiceDebug("startWaveform:success", {
      permissionState,
      audioContextState: audioContext.state,
      tracks: stream.getAudioTracks().map((track) => ({
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      })),
    });

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
    if (!SpeechRecognition) {
      logVoiceDebug("startRecognition:unsupported", {}, "warn");
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language || navigator.language || "en-US";
    recognitionErrorRef.current = "";

    recognition.onstart = () => {
      logVoiceDebug("recognition:onstart", {
        lang: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
      });
    };

    recognition.onresult = (event) => {
      logVoiceDebug("recognition:onresult", {
        resultIndex: event.resultIndex,
        resultCount: event.results?.length,
      });

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
      logVoiceDebug("recognition:onerror", {
        error: event.error,
        message: event.message,
        type: event.type,
        timeStamp: event.timeStamp,
      }, event.error === "no-speech" ? "warn" : "error");

      if (event.error === "no-speech") return;

      if (event.error === "aborted" && !shouldRestartRecognitionRef.current) return;

      shouldRestartRecognitionRef.current = false;
      recognitionErrorRef.current = event.error || "unknown";
      recognitionRef.current = null;
      onError?.(getSpeechRecognitionErrorMessage(event));
    };

    recognition.onend = () => {
      logVoiceDebug("recognition:onend", {
        shouldRestart: shouldRestartRecognitionRef.current,
        lastError: recognitionErrorRef.current,
      }, recognitionErrorRef.current ? "warn" : "debug");

      recognitionRef.current = null;
      if (!shouldRestartRecognitionRef.current) return;

      window.setTimeout(() => {
        if (!shouldRestartRecognitionRef.current) return;
        try {
          recognitionRef.current = recognition;
          recognition.start();
          logVoiceDebug("recognition:restart", { lang: recognition.lang });
        } catch (error) {
          logVoiceDebug("recognition:restart-failed", {
            name: error?.name,
            message: error?.message,
          }, "error");
          recognitionRef.current = null;
          shouldRestartRecognitionRef.current = false;
          recognitionErrorRef.current = error?.name || "restart-failed";
          onError?.(getSpeechRecognitionErrorMessage(error));
        }
      }, 180);
    };

    recognitionRef.current = recognition;
    shouldRestartRecognitionRef.current = true;
    try {
      recognition.start();
      logVoiceDebug("recognition:start-called", {
        lang: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
      });
      return true;
    } catch (error) {
      logVoiceDebug("recognition:start-failed", {
        name: error?.name,
        message: error?.message,
      }, "error");
      recognitionRef.current = null;
      shouldRestartRecognitionRef.current = false;
      recognitionErrorRef.current = error?.name || "start-failed";
      onError?.(getSpeechRecognitionErrorMessage(error));
      return false;
    }
  }, [onError, onTranscript]);

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
        onError?.("Browser does not support Speech Recognition. Microphone recording is active, but transcription will not work.");
      }
    } catch (error) {
      logVoiceDebug("start:microphone-failed", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      }, "error");
      stopAnalyzer();
      setIsListening(false);
      onError?.(getMicrophoneErrorMessage(error));
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
