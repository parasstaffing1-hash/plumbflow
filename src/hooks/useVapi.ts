import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  VAPI_PUBLIC_KEY,
  VAPI_ASSISTANT_ID,
  type VapiCallStatus,
  type VapiTranscriptMessage,
} from "@/lib/vapi";

interface VapiInstance {
  start: (assistantId: string, assistantOverrides?: unknown) => Promise<unknown>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  send?: (message: unknown) => void;
  say?: (text: string) => void;
  cleanup?: () => void;
}

type VapiConstructor = new (
  publicKey: string,
  apiBaseUrl?: string,
  dailyCallConfig?: unknown,
  dailyCallObject?: { audioSource?: MediaStreamTrack | boolean | string; startAudioOff?: boolean }
) => VapiInstance;

function isNonFatalError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("krisp") ||
    lower.includes("audioworklet") ||
    lower.includes("devices-error") ||
    lower.includes("cam-error") ||
    lower.includes("camera") ||
    lower.includes("observer") ||
    lower.includes("recording")
  );
}

function extractVapiError(err: unknown): { message: string; isFatal: boolean } {
  if (!err) return { message: "Connection error", isFatal: true };
  if (err instanceof Error) {
    return { message: err.message, isFatal: !isNonFatalError(err.message) };
  }
  if (typeof err === "string") {
    return { message: err, isFatal: !isNonFatalError(err) };
  }
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const type = typeof obj["type"] === "string" ? obj["type"] : "";
    const stage = typeof obj["stage"] === "string" ? obj["stage"] : "";

    // Ignore known non-fatal background audio observers / worklet errors
    if (
      type.includes("observer") ||
      type.includes("video") ||
      type.includes("camera") ||
      stage.includes("observer") ||
      stage.includes("recording")
    ) {
      return { message: type || stage, isFatal: false };
    }

    let detail = "";
    if (obj["error"]) {
      const inner = obj["error"];
      if (typeof inner === "string") {
        detail = inner;
      } else if (typeof inner === "object" && inner !== null) {
        const innerObj = inner as Record<string, unknown>;
        detail = String(innerObj["message"] || innerObj["error"] || innerObj["reason"] || "");
      }
    }
    if (!detail && typeof obj["message"] === "string") detail = obj["message"];
    if (!detail && type) detail = type;
    if (!detail) detail = "Connection issue";

    return { message: detail, isFatal: !isNonFatalError(detail) };
  }
  return { message: "Connection error", isFatal: true };
}

