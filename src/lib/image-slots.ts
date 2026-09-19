import heroGraphic from "@/assets/hero-graphic.webp.asset.json";
import jobsEmptyState from "@/assets/jobs-empty-state.webp.asset.json";
import invoicesEmptyState from "@/assets/invoices-empty-state.webp.asset.json";
import voiceCommandIcon from "@/assets/voice-command-icon.webp.asset.json";
import unifiedInboxIcon from "@/assets/unified-inbox-icon.webp.asset.json";
import heroPhoto from "@/assets/hero-photo.webp.asset.json";
import moneyPhoto from "@/assets/money-photo.webp.asset.json";
import vanPhoto from "@/assets/van-photo.webp.asset.json";

export type ImageSlot = {
  /** CDN url for the current image in this slot. */
  src: string;
  /** Intrinsic pixel width, reserved to prevent layout shift. */
  width: number;
  /** Intrinsic pixel height, reserved to prevent layout shift. */
  height: number;
  /** Descriptive alt text. Empty string marks a purely decorative slot. */
  alt: string;
};

/**
 * Named image slots. To swap an image, replace the asset pointer imported
 * above (or point `src` elsewhere) — call sites reference the slot name only.
 *
 * Slots in use:
 *  - heroBackdrop        marketing homepage hero, low-opacity backdrop
 *  - pricingBandBackdrop marketing homepage £69 band, low-opacity backdrop
 *  - jobsEmpty           app Jobs list, zero-jobs illustration
 *  - invoicesEmpty       app Money/Invoices, nothing-outstanding illustration
 *
 * Registered, not yet placed (waiting on copy):
 *  - voiceCommandIcon
 *  - unifiedInboxIcon
 */
export const IMAGE_SLOTS = {
  heroBackdrop: {
    src: heroGraphic.url,
    width: 1983,
    height: 793,
    alt: "",
  },
  pricingBandBackdrop: {
    src: heroGraphic.url,
    width: 1983,
    height: 793,
    alt: "",
  },
  jobsEmpty: {
    src: jobsEmptyState.url,
    width: 1254,
    height: 1254,
    alt: "Illustration of an empty clipboard, shown when no jobs have been added yet.",
  },
  invoicesEmpty: {
    src: invoicesEmptyState.url,
    width: 1254,
    height: 1254,
    alt: "Illustration of a tidy stack of invoice documents, shown when nothing is outstanding.",
  },
  heroPhoto: {
    src: heroPhoto.url,
    width: 1600,
    height: 1200,
    alt: "Close-up of a plumber's hands using a wrench on copper pipework beneath a sink.",
  },
  moneyLeaksPhoto: {
    src: moneyPhoto.url,
    width: 1600,
    height: 1200,
    alt: "A kitchen table at night under a lamp, covered with paperwork, receipts and a calculator.",
  },
  vanPhoto: {
    src: vanPhoto.url,
    width: 1600,
    height: 1200,
    alt: "A white trade van parked on a residential street at golden hour with its rear doors open, showing racked parts and a toolbox.",
  },
  voiceCommandIcon: {
    src: voiceCommandIcon.url,
    width: 1230,
    height: 1278,
    alt: "Line illustration of a phone with a microphone, representing voice notes.",
  },
  unifiedInboxIcon: {
    src: unifiedInboxIcon.url,
    width: 1254,
    height: 1254,
    alt: "Line illustration of email, message and call icons feeding into one tray, representing a single inbox.",
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotName = keyof typeof IMAGE_SLOTS;
