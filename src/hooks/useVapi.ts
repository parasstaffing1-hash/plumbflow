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
  cleanup?: () => void;
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

    const mod = await import("@vapi-ai/web");
    const VapiClass =
      (mod.default as unknown as { default?: new (key: string) => VapiInstance })?.default ||
      (mod.default as unknown as new (key: string) => VapiInstance);

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

    client.on("error", (err) => {
      console.warn("[Vapi] Call error:", err);
      const message = err instanceof Error ? err.message : String(err || "Connection error");
      setErrorMessage(message);
      setStatus("error");
      connectingRef.current = false;
      toast.error(`Voice assistant: ${message}`);
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
        const client = await getVapiClient();
        const targetId = overrideAssistantId || VAPI_ASSISTANT_ID;
        await client.start(targetId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start call";
        console.error("[Vapi] Start error:", err);
        setErrorMessage(msg);
        setStatus("error");
        connectingRef.current = false;
        toast.error(`Could not start voice call: ${msg}`);
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
  };
}