export function useVapi() {
  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [assistantVolume, setAssistantVolume] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<VapiTranscriptMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vapiRef = useRef<VapiInstance | null>(null);
  const connectingRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localTrackRef = useRef<MediaStreamTrack | null>(null);

  const cleanupLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }
    localTrackRef.current = null;
  }, []);

  // Initialize Vapi SDK dynamically in the browser with live MediaStreamTrack attached
  const createVapiClient = useCallback(
    async (audioTrack: MediaStreamTrack): Promise<VapiInstance> => {
      if (typeof window === "undefined") {
        throw new Error("Vapi can only be instantiated in the browser.");
      }

      // If a previous instance exists, clean it up before instantiating new one
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
        vapiRef.current = null;
      }

      const mod = (await import("@vapi-ai/web")) as unknown as {
        default?: VapiConstructor | { default?: VapiConstructor };
        Vapi?: VapiConstructor;
      };
      const VapiClass: VapiConstructor | undefined =
        typeof mod.default === "function"
          ? mod.default
          : typeof (mod.default as { default?: VapiConstructor })?.default === "function"
            ? (mod.default as { default?: VapiConstructor }).default
            : typeof mod.Vapi === "function"
              ? mod.Vapi
              : typeof mod === "function"
                ? (mod as unknown as VapiConstructor)
                : undefined;

      if (!VapiClass) {
        throw new Error("Unable to locate Vapi SDK constructor.");
      }

      // Pass the active live MediaStreamTrack directly into Daily via audioSource
      // This eliminates the "no inbound audio" race condition where stopping tracks
      // leaves Daily with an unattached or muted audio input.
      const client = new VapiClass(VAPI_PUBLIC_KEY, undefined, undefined, {
        audioSource: audioTrack,
      });

      client.on("call-start", () => {
        setStatus("active");
        connectingRef.current = false;
        toast.success("Connected to PlumbFlow AI Voice Assistant");
      });

      client.on("call-end", () => {
        setStatus("idle");
        setIsSpeaking(false);
        setIsListening(false);
        setAssistantVolume(0);
        setUserVolume(0);
        connectingRef.current = false;
        cleanupLocalMedia();
      });

      client.on("speech-start", () => {
        setIsSpeaking(true);
      });

      client.on("speech-end", () => {
        setIsSpeaking(false);
      });

      // Remote assistant voice volume
      client.on("volume-level", (level) => {
        if (typeof level === "number") {
          setAssistantVolume(level);
        }
      });

      // Local user microphone volume (activates Daily's local audio observer)
      client.on("local-volume-level", (level) => {
        if (typeof level === "number") {
          setUserVolume(level);
          setIsListening(level > 0.05);
        }
      });

      client.on("message", (msg) => {
        if (!msg || typeof msg !== "object") return;
        const payload = msg as Record<string, unknown>;

        if (payload["type"] === "transcript") {
          const text = (payload["transcript"] as string) || "";
          const role = (payload["role"] as "user" | "assistant") || "assistant";
          const transcriptType = payload["transcriptType"] as string;

          if (text && (transcriptType === "final" || transcriptType === "partial")) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === role && transcriptType === "partial") {
                return [...prev.slice(0, -1), { ...last, text }];
              }
              if (transcriptType === "final") {
                if (last && last.role === role && last.text === text) return prev;
                return [
                  ...prev,
                  {
                    id: `vmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    role,
                    text,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  },
                ];
              }
              return prev;
            });
          }
        }
      });

      client.on("call-start-failed", (evt: unknown) => {
        console.warn("[Vapi] Call start failed:", evt);
        const { message } = extractVapiError(evt);
        setErrorMessage(message);
        setStatus("error");
        connectingRef.current = false;
        cleanupLocalMedia();
        toast.error(`Could not connect: ${message}`);
      });

      client.on("error", (err) => {
        console.warn("[Vapi] Event error:", err);
        const { message, isFatal } = extractVapiError(err);
        if (!isFatal) {
          // Harmless non-fatal background noise cancellation / observer setup event - keep call alive
          return;
        }
        setErrorMessage(message);
        if (connectingRef.current) {
          setStatus("error");
          connectingRef.current = false;
          cleanupLocalMedia();
          toast.error(`Voice assistant: ${message}`);
        }
      });

      vapiRef.current = client;
      return client;
    },
    [cleanupLocalMedia],
  );

  const startCall = useCallback(
    async (overrideAssistantId?: string) => {
      if (connectingRef.current || status === "active") return;
      connectingRef.current = true;
      setStatus("loading");
      setErrorMessage(null);

      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone access requires a secure HTTPS browser connection.");
        }

        // Release any previous tracks before acquiring fresh stream
        cleanupLocalMedia();

        // 1. Acquire live microphone stream with full voice processing filters
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (micErr) {
          console.warn("[Vapi] Microphone access denied:", micErr);
          throw new Error(
            "Microphone access was denied. Please allow microphone permissions in your browser to talk with the assistant.",
          );
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || audioTrack.readyState !== "live") {
          throw new Error(
            "Could not acquire an active microphone track. Please check your audio input device.",
          );
        }

        // Attach listeners to detect hardware mute or disconnect
        audioTrack.onmute = () => {
          console.warn("[Vapi] Microphone track reported muted by system or hardware");
        };
        audioTrack.onunmute = () => {
          console.info("[Vapi] Microphone track unmuted");
        };
        audioTrack.onended = () => {
          console.warn("[Vapi] Microphone track ended unexpectedly");
        };

        localStreamRef.current = stream;
        localTrackRef.current = audioTrack;

        // 2. Instantiate Vapi with the verified live MediaStreamTrack attached directly
        const client = await createVapiClient(audioTrack);
        const targetId = overrideAssistantId || VAPI_ASSISTANT_ID;

        // 3. Connect to call
        await client.start(targetId);
      } catch (err) {
        let msg = err instanceof Error ? err.message : "Failed to start call";
        if (
          msg.includes("Permission denied") ||
          msg.includes("NotAllowedError") ||
          msg.toLowerCase().includes("permission")
        ) {
          msg =
            "Microphone access was denied. Please allow microphone permissions in your browser to talk with the assistant.";
        }
        console.error("[Vapi] Start error:", err);
        setErrorMessage(msg);
        setStatus("error");
        connectingRef.current = false;
        cleanupLocalMedia();
        toast.error(msg, { duration: 6000 });
      }
    },
    [cleanupLocalMedia, createVapiClient, status],
  );

  const stopCall = useCallback(() => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (e) {
        console.warn("[Vapi] stopCall error:", e);
      }
    }
    cleanupLocalMedia();
    setStatus("idle");
    setIsSpeaking(false);
    setIsListening(false);
    setAssistantVolume(0);
    setUserVolume(0);
    setErrorMessage(null);
    connectingRef.current = false;
  }, [cleanupLocalMedia]);

  const toggleMute = useCallback(() => {
    if (status !== "active") return;
    const nextMuted = !isMuted;

    // Toggle hardware track directly
    if (localTrackRef.current) {
      localTrackRef.current.enabled = !nextMuted;
    }

    // Inform Daily/Vapi
    if (vapiRef.current && typeof vapiRef.current.setMuted === "function") {
      try {
        vapiRef.current.setMuted(nextMuted);
      } catch (e) {
        console.warn("[Vapi] setMuted error:", e);
      }
    }

    setIsMuted(nextMuted);
    toast.info(nextMuted ? "Microphone muted" : "Microphone unmuted");
  }, [isMuted, status]);

  const clearTranscript = useCallback(() => {
    setTranscripts([]);
  }, []);

  const send = useCallback(
    (message: unknown) => {
      if (vapiRef.current && status === "active" && typeof vapiRef.current.send === "function") {
        try {
          vapiRef.current.send(message);
        } catch (e) {
          console.warn("[Vapi] Send error:", e);
        }
      }
    },
    [status],
  );

  const say = useCallback(
    (text: string) => {
      if (vapiRef.current && status === "active" && typeof vapiRef.current.say === "function") {
        try {
          vapiRef.current.say(text);
        } catch (e) {
          console.warn("[Vapi] Say error:", e);
        }
      }
    },
    [status],
  );

  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
      }
      cleanupLocalMedia();
    };
  }, [cleanupLocalMedia]);

  // Combined volume: remote assistant when speaking, local mic when user talks
  const activeVolume = isSpeaking ? assistantVolume : userVolume;

  return {
    status,
    isSpeaking,
    isListening,
    isMuted,
    volume: activeVolume,
    assistantVolume,
    userVolume,
    transcripts,
    errorMessage,
    startCall,
    stopCall,
    toggleMute,
    clearTranscript,
    send,
    say,
  };
}
