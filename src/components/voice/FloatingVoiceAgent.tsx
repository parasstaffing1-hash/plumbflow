import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Radio,
} from "lucide-react";
import { useVapi } from "@/hooks/useVapi";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Book an emergency boiler repair for today",
  "How many jobs do I have scheduled today?",
  "Draft a call-out quote for a leaking radiator",
  "Summarize my overdue customer invoices",
];

export function FloatingVoiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    isSpeaking,
    isMuted,
    volume,
    transcripts,
    errorMessage,
    startCall,
    stopCall,
    toggleMute,
    clearTranscript,
  } = useVapi();

  const isActive = status === "active";
  const isLoading = status === "loading";

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (isOpen && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts, isOpen]);

  // If a call starts, auto-open the assistant modal if closed
  useEffect(() => {
    if (isActive && !isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isActive, isOpen]);

  return (
    <>
      {/* Floating Trigger Button */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              if (status !== "active" && status !== "loading") {
                startCall();
              }
            }}
            className={cn(
              "group relative flex items-center gap-3 rounded-full p-3.5 shadow-2xl transition-all duration-300 active:scale-95",
              isActive
                ? "bg-amber text-ink ring-4 ring-amber/30 hover:bg-amber-deep"
                : "bg-ink text-paper border border-amber/30 hover:border-amber hover:shadow-amber/10",
            )}
            aria-label="PlumbFlow AI Voice Assistant"
          >
            {/* Pulsing ring during active call */}
            {isActive && (
              <span className="absolute -inset-1 rounded-full bg-amber/40 animate-ping pointer-events-none" />
            )}

            <div className="relative flex size-6 items-center justify-center">
              {isActive ? (
                isSpeaking ? (
                  <Volume2 className="size-5 animate-pulse text-ink" />
                ) : (
                  <Radio className="size-5 text-ink animate-bounce" />
                )
              ) : (
                <Mic className="size-5 text-amber group-hover:scale-110 transition-transform" />
              )}
            </div>

            <div className="hidden sm:flex flex-col text-left pr-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-deep">
                {isActive ? "Voice Agent Active" : "Voice AI Assistant"}
              </span>
              <span className="text-[13px] font-semibold text-foreground">
                {isActive ? (isSpeaking ? "Speaking..." : "Listening...") : "Talk Hands-Free"}
              </span>
            </div>

            {/* Live audio indicator badge */}
            {isActive && (
              <span className="flex size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>
        </div>
      )}

      {/* Expanded Voice Agent Drawer / Modal */}
      {isOpen && !isMinimized && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md md:inset-x-auto md:right-8 md:bottom-8 w-full md:w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-ink px-5 py-4 text-paper">
              <div className="flex items-center gap-3">
                <div className="relative flex size-10 items-center justify-center rounded-2xl bg-amber/20 text-amber">
                  <Bot className="size-5" />
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-ink" />
                  )}
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 text-base font-bold text-paper">
                    PlumbFlow Voice Agent
                    <Sparkles className="size-3.5 text-amber" />
                  </h3>
                  <p className="text-xs text-fog">
                    {isActive
                      ? isSpeaking
                        ? "AI Assistant is speaking..."
                        : "Listening for your command..."
                      : isLoading
                        ? "Connecting to Voice AI..."
                        : "Powered by Vapi AI Dispatcher"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-fog">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="rounded-lg p-1.5 hover:bg-white/10 hover:text-paper transition"
                  aria-label="Minimize Voice Assistant"
                >
                  <Minimize2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isActive) stopCall();
                    setIsOpen(false);
                  }}
                  className="rounded-lg p-1.5 hover:bg-white/10 hover:text-paper transition"
                  aria-label="Close Voice Assistant"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Audio Waveform & Status Visualizer */}
            <div className="border-b border-line bg-surface/50 px-5 py-6 text-center">
              <div className="flex items-center justify-center gap-1.5 h-12">
                {[40, 70, 95, 60, 85, 50, 90, 65, 45, 80, 55, 75].map((height, i) => {
                  const animatedHeight = isActive
                    ? Math.max(12, Math.min(48, height * (volume * 2.5 + (isSpeaking ? 0.6 : 0.2))))
                    : 8;
                  return (
                    <span
                      key={i}
                      style={{ height: `${animatedHeight}px` }}
                      className={cn(
                        "w-1.5 rounded-full transition-all duration-150",
                        isActive ? (isSpeaking ? "bg-amber" : "bg-emerald-500") : "bg-line",
                      )}
                    />
                  );
                })}
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate">
                {isActive
                  ? isSpeaking
                    ? "🔊 Assistant speaking"
                    : "🎙️ Listening to you"
                  : isLoading
                    ? "Establishing WebRTC audio connection..."
                    : status === "error"
                      ? "⚠️ Call disconnected - Tap to retry"
                      : "Tap below to start hands-free voice control"}
              </p>
              {errorMessage && status === "error" && (
                <p className="mt-2 text-xs text-emergency bg-emergency/10 border border-emergency/20 rounded-lg py-1 px-2.5 mx-auto inline-block max-w-[90%]">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Conversation Transcripts Box */}
            <div className="max-h-64 min-h-36 overflow-y-auto p-4 space-y-3 bg-surface/30">
              {transcripts.length === 0 ? (
                <div className="text-center py-6 text-slate">
                  <p className="text-xs font-medium">No voice notes yet.</p>
                  <p className="text-[11px] text-fog mt-1">
                    Try speaking naturally to book jobs, draft quotes, or record completion details.
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          if (!isActive) startCall();
                        }}
                        className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] text-slate hover:text-ink hover:border-amber transition text-left"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                transcripts.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2.5 max-w-[88%]",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        msg.role === "user" ? "bg-amber text-ink" : "bg-ink text-amber",
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="size-3.5" />
                      ) : (
                        <Bot className="size-3.5" />
                      )}
                    </div>
                    <div>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-xs leading-relaxed",
                          msg.role === "user"
                            ? "bg-amber text-ink font-medium rounded-tr-none"
                            : "bg-paper border border-line text-foreground rounded-tl-none shadow-sm",
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className="mt-0.5 block text-[10px] text-fog px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 border-t border-line bg-paper p-4">
              {isActive ? (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={cn(
                      "tap flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-xs font-semibold transition",
                      isMuted
                        ? "border-amber-deep bg-amber/20 text-amber-deep"
                        : "border-line bg-surface text-slate hover:text-ink",
                    )}
                  >
                    {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    <span>{isMuted ? "Unmute" : "Mute"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCall}
                    className="tap flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emergency py-3.5 text-sm font-bold text-white hover:bg-emergency/90 transition shadow-lg shadow-emergency/20"
                  >
                    <PhoneOff className="size-4" />
                    <span>End Voice Call</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => startCall()}
                  disabled={isLoading}
                  className="tap flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-bold text-ink hover:bg-amber-deep transition shadow-lg shadow-amber/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Radio className="size-4 animate-spin" />
                      <span>Connecting Call...</span>
                    </>
                  ) : status === "error" ? (
                    <>
                      <PhoneCall className="size-4" />
                      <span>Retry Voice Call</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="size-4" />
                      <span>Start Voice Call</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
