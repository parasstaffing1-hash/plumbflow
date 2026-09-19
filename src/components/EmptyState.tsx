import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ImageSlot } from "@/lib/image-slots";

export function EmptyState({
  icon: Icon,
  image,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  /** Optional illustration slot; replaces the icon badge when provided. */
  image?: ImageSlot;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper px-6 py-10 text-center">
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="h-36 w-36 rounded-2xl object-contain"
        />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-wash text-amber-deep">
          <Icon className="size-7" aria-hidden />
        </span>
      )}
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-xs text-base text-slate">{description}</p>
      {action ? <div className="mt-5 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
