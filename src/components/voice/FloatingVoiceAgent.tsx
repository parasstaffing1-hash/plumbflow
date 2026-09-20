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
  ChevronDown,
  AlertCircle,
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
    isListening,
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

  // If a call becomes active, ensure the modal is visible
  useEffect(() => {
    if (isActive && !isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isActive, isOpen]);

  const handleTriggerClick = () => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleStartCall = (initialPrompt?: string) => {
    startCall();
  };

  return (
    <>
      {/* Mobile backdrop when modal is open */}
      {isOpen && !isMinimized && (
        <div
          className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMinimized(true)}
          aria-hidden="true"
        />
      )}

      {/* Floating Trigger Button */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-20 right-4 z-[90] md:bottom-8 md:right-8 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={handleTriggerClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-full p-3.5 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer",
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

            <div className="flex flex-col text-left pr-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-deep">
                {isActive ? "Voice Agent Active" : "Voice AI Assistant"}
              </span>
              <span className="text-[13px] font-semibold text-foreground leading-tight">
                {isActive ? (isSpeaking ? "Speaking..." : isListening ? "Hearing you..." : "Listening...") : "Talk Hands-Free"}
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
        <div className="fixed inset-x-3 bottom-16 sm:bottom-20 z-[90] mx-auto max-w-md md:inset-x-auto md:right-8 md:bottom-8 w-full md:w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-300">
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
                  className="rounded-lg p-1.5 hover:bg-white/10 hover:text-paper transition cursor-pointer"
                  aria-label="Minimize Voice Assistant"
                  title="Minimize"
                >
                  <Minimize2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isActive) stopCall();
                    setIsOpen(false);
                  }}
                  className="rounded-lg p-1.5 hover:bg-white/10 hover:text-paper transition cursor-pointer"
                  aria-label="Close Voice Assistant"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Audio Waveform & Status Visualizer */}
            <div className="border-b border-line bg-surface/50 px-5 py-5 text-center">
              <div className="flex items-center justify-center gap-1.5 h-12">
                {[40, 70, 95, 60, 85, 50, 90, 65, 45, 80, 55, 75].map((height, i) => {
                  const animatedHeight = isActive
                    ? Math.max(12, Math.min(48, height * (volume * 2.5 + (isSpeaking ? 0.6 : 0.2))))
                    : isLoading
                      ? Math.max(10, Math.sin((Date.now() / 200) + i) * 20 + 24)
                      : 8;
                  return (
                    <span
                      key={i}
                      style={{ height: `${animatedHeight}px` }}
                      className={cn(
                        "w-1.5 rounded-full transition-all duration-150",
                        isActive
                          ? isSpeaking
                            ? "bg-amber"
                            : "bg-emerald-500"
                          : isLoading
                            ? "bg-amber/60 animate-pulse"
                            : "bg-line",
                      )}
                    />
                  );
                })}
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate">
                {isActive
                  ? isSpeaking
                    ? "🔊 Assistant speaking"
                    : isListening
                      ? "🎙️ Hearing your voice..."
                      : "🎙️ Listening to you"
                  : isLoading
                    ? "Establishing WebRTC audio connection..."
                    : status === "error"
                      ? "⚠️ Connection issue - Tap below to retry"
                      : "Tap Start Voice Call to talk hands-free"}
              </p>
              {errorMessage && status === "error" && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-emergency bg-emergency/10 border border-emergency/20 rounded-lg py-1.5 px-3 mx-auto max-w-[95%] text-left">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Conversation Transcripts Box */}
            <div className="max-h-60 min-h-32 overflow-y-auto p-4 space-y-3 bg-surface/30">
              {transcripts.length === 0 ? (
                <div className="text-center py-5 text-slate">
                  <p className="text-xs font-medium">No voice notes yet.</p>
                  <p className="text-[11px] text-fog mt-1">
                    Tap below or choose a prompt to start hands-free voice control:
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          if (!isActive) handleStartCall(prompt);
                        }}
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] text-slate hover:text-ink hover:border-amber transition text-left cursor-pointer active:scale-95 shadow-2xs"
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
                      "tap flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-xs font-semibold transition cursor-pointer",
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
                    className="tap flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emergency py-3.5 text-sm font-bold text-white hover:bg-emergency/90 transition shadow-lg shadow-emergency/20 cursor-pointer active:scale-98"
                  >
                    <PhoneOff className="size-4" />
                    <span>End Voice Call</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartCall()}
                  disabled={isLoading}
                  className="tap flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-amber py-3.5 text-sm font-bold text-ink hover:bg-amber-deep transition shadow-lg shadow-amber/20 disabled:opacity-60 cursor-pointer active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Radio className="size-4 animate-spin text-ink" />
                      <span>Connecting Call...</span>
                    </>
                  ) : status === "error" ? (
                    <>
                      <PhoneCall className="size-4 text-ink" />
                      <span>Retry Voice Call</span>
                    </>
                  ) : (
                    <>
                      <Mic className="size-4 text-ink" />
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
