import { useId } from "react";
import { Mic, MicOff, RefreshCw, Sparkles } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { cn } from "@/lib/utils";

/** Text field with Deepgram Nova-2 voice dictation and trade keyword boosting. */
export function VoiceField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  singleLine = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  singleLine?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const { supported, listening, isTranscribing, livePreview, toggle } = useDictation((text) =>
    onChange(value ? `${value} ${text}` : text),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label-caps flex items-center gap-1.5">
          <span>{label}</span>
          {listening && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-deep animate-pulse normal-case">
              <span className="size-2 rounded-full bg-amber" />
              Listening...
            </span>
          )}
          {isTranscribing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-deep normal-case">
              <RefreshCw className="size-3 animate-spin" />
              Transcribing via Deepgram...
            </span>
          )}
        </label>
        {supported ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggle}
              disabled={disabled || isTranscribing}
              aria-label={listening ? `Stop dictating ${label}` : `Dictate ${label} with Deepgram`}
              aria-pressed={listening}
              title={listening ? "Stop & Transcribe" : "Dictate with Deepgram Nova-2"}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer",
                listening
                  ? "border-amber-deep bg-amber text-ink ring-4 ring-amber/20 animate-pulse"
                  : isTranscribing
                    ? "border-amber/40 bg-amber/10 text-amber-deep"
                    : "border-line bg-paper text-slate hover:border-amber hover:text-ink hover:bg-surface",
              )}
            >
              {isTranscribing ? (
                <RefreshCw className="size-4.5 animate-spin" aria-hidden />
              ) : listening ? (
                <MicOff className="size-5" aria-hidden />
              ) : (
                <Mic className="size-5" aria-hidden />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {singleLine ? (
        <input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={listening ? "Listening... speak naturally" : placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "tap mt-2 w-full rounded-xl border bg-paper px-3 text-base text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none transition-colors",
            listening ? "border-amber ring-2 ring-amber/15" : "border-line",
          )}
        />
      ) : (
        <textarea
          id={id}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={listening ? "Listening... speak naturally" : placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-2 w-full rounded-xl border bg-paper px-3 py-2 text-base text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none transition-colors",
            listening ? "border-amber ring-2 ring-amber/15" : "border-line",
          )}
        />
      )}

      {/* Live speech preview overlay while speaking */}
      {listening && livePreview && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate italic bg-surface/60 rounded-lg px-2.5 py-1 border border-line">
          <Sparkles className="size-3 text-amber shrink-0" />
          <span>Preview: "{livePreview}"</span>
        </p>
      )}
    </div>
  );
}
