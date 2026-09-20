import { useId } from "react";
import { Mic, MicOff } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { cn } from "@/lib/utils";

/** B4, text field with optional dictation. The mic hides silently when unsupported. */
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
  const { supported, listening, toggle } = useDictation((text) =>
    onChange(value ? `${value} ${text}` : text),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label-caps">
          {label}
        </label>
        {supported ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? `Stop dictating ${label}` : `Dictate ${label}`}
            aria-pressed={listening}
            className={cn(
              "flex size-12 items-center justify-center rounded-full border",
              listening
                ? "border-amber-deep bg-amber text-ink"
                : "border-line bg-surface text-slate",
            )}
          >
            {listening ? (
              <MicOff className="size-5" aria-hidden />
            ) : (
              <Mic className="size-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {singleLine ? (
        <input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="tap mt-2 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none"
        />
      ) : (
        <textarea
          id={id}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none"
        />
      )}
    </div>
  );
}
