import confetti from "canvas-confetti";

/**
 * Triggers a realistic celebration confetti burst (for job completions, invoice payments, quote approvals)
 */
export function triggerSuccessConfetti() {
  if (typeof window === "undefined") return;

  // Primary blast
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#2563eb", "#38bdf8", "#0284c7", "#f59e0b", "#10b981"],
  });

  // Secondary delayed side canons
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#2563eb", "#38bdf8", "#10b981"],
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#2563eb", "#f59e0b", "#10b981"],
    });
  }, 200);
}
