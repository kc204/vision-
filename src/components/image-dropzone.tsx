"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

export type VisionSeedImage = {
  id: string;
  name: string;
  dataUrl: string;
};

type ImageDropzoneProps = {
  images: VisionSeedImage[];
  onImagesChange: (images: VisionSeedImage[]) => void;
  title?: string;
  description?: string;
  maxImages?: number;
};

export function ImageDropzone({
  images,
  onImagesChange,
  title = "Vision Seed images",
  description = "Drop reference frames or upload stills for context.",
  maxImages = 6,
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      const availableSlots = Math.max(maxImages - images.length, 0);
      if (availableSlots === 0) {
        return;
      }

      const files = Array.from(fileList).slice(0, availableSlots);
      const payload = await Promise.all(
        files.map(async (file, index) => ({
          id: buildImageId(file, index),
          name: file.name,
          dataUrl: await readFileAsDataURL(file),
        }))
      );

      const nextImages = [...images, ...payload].slice(0, maxImages);
      onImagesChange(nextImages);
    },
    [images, maxImages, onImagesChange]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      await handleFiles(event.dataTransfer?.files ?? null);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    (id: string) => {
      onImagesChange(images.filter((image) => image.id !== id));
    },
    [images, onImagesChange]
  );

  const canAddMore = useMemo(() => images.length < maxImages, [images.length, maxImages]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/60 p-4 text-center transition ${
          isDragging ? "border-canvas-accent bg-canvas-accent/10" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <button
          type="button"
          onClick={openFileDialog}
          className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100 hover:border-white/30"
        >
          Upload images
        </button>
        <p className="text-xs text-slate-400">
          Drag and drop files here or click to browse.
        </p>
        <p className="text-[11px] text-slate-500">
          {images.length} / {maxImages} uploaded
        </p>
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <li key={image.id} className="group relative overflow-hidden rounded-xl border border-white/10">
              <img
                src={image.dataUrl}
                alt={image.name}
                className="h-32 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!canAddMore ? (
        <p className="text-[11px] text-slate-400">Maximum of {maxImages} references.</p>
      ) : null}
    </div>
  );
}

function buildImageId(file: File, index: number) {
  return [file.name, file.lastModified, index, Date.now(), Math.random().toString(36).slice(2)].join("-");
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
