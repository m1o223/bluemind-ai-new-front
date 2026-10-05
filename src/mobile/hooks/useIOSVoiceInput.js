import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

// MobileChat also imports the web hook module, which owns the shared plugin
// registration. Reuse that native proxy on iOS instead of registering a second
// proxy and producing conflicting duplicate-plugin startup behavior.
const NativeVoice = Capacitor.Plugins.BlueMindNativeVoice;

const SILENT_LEVEL = 0.08;
const WAVEFORM_POINTS = 96;

function initialLevels() {
  return [];
}

function decodeRecording(result) {
  const encoded = String(result?.base64 || "");
  if (!encoded) return null;

  const binary = globalThis.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: String(result?.mimeType || "audio/mp4") });
}

/**
 * Native-only voice capture for the Capacitor iOS app.
 *
 * Browser MediaRecorder, getUserMedia, AudioContext, and Web Speech APIs are
 * intentionally absent from this hook. The web app continues to use the
 * existing useVoiceInput implementation unchanged.
 */
export default function useIOSVoiceInput({ onRecordingComplete, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("idle");
  const [audioLevels, setAudioLevels] = useState(initialLevels);
  const [liveTranscript] = useState("");
  const recordingRef = useRef(false);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);

  const reset = useCallback(() => {
    recordingRef.current = false;
    if (!mountedRef.current) return;
    setIsListening(false);
    setStatus("idle");
    setAudioLevels(initialLevels());
  }, []);

  const start = useCallback(async ({ language } = {}) => {
    if (recordingRef.current) return false;
    const operation = ++operationRef.current;
    setStatus("requesting");

    try {
      await NativeVoice.start({ language: String(language || "") });
      if (!mountedRef.current || operation !== operationRef.current) {
        await NativeVoice.cancel().catch(() => undefined);
        return false;
      }
      recordingRef.current = true;
      setIsListening(true);
      setStatus("listening");
      return true;
    } catch (error) {
      reset();
      if (mountedRef.current) {
        setStatus("error");
        onError?.(error?.message || "Microphone permission is required for voice input.");
      }
      return false;
    }
  }, [onError, reset]);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return null;
    const operation = ++operationRef.current;
    recordingRef.current = false;
    if (mountedRef.current) {
      setIsListening(false);
      setStatus("processing");
    }

    try {
      const result = await NativeVoice.stop();
      if (operation !== operationRef.current) return null;
      const recording = decodeRecording(result);
      if (recording) onRecordingComplete?.(recording);
      return recording;
    } catch (error) {
      if (mountedRef.current) {
        setStatus("error");
        onError?.(error?.message || "Unable to process the voice recording.");
      }
      return null;
    } finally {
      if (operation === operationRef.current) reset();
    }
  }, [onError, onRecordingComplete, reset]);

  const cancel = useCallback(async () => {
    ++operationRef.current;
    reset();
    try {
      await NativeVoice.cancel();
    } catch {
      // The native recorder may already have stopped after an interruption.
    }
  }, [reset]);

  useEffect(() => {
    mountedRef.current = true;
    let meterHandle;
    let interruptionHandle;
    let disposed = false;

    Promise.all([
      NativeVoice.addListener("meter", ({ level }) => {
        if (!mountedRef.current || !recordingRef.current) return;
        const normalized = Math.max(SILENT_LEVEL, Math.min(1, Number(level) || SILENT_LEVEL));
        setAudioLevels((current) => [...current, normalized].slice(-WAVEFORM_POINTS));
      }),
      NativeVoice.addListener("interrupted", () => {
        ++operationRef.current;
        reset();
      }),
    ]).then(([meter, interruption]) => {
      if (disposed) {
        void meter.remove();
        void interruption.remove();
      } else {
        meterHandle = meter;
        interruptionHandle = interruption;
      }
    });

    return () => {
      disposed = true;
      mountedRef.current = false;
      ++operationRef.current;
      void meterHandle?.remove();
      void interruptionHandle?.remove();
      if (recordingRef.current) void NativeVoice.cancel();
      recordingRef.current = false;
    };
  }, [reset]);

  return { isListening, status, audioLevels, liveTranscript, start, stop, cancel };
}
