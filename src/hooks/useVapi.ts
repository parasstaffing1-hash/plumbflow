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
}

type VapiConstructor = new (publicKey: string) => VapiInstance;

function extractVapiError(err: unknown): { message: string } {
  if (!err) return { message: "Connection issue" };
  if (err instanceof Error) {
    let msg = err.message || "Connection error";
    if (
      msg.includes("Permission denied") ||
      msg.includes("NotAllowedError") ||
      msg.toLowerCase().includes("permission")
    ) {
      msg = "Microphone access was denied. Please allow microphone permissions in your browser.";
    }
    return { message: msg };
  }
  if (typeof err === "string") {
    if (err.includes("[object Object]")) {
      return { message: "Unable to connect to Voice AI. Please check microphone permissions." };
    }
    return { message: err };
  }
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const unwrap = (val: unknown): string => {
      if (!val) return "";
      if (typeof val === "string" && !val.includes("[object Object]")) return val;
      if (val instanceof Error) return val.message;
      if (typeof val === "object") {
        const r = val as Record<string, unknown>;
        if (typeof r["message"] === "string" && !r["message"].includes("[object Object]"))
          return r["message"];
        if (typeof r["error"] === "string" && !r["error"].includes("[object Object]"))
          return r["error"];
        if (typeof r["errorMsg"] === "string") return r["errorMsg"];
        if (typeof r["reason"] === "string") return r["reason"];
        if (r["error"] && typeof r["error"] === "object") return unwrap(r["error"]);
      }
      return "";
    };

    let detail = unwrap(obj["error"]) || unwrap(obj["message"]) || unwrap(obj["errorMsg"]);
    if (!detail || detail.includes("[object Object]")) {
      detail = "Connection issue. Please check microphone permissions and retry.";
    }
    return { message: detail };
  }
  return { message: "Connection issue" };
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

  const initFreshClient = useCallback(async (): Promise<VapiInstance> => {
    if (typeof window === "undefined") {
      throw new Error("Vapi can only be instantiated in the browser.");
    }

    // Always clean up any existing instance so new calls start 100% fresh
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

    const client = new VapiClass(VAPI_PUBLIC_KEY);

    // Call connected events
    client.on("call-start", () => {
      setStatus("active");
      connectingRef.current = false;
      toast.success("Connected to PlumbFlow AI Voice Assistant");
    });

    client.on("call-start-success", () => {
      setStatus("active");
      connectingRef.current = false;
    });

    client.on("call-end", () => {
      setStatus("idle");
      setIsSpeaking(false);
      setIsListening(false);
      setAssistantVolume(0);
      setUserVolume(0);
      connectingRef.current = false;
    });

    client.on("speech-start", () => {
      setIsSpeaking(true);
    });

    client.on("speech-end", () => {
      setIsSpeaking(false);
    });

    // Remote assistant audio level
    client.on("volume-level", (level) => {
      if (typeof level === "number") {
        setAssistantVolume(level);
      }
    });

    // User microphone audio level
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

    // Non-fatal background events (Krisp noise-reduction, audio observers) are logged only, never aborting the call
    client.on("error", (err) => {
      console.warn("[Vapi] Background event warning:", err);
    });

    // Genuine failure to join the call
    client.on("call-start-failed", (evt: unknown) => {
      console.error("[Vapi] Call start failed:", evt);
      const { message } = extractVapiError(evt);
      setErrorMessage(message);
      setStatus("error");
      connectingRef.current = false;
      toast.error(`Could not connect: ${message}`);
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
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone access requires a secure HTTPS browser connection.");
        }

        const client = await initFreshClient();
        const targetId = overrideAssistantId || VAPI_ASSISTANT_ID;

        // Start call directly - Daily connects WebRTC and acquires mic natively
        const webCall = await client.start(targetId);

        // Immediate activation once start() resolves
        if (webCall) {
          setStatus("active");
          connectingRef.current = false;
        }
      } catch (err) {
        console.error("[Vapi] Start exception:", err);
        const { message } = extractVapiError(err);
        setErrorMessage(message);
        setStatus("error");
        connectingRef.current = false;
        toast.error(message, { duration: 6000 });
      }
    },
    [initFreshClient, status],
  );

  const stopCall = useCallback(() => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (e) {
        console.warn("[Vapi] stopCall error:", e);
      }
    }
    setStatus("idle");
    setIsSpeaking(false);
    setIsListening(false);
    setAssistantVolume(0);
    setUserVolume(0);
    setErrorMessage(null);
    connectingRef.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current || status !== "active") return;
    const nextMuted = !isMuted;
    try {
      vapiRef.current.setMuted(nextMuted);
    } catch (e) {
      console.warn("[Vapi] setMuted error:", e);
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
    };
  }, []);

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
