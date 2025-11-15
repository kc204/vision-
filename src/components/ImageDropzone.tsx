"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

interface ImageDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  description?: string;
  maxFiles?: number;
  className?: string;
}

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function ImageDropzone({
  files,
  onFilesChange,
  label = "Reference images",
  description = "Drag in PNG, JPG, or WEBP inspiration frames to ground the Vision Seed.",
  maxFiles,
  className,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => {
    return files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function handleFiles(selectedFiles: FileList | File[]) {
    const asArray = Array.from(selectedFiles);
    const accepted = asArray.filter(isAcceptedFile);

    if (accepted.length === 0) {
      setError("Only PNG, JPG, or WEBP images are supported.");
      return;
    }

    setError(null);
    const unique = mergeUniqueFiles(files, accepted);
    const limited = typeof maxFiles === "number" ? unique.slice(0, maxFiles) : unique;
    onFilesChange(limited);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { files: fileList } = event.target;
    if (!fileList) return;
    handleFiles(fileList);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (event.dataTransfer?.files) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function removeFile(index: number) {
    const next = files.filter((_, fileIndex) => fileIndex !== index);
    onFilesChange(next);
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {typeof maxFiles === "number" ? (
          <span className="text-xs text-slate-400">{files.length} / {maxFiles}</span>
        ) : null}
      </div>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? "border-canvas-accent bg-canvas-accent/10"
            : "border-white/10 bg-slate-950/40 hover:border-white/20"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
            className="inline-flex items-center rounded-lg bg-canvas-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            Upload images
          </button>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {previews.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previews.map((preview, index) => (
            <li
              key={`${preview.file.name}-${index}`}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/60"
            >
              <img
                src={preview.url}
                alt={preview.file.name}
                className="h-32 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-200">
                <span className="truncate" title={preview.file.name}>
                  {preview.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function isAcceptedFile(file: File) {
  if (ACCEPTED_TYPES.has(file.type)) {
    return true;
  }

  const lowerCaseName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));
}

function mergeUniqueFiles(existing: File[], incoming: File[]) {
  const combined: File[] = [...existing];

  incoming.forEach((file) => {
    const duplicate = combined.some(
      (existingFile) =>
        existingFile.name === file.name && existingFile.size === file.size && existingFile.type === file.type
    );

    if (!duplicate) {
      combined.push(file);
    }
  });

  return combined;
}
