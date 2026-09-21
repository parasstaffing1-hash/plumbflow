import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { ScanBarcode, X, Camera, Keyboard, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Boiler Serial / Barcode",
  subtitle = "Point camera at boiler data plate, GC number, or parts barcode",
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "plumbflow-qr-reader";

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setCameraError(null);
    setIsScanning(true);

    const startScanner = async () => {
      try {
        // Wait for DOM element to mount
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (!mounted) return;

        const qrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 180 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (!mounted) return;
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate?.(100);
              } catch {
                // Ignore vibration errors
              }
            }
            onScan(decodedText.trim());
            handleClose();
          },
          () => {
            // Scan attempt error (frame not containing barcode yet)
          },
        );
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError(
          msg.includes("NotAllowedError") || msg.includes("Permission")
            ? "Camera permission was denied. You can manually enter the serial number below."
            : "Could not initialize camera scanner. Please enter the serial number manually.",
        );
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              html5QrCodeRef.current?.clear();
            } catch {
              // Ignore cleanup error
            }
            html5QrCodeRef.current = null;
          });
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            html5QrCodeRef.current?.clear();
          } catch {
            // Ignore
          }
          html5QrCodeRef.current = null;
          onClose();
        });
    } else {
      onClose();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <ScanBarcode className="size-5" />
              </div>
              <h2 className="text-xl font-bold text-ink">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-slate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="tap rounded-full p-2 text-fog hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Viewfinder */}
          <div className="relative min-h-[240px] w-full overflow-hidden rounded-2xl border border-line bg-black flex flex-col items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full" />

            {cameraError ? (
              <div className="p-4 text-center text-rose-300">
                <Camera className="mx-auto size-8 opacity-60 mb-2 text-rose-400" />
                <p className="text-sm font-medium">{cameraError}</p>
              </div>
            ) : isScanning ? (
              <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 border-2 border-emerald-400/80 rounded-xl h-28 flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400/80 animate-pulse" />
              </div>
            ) : null}
          </div>

          {/* Manual Entry Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <label htmlFor="manual-serial" className="block text-xs font-semibold uppercase tracking-wider text-slate">
              Or Enter Serial / GC Number Manually
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-fog" />
                <input
                  id="manual-serial"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 7738100806 or 47-311-85"
                  className="w-full rounded-xl border border-line bg-paper pl-10 pr-3.5 py-2.5 text-base font-semibold text-ink placeholder:text-fog focus:border-amber-deep focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="tap flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-base font-semibold text-paper disabled:opacity-40"
              >
                <Check className="size-4" />
                Insert
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="tap rounded-xl border border-line bg-paper px-4 py-2 text-base font-semibold text-ink hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
