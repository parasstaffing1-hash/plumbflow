import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Job, Customer, Property } from "@/lib/domain";
import { STATUS_LABELS } from "@/lib/domain";
import { formatTime } from "@/lib/format";
import { MapPin, Navigation, ExternalLink, Calendar, User } from "lucide-react";

interface JobMapViewProps {
  jobs: Job[];
  getCustomer: (id: string) => Customer | undefined;
  getProperty: (id: string) => Property | undefined;
}

// UK Regional Coordinates for Town / Postcode mapping
const TOWN_COORDINATES: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  leeds: [53.8008, -1.5491],
  manchester: [53.4808, -2.2426],
  harrogate: [53.9921, -1.5418],
  york: [53.9599, -1.0873],
  birmingham: [52.4862, -1.8904],
  sheffield: [53.3811, -1.4701],
  bradford: [53.7959, -1.7594],
  ripon: [54.1378, -1.5235],
  knaresborough: [54.0084, -1.4682],
  wetherby: [53.9272, -1.3853],
  bristol: [51.4545, -2.5879],
  newcastle: [54.9783, -1.6178],
};

function getCoordinatesForJob(job: Job, place?: Property, index = 0): [number, number] {
  const town = place?.town?.toLowerCase().trim() || "";
  let baseCoords: [number, number] = [53.8008, -1.5491]; // Default to Yorkshire / North UK

  for (const [key, coords] of Object.entries(TOWN_COORDINATES)) {
    if (town.includes(key) || (place?.postcode && place.postcode.toLowerCase().startsWith(key.slice(0, 2)))) {
      baseCoords = coords;
      break;
    }
  }

  // Pseudo-deterministic jitter so multiple jobs in the same town don't perfectly overlap
  const hash = (job.id + (place?.postcode || "")).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + index * 17;
  const latOffset = ((hash % 100) - 50) * 0.0035;
  const lngOffset = (((hash * 3) % 100) - 50) * 0.005;

  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
}

export function JobMapView({ jobs, getCustomer, getProperty }: JobMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load leaflet on client only
    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        // Dynamically inject Leaflet CSS if not already present
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous instance if any
        if (mapInstanceRef.current) {
          (mapInstanceRef.current as { remove: () => void }).remove();
          mapInstanceRef.current = null;
        }

        // Determine center
        const defaultCenter: [number, number] = jobs.length > 0
          ? getCoordinatesForJob(jobs[0]!, getProperty(jobs[0]!.propertyId), 0)
          : [53.8008, -1.5491];

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
        }).setView(defaultCenter, 12);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        const bounds = L.latLngBounds([]);

        jobs.forEach((job, idx) => {
          const place = getProperty(job.propertyId);
          const coords = getCoordinatesForJob(job, place, idx);
          bounds.extend(coords);

          const isComplete = job.status === "complete";
          const isEmergency = job.isEmergency;
          const bgClass = isEmergency
            ? "#dc2626"
            : isComplete
              ? "#16a34a"
              : "#2563eb";

          const iconHtml = `
            <div style="
              background-color: ${bgClass};
              color: white;
              font-weight: 700;
              font-size: 11px;
              width: 34px;
              height: 34px;
              border-radius: 9999px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              border: 2.5px solid white;
              cursor: pointer;
            ">
              ${job.jobNumber.replace(/[^0-9]/g, "").slice(-3) || idx + 1}
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: "custom-job-pin",
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });

          const marker = L.marker(coords, { icon: customIcon }).addTo(map);

          marker.on("click", () => {
            setSelectedJob(job);
          });
        });

        if (jobs.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (err) {
        console.error("Leaflet load error:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as { remove: () => void }).remove();
        } catch {
          // Ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, jobs, getProperty]);

  const selectedCustomer = selectedJob ? getCustomer(selectedJob.customerId) : undefined;
  const selectedPlace = selectedJob ? getProperty(selectedJob.propertyId) : undefined;
  const selectedAddress = selectedPlace
    ? `${selectedPlace.line1}, ${selectedPlace.town}, ${selectedPlace.postcode}`
    : "";

  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div ref={mapContainerRef} className="size-full z-0" />

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-xl border border-line/60 bg-paper/90 px-3.5 py-2 backdrop-blur-md shadow-md text-xs font-semibold text-ink">
        <MapPin className="size-4 text-amber-deep" />
        <span>{jobs.length} Scheduled Job Locations</span>
      </div>

      {/* Selected Job Drawer Card */}
      {selectedJob && (
        <div className="absolute bottom-4 inset-x-4 sm:left-4 sm:right-auto sm:w-96 z-10 rounded-2xl border border-line bg-paper/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-surface px-2 py-0.5 font-mono text-xs font-bold text-slate border border-line">
                  {selectedJob.jobNumber}
                </span>
                <span className="text-xs font-semibold text-amber-deep">
                  {STATUS_LABELS[selectedJob.status] ?? selectedJob.status}
                </span>
              </div>
              <h3 className="mt-1 text-base font-bold text-ink line-clamp-1">{selectedJob.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedJob(null)}
              className="tap -mr-1 -mt-1 rounded-full p-1 text-fog hover:text-ink"
            >
              &times;
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5 text-xs text-slate">
            {selectedCustomer && (
              <p className="flex items-center gap-1.5">
                <User className="size-3.5 text-fog shrink-0" />
                <span className="font-semibold text-ink">{selectedCustomer.name}</span>
                {selectedCustomer.phone && ` · ${selectedCustomer.phone}`}
              </p>
            )}
            <p className="flex items-start gap-1.5">
              <MapPin className="size-3.5 text-fog shrink-0 mt-0.5" />
              <span className="line-clamp-1">{selectedAddress || "No address on file"}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-fog shrink-0" />
              <span>{formatTime(selectedJob.scheduledStart)} · {selectedJob.durationMinutes} mins</span>
            </p>
          </div>

          <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-line">
            <Link
              to="/app/jobs/$jobId"
              params={{ jobId: selectedJob.id }}
              className="tap flex-1 flex items-center justify-center gap-1 rounded-xl bg-ink py-2 text-xs font-semibold text-paper hover:bg-slate"
            >
              Open Job Card
              <ExternalLink className="size-3" />
            </Link>
            {selectedAddress && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="tap flex items-center justify-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-paper"
              >
                <Navigation className="size-3.5 text-amber-deep" />
                Directions
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
