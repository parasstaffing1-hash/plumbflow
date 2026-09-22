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
import { PlumberAvatar } from "./PlumberAvatar";

const QUICK_PROMPTS = [
  "Create an invoice for John for a boiler repair, £350",
  "Book an emergency boiler repair for today",
  "How many jobs do I have scheduled today?",
  "Draft a call-out quote for a leaking radiator",
  "List my recent voice invoices",
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

      {/* Floating Trigger Button with Interactive Plumber Avatar */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-20 right-4 z-[90] md:bottom-8 md:right-8 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={handleTriggerClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-full p-2 pr-4 shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer",
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

            {/* Plumber Avatar thumbnail in floating pill */}
            <PlumberAvatar
              size="md"
              status={status}
              isSpeaking={isSpeaking}
              isListening={isListening}
              volume={volume}
              showBadge={true}
            />

            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-deep">
                {isActive ? "Dave is Active" : "AI Voice Agent"}
              </span>
              <span className="text-[13px] font-semibold text-foreground leading-tight">
                {isActive
                  ? isSpeaking
                    ? "Speaking..."
                    : isListening
                      ? "Hearing you..."
                      : "Listening..."
                  : "Talk to Dave"}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Expanded Voice Agent Drawer / Modal */}
      {isOpen && !isMinimized && (
        <div className="fixed inset-x-3 bottom-16 sm:bottom-20 z-[90] mx-auto max-w-md md:inset-x-auto md:right-8 md:bottom-8 w-full md:w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-ink px-5 py-3.5 text-paper">
              <div className="flex items-center gap-3">
                <PlumberAvatar
                  size="sm"
                  status={status}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  volume={volume}
                />
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-paper">
                    Dave &bull; PlumbFlow Dispatcher
                    <Sparkles className="size-3 text-amber" />
                  </h3>
                  <p className="text-[11px] text-fog">
                    {isActive
                      ? isSpeaking
                        ? "Dave is speaking..."
                        : "Listening for your trade command..."
                      : isLoading
                        ? "Connecting to Dave..."
                        : "Hands-Free Voice Dispatcher"}
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

            {/* Interactive Plumber Avatar Hero Stage */}
            <div className="border-b border-line bg-gradient-to-b from-ink/5 to-surface/80 px-5 pt-6 pb-5 text-center">
              <div className="flex flex-col items-center justify-center">
                {/* Large Interactive Plumber Avatar */}
                <PlumberAvatar
                  size="lg"
                  status={status}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  isMuted={isMuted}
                  volume={volume}
                  interactive
                  onClick={isActive ? toggleMute : () => handleStartCall()}
                />

                {/* Status Pill & State Caption */}
                <div className="mt-3.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 shadow-2xs border border-line">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isActive
                          ? isSpeaking
                            ? "bg-amber animate-pulse"
                            : isListening
                              ? "bg-emerald-500 animate-ping"
                              : "bg-emerald-500"
                          : isLoading
                            ? "bg-amber animate-spin"
                            : "bg-slate/40",
                      )}
                    />
                    <span className="text-xs font-bold text-ink">
                      Dave &bull; AI Plumber Assistant
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate">
                    {isActive
                      ? isSpeaking
                        ? "🔊 Dave is speaking to you..."
                        : isListening
                          ? "🎙️ Hearing your voice... speak naturally"
                          : isMuted
                            ? "🔇 Microphone muted (tap Dave to unmute)"
                            : "🎙️ Dave is listening to you"
                      : isLoading
                        ? "Establishing voice connection..."
                        : status === "error"
                          ? "⚠️ Connection issue - Tap Dave or below to retry"
                          : "Tap Dave or Start Call to book jobs & query diary"}
                  </p>
                </div>

                {/* Animated Audio Waveform Bars */}
                <div className="mt-3 flex items-center justify-center gap-1 h-6">
                  {[20, 45, 70, 35, 60, 80, 50, 65, 30, 55, 40, 75, 45, 25].map((height, i) => {
                    const animatedHeight = isActive
                      ? Math.max(6, Math.min(24, height * (volume * 1.5 + (isSpeaking ? 0.35 : 0.15))))
                      : isLoading
                        ? Math.max(6, Math.sin(Date.now() / 200 + i) * 10 + 12)
                        : 4;
                    return (
                      <span
                        key={i}
                        style={{ height: `${animatedHeight}px` }}
                        className={cn(
                          "w-1 rounded-full transition-all duration-150",
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

                {errorMessage && status === "error" && (
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-emergency bg-emergency/10 border border-emergency/20 rounded-lg py-1.5 px-3 mx-auto max-w-[95%] text-left">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
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
                        <PlumberAvatar size="sm" showBadge={false} className="size-6 shrink-0" />
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
