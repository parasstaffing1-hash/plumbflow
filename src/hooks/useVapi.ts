import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  VAPI_PUBLIC_KEY,
  VAPI_ASSISTANT_ID,
  type VapiCallStatus,
  type VapiTranscriptMessage,
} from "@/lib/vapi";

interface VapiInstance {
  start: (assistantId: string) => Promise<unknown>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  send?: (message: unknown) => void;
  say?: (text: string) => void;
  cleanup?: () => void;
}

type VapiConstructor = new (publicKey: string) => VapiInstance;

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
  const [volume, setVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<VapiTranscriptMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vapiRef = useRef<VapiInstance | null>(null);
  const connectingRef = useRef(false);

  // Initialize Vapi SDK dynamically in the browser
  const getVapiClient = useCallback(async (): Promise<VapiInstance> => {
    if (vapiRef.current) return vapiRef.current;
    if (typeof window === "undefined") {
      throw new Error("Vapi can only be instantiated in the browser.");
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

    const client = new VapiClass(VAPI_PUBLIC_KEY);

    client.on("call-start", () => {
      setStatus("active");
      connectingRef.current = false;
      toast.success("Connected to PlumbFlow AI Voice Assistant");
    });

    client.on("call-end", () => {
      setStatus("idle");
      setIsSpeaking(false);
      setIsListening(false);
      setVolume(0);
      connectingRef.current = false;
    });

    client.on("speech-start", () => {
      setIsSpeaking(true);
    });

    client.on("speech-end", () => {
      setIsSpeaking(false);
    });

    client.on("volume-level", (level) => {
      if (typeof level === "number") {
        setVolume(level);
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
        toast.error(`Voice assistant: ${message}`);
      }
    });

    vapiRef.current = client;
    return client;
  }, []);

  const startCall = useCallback(
    async (overrideAssistantId?: string) => {
      if (connectingRef.current || status === "active") return;
      connectingRef.current = true;
      setStatus("loading");
      setErrorMessage(null);

      try {
        if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone access requires a secure HTTPS browser connection.");
        }

        // Test microphone permission explicitly so browser prompt appears cleanly
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Release the preview stream immediately; Vapi SDK captures its own track
            stream.getTracks().forEach((track) => track.stop());
          } catch (micErr) {
            console.warn("[Vapi] Microphone check warning:", micErr);
            throw new Error(
              "Microphone access was denied. Please allow microphone permissions in your browser to talk with the assistant.",
            );
          }
        }

        const client = await getVapiClient();
        const targetId = overrideAssistantId || VAPI_ASSISTANT_ID;
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
        toast.error(msg, { duration: 6000 });
      }
    },
    [getVapiClient, status],
  );

  const stopCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setStatus("idle");
    setIsSpeaking(false);
    setIsListening(false);
    setVolume(0);
    setErrorMessage(null);
    connectingRef.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current || status !== "active") return;
    const nextMuted = !isMuted;
    vapiRef.current.setMuted(nextMuted);
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
        vapiRef.current.stop();
      }
    };
  }, []);

  return {
    status,
    isSpeaking,
    isListening,
    isMuted,
    volume,
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
