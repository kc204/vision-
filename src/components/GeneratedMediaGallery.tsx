import type { ReactNode } from "react";

import type { DirectorMediaAsset } from "@/lib/directorTypes";

type GeneratedMediaGalleryProps = {
  assets: DirectorMediaAsset[] | null | undefined;
  title?: string;
  className?: string;
};

export function GeneratedMediaGallery({
  assets,
  title = "Generated media",
  className,
}: GeneratedMediaGalleryProps) {
  const media = (assets ?? []).filter(Boolean);

  if (!media.length) {
    return null;
  }

  return (
    <section
      className={`space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {title}
        </h2>
        <span className="text-xs text-slate-400">{media.length} asset{media.length === 1 ? "" : "s"}</span>
      </header>
      <div className="grid gap-4">
        {media.map((asset, index) => (
          <figure
            key={asset.id ?? index}
            className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4"
          >
            <MediaPreview asset={asset} />
            {renderCaption(asset)}
          </figure>
        ))}
      </div>
    </section>
  );
}

function MediaPreview({ asset }: { asset: DirectorMediaAsset }) {
  const kind = inferKind(asset);
  const primarySrc = pickSource(asset.url, asset.base64, asset.mimeType);
  const poster =
    pickSource(asset.posterUrl, asset.posterBase64, undefined) ??
    pickSource(asset.thumbnailUrl, asset.thumbnailBase64, undefined);

  if (kind === "video" && primarySrc) {
    return (
      <div className="space-y-3">
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          className="w-full overflow-hidden rounded-xl border border-white/10 bg-black"
        >
          <source src={primarySrc} type={asset.mimeType ?? undefined} />
          Your browser does not support the provided video tag.
        </video>
        {renderFrames(asset.frames)}
      </div>
    );
  }

  if (primarySrc) {
    return (
      <div className="space-y-3">
        <img
          src={primarySrc}
          alt={asset.caption ?? asset.description ?? "Generated visual"}
          loading="lazy"
          className="h-auto w-full rounded-xl border border-white/10 bg-slate-900 object-cover"
        />
        {renderFrames(asset.frames)}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-slate-900/60 p-4 text-sm text-slate-300">
      Unable to display this asset type.
      {renderFrames(asset.frames)}
    </div>
  );
}

function renderFrames(frames: DirectorMediaAsset["frames"] | undefined): ReactNode {
  if (!frames?.length) {
    return null;
  }

  const frameElements = frames
    .map((frame, index) => {
      const frameSrc = pickSource(frame?.url, frame?.base64, frame?.mimeType);
      if (!frameSrc) return null;

      return (
        <figure key={frame?.url ?? frame?.base64 ?? index} className="space-y-1">
          <img
            src={frameSrc}
            alt={frame?.caption ?? "Generated frame"}
            loading="lazy"
            className="h-auto w-full rounded-lg border border-white/10 bg-slate-900 object-cover"
          />
          {frame?.caption ? (
            <figcaption className="text-[11px] text-slate-400">
              {frame.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    })
    .filter(Boolean);

  if (!frameElements.length) {
    return null;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {frameElements}
    </div>
  );
}

function renderCaption(asset: DirectorMediaAsset): ReactNode {
  const caption = asset.caption ?? asset.description;

  if (!caption) {
    return null;
  }

  return (
    <figcaption className="text-xs leading-5 text-slate-300">
      {caption}
    </figcaption>
  );
}

function inferKind(asset: DirectorMediaAsset): "image" | "video" | "unknown" {
  if (asset.kind === "image" || asset.kind === "video") {
    return asset.kind;
  }

  const mimeType = asset.mimeType ?? asset.frames?.[0]?.mimeType ?? null;

  if (mimeType?.startsWith("image/")) {
    return "image";
  }

  if (mimeType?.startsWith("video/")) {
    return "video";
  }

  return "unknown";
}

function pickSource(
  url?: string | null,
  base64?: string | null,
  mimeType?: string | null
): string | undefined {
  if (url && typeof url === "string") {
    return url;
  }

  if (!base64) {
    return undefined;
  }

  const trimmed = base64.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  const safeMime = mimeType && mimeType.trim().length > 0 ? mimeType : guessMimeFromBase64(trimmed);
  return `data:${safeMime};base64,${trimmed}`;
}

function guessMimeFromBase64(data: string): string {
  if (data.startsWith("/9j/")) {
    return "image/jpeg";
  }

  if (data.startsWith("iVBOR")) {
    return "image/png";
  }

  if (data.startsWith("R0lGOD")) {
    return "image/gif";
  }

  return "application/octet-stream";
}
