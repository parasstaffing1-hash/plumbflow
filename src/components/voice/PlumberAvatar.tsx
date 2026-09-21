import { useState } from "react";
import { Mic, MicOff, Volume2, Wrench, Sparkles, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlumberAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  status?: "idle" | "loading" | "active" | "error";
  isSpeaking?: boolean;
  isListening?: boolean;
  isMuted?: boolean;
  volume?: number;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
}

export function PlumberAvatar({
  size = "md",
  status = "idle",
  isSpeaking = false,
  isListening = false,
  isMuted = false,
  volume = 0,
  interactive = false,
  onClick,
  className,
  showBadge = true,
}: PlumberAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const isActive = status === "active";
  const isLoading = status === "loading";

  // Dynamic scale calculation based on live speech volume
  const pulseScale = isActive && isSpeaking ? 1 + Math.min(volume * 0.4, 0.15) : 1;
  const auraOpacity = isActive ? Math.min(0.3 + volume * 0.7, 0.9) : 0.2;

  // Size mapping
  const sizeClasses = {
    sm: "size-8",
    md: "size-12",
    lg: "size-24 sm:size-28",
    xl: "size-32 sm:size-36",
  };

  const badgeSizeClasses = {
    sm: "size-2.5 -bottom-0.5 -right-0.5 ring-1",
    md: "size-3.5 -bottom-0.5 -right-0.5 ring-2",
    lg: "size-6 -bottom-1 -right-1 ring-3",
    xl: "size-7 -bottom-1 -right-1 ring-4",
  };

  const badgeIconSizeClasses = {
    sm: "size-1.5",
    md: "size-2",
    lg: "size-3.5",
    xl: "size-4",
  };

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        interactive && "cursor-pointer group active:scale-95 transition-transform",
        className,
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label="PlumbFlow AI Plumber Assistant"
    >
      {/* Outer Reactive Soundwave Halo (Only when active & large) */}
      {(size === "lg" || size === "xl") && isActive && (
        <>
          {/* Outermost animated pulse ring */}
          <span
            style={{
              transform: `scale(${isSpeaking ? 1.25 + volume * 0.35 : 1.15})`,
              opacity: auraOpacity * 0.5,
            }}
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-150 pointer-events-none",
              isSpeaking
                ? "bg-amber/30 blur-md animate-pulse"
                : isListening
                  ? "bg-emerald-500/30 blur-md animate-pulse"
                  : "bg-amber/20 blur-sm",
            )}
          />

          {/* Secondary concentric soundwave ring */}
          <span
            style={{
              transform: `scale(${isSpeaking ? 1.12 + volume * 0.2 : 1.06})`,
              opacity: auraOpacity * 0.8,
            }}
            className={cn(
              "absolute inset-0 rounded-full border-2 transition-all duration-150 pointer-events-none",
              isSpeaking
                ? "border-amber/60 animate-ping"
                : isListening
                  ? "border-emerald-400/60"
                  : "border-amber/30",
            )}
          />
        </>
      )}

      {/* Loading Ring Spinner */}
      {isLoading && (
        <span className="absolute -inset-1.5 rounded-full border-2 border-transparent border-t-amber border-r-amber animate-spin pointer-events-none" />
      )}

      {/* Main Avatar Container */}
      <div
        style={{
          transform: `scale(${pulseScale})`,
        }}
        className={cn(
          "relative overflow-hidden rounded-full transition-transform duration-150 shadow-md",
          sizeClasses[size],
          isActive
            ? isSpeaking
              ? "ring-3 ring-amber ring-offset-2 ring-offset-paper shadow-amber/25"
              : isListening
                ? "ring-3 ring-emerald-500 ring-offset-2 ring-offset-paper shadow-emerald-500/25"
                : "ring-2 ring-amber/60 ring-offset-1 ring-offset-paper"
            : isLoading
              ? "ring-2 ring-amber/40 ring-offset-1 ring-offset-paper animate-pulse"
              : "ring-1.5 ring-line hover:ring-amber/50 transition-all",
        )}
      >
        {!imgError ? (
          <img
            src="/plumber-avatar.jpg"
            alt="Dave - PlumbFlow AI Plumber"
            onError={() => setImgError(true)}
            className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="eager"
          />
        ) : (
          /* High quality fallback vector plumber icon */
          <div className="size-full bg-gradient-to-br from-ink to-ink-soft flex items-center justify-center text-amber">
            <Wrench className="size-1/2" />
          </div>
        )}

        {/* Live Speaking / Listening Overlays */}
        {isActive && isSpeaking && (
          <div className="absolute inset-0 bg-gradient-to-t from-amber/20 to-transparent pointer-events-none" />
        )}

        {isMuted && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white/90">
            <MicOff className="size-1/3" />
          </div>
        )}
      </div>

      {/* Status Badge Pin */}
      {showBadge && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full text-white ring-paper transition-colors",
            badgeSizeClasses[size],
            isActive
              ? isSpeaking
                ? "bg-amber text-ink animate-bounce"
                : isListening
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500 text-white"
              : isLoading
                ? "bg-amber-deep text-paper animate-spin"
                : status === "error"
                  ? "bg-emergency text-white"
                  : "bg-ink text-amber",
          )}
          title={
            isActive
              ? isSpeaking
                ? "Dave is speaking"
                : "Dave is listening"
              : isLoading
                ? "Connecting..."
                : "PlumbFlow Voice Agent"
          }
        >
          {isActive ? (
            isSpeaking ? (
              <Volume2 className={badgeIconSizeClasses[size]} />
            ) : isListening ? (
              <Mic className={badgeIconSizeClasses[size]} />
            ) : (
              <Radio className={badgeIconSizeClasses[size]} />
            )
          ) : isLoading ? (
            <Radio className={badgeIconSizeClasses[size]} />
          ) : (
            <Sparkles className={badgeIconSizeClasses[size]} />
          )}
        </span>
      )}
    </div>
  );
}
