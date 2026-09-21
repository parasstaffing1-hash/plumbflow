import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { PenTool, RotateCcw, Check, X } from "lucide-react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, signatoryName: string) => void;
  defaultName?: string;
  title?: string;
  description?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  defaultName = "",
  title = "Customer Sign-Off",
  description = "Please ask the homeowner / client to sign below confirming work approval.",
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [signatoryName, setSignatoryName] = useState(defaultName);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (defaultName) {
      setSignatoryName(defaultName);
    }
  }, [defaultName]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      const pad = new SignaturePad(canvas, {
        penColor: "#0f172a",
        backgroundColor: "rgba(255, 255, 255, 0)",
        minWidth: 1.5,
        maxWidth: 3.5,
      });

      pad.addEventListener("afterUpdateStroke", () => {
        setIsEmpty(pad.isEmpty());
      });

      padRef.current = pad;
      setIsEmpty(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      padRef.current?.off();
      padRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!padRef.current || padRef.current.isEmpty()) return;
    const dataUrl = padRef.current.toDataURL("image/png");
    onSave(dataUrl, signatoryName.trim() || defaultName || "Customer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-wash text-amber-deep">
                <PenTool className="size-4" />
              </div>
              <h2 className="text-xl font-bold text-ink">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-slate">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-full p-2 text-fog hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="signatory-name" className="block text-xs font-semibold uppercase tracking-wider text-slate">
              Signatory Name
            </label>
            <input
              id="signatory-name"
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="e.g. John Smith"
              className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base font-semibold text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate">
              <span>Sign Here (Touch screen or mouse)</span>
              <button
                type="button"
                onClick={handleClear}
                disabled={isEmpty}
                className="tap flex items-center gap-1 text-amber-deep hover:underline disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" /> Clear
              </button>
            </div>
            <div className="mt-1.5 relative h-48 w-full rounded-2xl border-2 border-dashed border-line bg-paper overflow-hidden touch-none select-none">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 size-full cursor-crosshair touch-none"
              />
              {isEmpty && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-fog">
                  <PenTool className="size-7 stroke-[1.5] mb-1.5 opacity-40" />
                  <span className="text-sm font-medium">Draw signature here</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-xl border border-line bg-paper px-4 py-2.5 text-base font-semibold text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isEmpty}
            className="tap flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-base font-semibold text-paper hover:bg-slate disabled:opacity-40"
          >
            <Check className="size-4" />
            Accept & Sign
          </button>
        </div>
      </div>
    </div>
  );
}
