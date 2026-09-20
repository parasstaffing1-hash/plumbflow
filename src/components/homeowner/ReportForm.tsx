import { useRef, useState } from "react";
import { Mic, Phone, Camera, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useDictation } from "@/hooks/useDictation";
import {
  compressPhoto,
  submitEnquiry,
  MAX_HOMEOWNER_PHOTOS,
  MAX_HOMEOWNER_VIDEOS,
  MAX_VIDEO_BYTES,
  type VideoRef,
} from "@/lib/intake";
import { telHref, type Tenant } from "@/lib/tenants";
import type { Photo } from "@/lib/domain";
import { cn } from "@/lib/utils";

const TIMINGS = ["Today", "Tomorrow", "This week", "No rush"];

export function ReportForm({
  tenant,
  initial,
  onEmergencyChange,
  onSent,
}: {
  tenant: Tenant;
  initial?: {
    problem?: string;
    postcode?: string;
    phone?: string;
    town?: string;
    service?: string;
  };
  onEmergencyChange?: (next: boolean) => void;
  onSent: (reference: string) => void;
}) {
  const { addEnquiry, log } = useStore();
  const { account, profile } = tenant;
  const areaOptions = [...profile.towns.map((town) => town.name), "Other"];
  const serviceOptions = [...(profile.services ?? []), "Other or not sure"];

  const [description, setDescription] = useState(initial?.problem ?? "");
  const [emergency, setEmergency] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [address, setAddress] = useState(initial?.town ?? "");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState("");
  const [timing, setTiming] = useState("Today");
  const [area, setArea] = useState(
    initial?.town && profile.towns.some((town) => town.name === initial.town) ? initial.town : "",
  );
  const [service, setService] = useState(
    initial?.service && (profile.services ?? []).includes(initial.service) ? initial.service : "",
  );
  const [videos, setVideos] = useState<VideoRef[]>([]);
  /** Honeypot. Humans never see it, bots fill it in and we drop the submission. */
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<{ description?: string; phone?: string; postcode?: string }>(
    {},
  );
  const [busy, setBusy] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const postcodeRef = useRef<HTMLInputElement>(null);

  const dictation = useDictation((text) =>
    setDescription((prev) => (prev ? `${prev} ${text}` : text)),
  );

  function chooseEmergency(next: boolean) {
    setEmergency(next);
    onEmergencyChange?.(next);
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_HOMEOWNER_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can send up to ${MAX_HOMEOWNER_PHOTOS} photos.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    try {
      const next = await Promise.all(picked.map((file) => compressPhoto(file)));
      setPhotos((prev) => [...prev, ...next]);
    } catch {
      toast.error("That photo could not be added. You can still send the form.");
    }
  }

  function addVideos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_HOMEOWNER_VIDEOS - videos.length;
    if (room <= 0) {
      toast.error(`You can send up to ${MAX_HOMEOWNER_VIDEOS} videos.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const tooBig = picked.filter((file) => file.size > MAX_VIDEO_BYTES);
    if (tooBig.length) toast.error("Videos need to be under 50MB.");
    // Reference only, never the bytes. Real upload storage arrives with the backend.
    setVideos((prev) => [
      ...prev,
      ...picked
        .filter((file) => file.size <= MAX_VIDEO_BYTES)
        .map((file) => ({
          id: `vid_${Date.now()}_${Math.round(Math.random() * 1000)}`,
          name: file.name,
          size: file.size,
        })),
    ]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Honeypot tripped: a bot filled the hidden field. Drop it silently.
    if (website.trim()) return;
    const found: { description?: string; phone?: string; postcode?: string } = {};
    if (!description.trim()) found.description = "Tell us what has gone wrong.";
    if (!phone.trim()) found.phone = "We need a phone number to call you back.";
    if (!postcode.trim()) found.postcode = "We need a postcode to find you.";
    setErrors(found);

    if (found.description) {
      descriptionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      descriptionRef.current?.focus();
      return;
    }
    if (found.postcode) {
      postcodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      postcodeRef.current?.focus();
      return;
    }
    if (found.phone) {
      phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const enquiry = submitEnquiry(
        { addEnquiry, log },
        {
          orgSlug: account.slug,
          businessName: account.businessName,
          description,
          isEmergency: emergency === true,
          photos,
          postcode,
          address,
          contactName,
          phone,
          email,
          preferredTiming: timing,
          ...(area ? { area } : {}),
          ...(service ? { service } : {}),
          ...(videos.length ? { videos } : {}),
        },
      );
      onSent(enquiry.reference);
    } catch {
      setBusy(false);
      toast.error("That did not send. Please call us instead.");
    }
  }

  const fieldClass =
    "tap mt-1 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink";

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="report-description" className="text-lg font-bold text-ink">
            What has gone wrong
          </label>
          {dictation.supported ? (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-pressed={dictation.listening}
              className={cn(
                "tap flex items-center gap-2 rounded-xl px-4 text-base font-semibold",
                dictation.listening ? "bg-amber text-ink" : "border border-line bg-paper text-ink",
              )}
            >
              <Mic className="size-5" aria-hidden />
              {dictation.listening ? "Stop" : "Speak"}
            </button>
          ) : null}
        </div>
        <textarea
          id="report-description"
          ref={descriptionRef}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Water is coming through the kitchen ceiling and the bathroom floor is wet."
          className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-base text-ink"
        />
        {errors.description ? (
          <p className="mt-2 text-base font-semibold text-emergency">{errors.description}</p>
        ) : null}
      </div>

      <div>
        <p className="text-lg font-bold text-ink">Is this an emergency</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseEmergency(true)}
            className={cn(
              "min-h-14 rounded-xl border-2 px-4 text-base font-bold",
              emergency === true
                ? "border-emergency bg-emergency text-white"
                : "border-line bg-paper text-ink",
            )}
          >
            This is an emergency
          </button>
          <button
            type="button"
            onClick={() => chooseEmergency(false)}
            className={cn(
              "min-h-14 rounded-xl border-2 px-4 text-base font-bold",
              emergency === false
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper text-ink",
            )}
          >
            It can wait
          </button>
        </div>
        {emergency === true ? (
          <div className="mt-3 rounded-xl border border-emergency bg-paper p-3">
            <p className="text-base text-ink">Calling is faster than the form.</p>
            <a
              href={telHref(account.phone)}
              className="tap mt-2 flex items-center justify-center gap-2 rounded-xl bg-emergency text-lg font-bold text-white"
            >
              <Phone className="size-5" aria-hidden /> Call {account.phone}
            </a>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-lg font-bold text-ink">Photos, if you can</p>
        <p className="text-base text-slate">
          Up to {MAX_HOMEOWNER_PHOTOS}. It helps us bring the right parts.
        </p>
        <label className="tap mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-paper text-base font-semibold text-ink">
          <Camera className="size-5" aria-hidden /> Add a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(event) => {
              void addPhotos(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {photos.length ? (
          <ul className="mt-3 flex flex-wrap gap-3">
            {photos.map((photo) => (
              <li key={photo.id} className="relative">
                <img
                  src={photo.dataUrl}
                  alt="Photo of the problem"
                  className="size-24 rounded-xl border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((row) => row.id !== photo.id))}
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 flex size-12 items-center justify-center rounded-full bg-ink text-paper"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <p className="text-lg font-bold text-ink">Video, if you have one</p>
        <p className="text-base text-slate">
          Up to {MAX_HOMEOWNER_VIDEOS}, 50MB each. A short clip of the drain running tells us more
          than a photo.
        </p>
        <label className="tap mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-paper text-base font-semibold text-ink">
          <Video className="size-5" aria-hidden /> Add a video
          <input
            type="file"
            accept="video/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              addVideos(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {videos.length ? (
          <ul className="mt-3 space-y-2">
            {videos.map((video) => (
              <li
                key={video.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2"
              >
                <span className="truncate text-base text-ink">{video.name}</span>
                <button
                  type="button"
                  onClick={() => setVideos((prev) => prev.filter((row) => row.id !== video.id))}
                  aria-label={`Remove ${video.name}`}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="report-area" className="text-lg font-bold text-ink">
            Area
          </label>
          <select
            id="report-area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className={fieldClass}
          >
            <option value="">Choose your area</option>
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="report-service" className="text-lg font-bold text-ink">
            Service needed
          </label>
          <select
            id="report-service"
            value={service}
            onChange={(event) => setService(event.target.value)}
            className={fieldClass}
          >
            <option value="">Choose a service</option>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="report-postcode" className="text-lg font-bold text-ink">
            Postcode
          </label>
          <input
            id="report-postcode"
            ref={postcodeRef}
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            autoComplete="postal-code"
            className={cn(fieldClass, "uppercase")}
          />
          {errors.postcode ? (
            <p className="mt-2 text-base font-semibold text-emergency">{errors.postcode}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="report-address" className="text-lg font-bold text-ink">
            Address
          </label>
          <input
            id="report-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            autoComplete="street-address"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="report-name" className="text-lg font-bold text-ink">
          Your name
        </label>
        <input
          id="report-name"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="report-phone" className="text-lg font-bold text-ink">
          Phone number
        </label>
        <input
          id="report-phone"
          ref={phoneRef}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className={fieldClass}
        />
        {errors.phone ? (
          <p className="mt-2 text-base font-semibold text-emergency">{errors.phone}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="report-email" className="text-lg font-bold text-ink">
          Email, optional
        </label>
        <input
          id="report-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          className={fieldClass}
        />
      </div>

      <div>
        <p className="text-lg font-bold text-ink">When suits you</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIMINGS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTiming(option)}
              className={cn(
                "min-h-12 rounded-full border px-5 text-base font-semibold",
                timing === option
                  ? "border-amber bg-amber text-ink"
                  : "border-line bg-paper text-ink",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div aria-hidden className="hidden">
        <label htmlFor="report-website">Website (leave blank)</label>
        <input
          id="report-website"
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="tap w-full rounded-xl bg-amber text-lg font-bold text-ink disabled:opacity-70"
      >
        Send to {account.businessName}
      </button>
    </form>
  );
}
