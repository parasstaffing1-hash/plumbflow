import type { Enquiry, Photo } from "./domain";

export const MAX_HOMEOWNER_PHOTOS = 3;
const MAX_EDGE = 1000;
const JPEG_QUALITY = 0.6;

export interface IntakePayload {
  orgSlug: string;
  businessName: string;
  description: string;
  isEmergency: boolean;
  photos: Photo[];
  postcode: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  preferredTiming: string;
  /** Town picked from the org's area list, or "Other". */
  area?: string;
  /** Service picked from the org's job types, or "Other or not sure". */
  service?: string;
  /**
   * Video references only. The prototype keeps a filename and size, never the
   * bytes: base64 video would blow the localStorage quota instantly. Real
   * upload storage arrives with the backend.
   */
  videos?: VideoRef[];
}

export interface VideoRef {
  id: string;
  name: string;
  size: number;
}

export const MAX_HOMEOWNER_VIDEOS = 2;
/** His current site accepts videos up to 50MB. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export interface IntakeStore {
  addEnquiry: (input: Omit<Enquiry, "id" | "orgId" | "reference" | "receivedAt">) => Enquiry;
  log: (entityType: "enquiry", entityId: string, message: string) => void;
}

/**
 * The single door between the homeowner surface and the data store. When a
 * real backend arrives only the body of this function changes.
 */
export function submitEnquiry(store: IntakeStore, payload: IntakePayload): Enquiry {
  const enquiry = store.addEnquiry({
    customerId: null,
    propertyId: null,
    jobTypeId: null,
    contactName: payload.contactName.trim() || "Website visitor",
    phone: payload.phone.trim(),
    ...(payload.email.trim() ? { email: payload.email.trim() } : {}),
    rawAddress: [payload.address.trim(), payload.postcode.trim().toUpperCase()]
      .filter(Boolean)
      .join(", "),
    description: [
      payload.description.trim(),
      payload.service ? `Service needed: ${payload.service}` : "",
      payload.area ? `Area: ${payload.area}` : "",
      payload.videos?.length
        ? `Video attached: ${payload.videos.map((video) => video.name).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    isEmergency: payload.isEmergency,
    urgency: payload.isEmergency ? "emergency" : "standard",
    valueBand: "small",
    status: "new",
    source: "web",
    photos: payload.photos.slice(0, MAX_HOMEOWNER_PHOTOS),
    preferredTiming: payload.preferredTiming,
  });

  store.log(
    "enquiry",
    enquiry.id,
    `Web form enquiry ${enquiry.reference} received from ${enquiry.contactName}`,
  );
  notifyPlumber(enquiry);
  return enquiry;
}

/** Stub. A real build sends an SMS and a push notification. */
export function notifyPlumber(enquiry: Enquiry): void {
  console.info("notifyPlumber", enquiry.reference, enquiry.isEmergency ? "EMERGENCY" : "standard");
}

/**
 * Downscales to 1000px on the long edge and re-encodes as JPEG so three
 * photos cannot fill the localStorage quota on their own.
 */
export async function compressPhoto(file: File, stage: Photo["stage"] = "before"): Promise<Photo> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo"));
    reader.readAsDataURL(file);
  });

  const shrunk = await new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });

  return {
    id: `hp_${Math.random().toString(36).slice(2, 10)}`,
    stage,
    label: "Sent by the customer",
    capturedAt: new Date().toISOString(),
    dataUrl: shrunk,
  };
}
