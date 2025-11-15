"use client";

import { ChangeEvent, DragEvent, useId, useState } from "react";

interface ImageDropzoneProps {
  label?: string;
  description?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
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

export function ImageDropzone({
  label = "Reference image",
  description = "Optional: drop or upload an inspiration frame to guide the look.",
  value,
  onChange,
}: ImageDropzoneProps) {
  const inputId = useId();
  const [isDragActive, setIsDragActive] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      console.error("Unable to process selected file", error);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFiles(event.target.files);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isDragActive) {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const files = event.dataTransfer?.files;
    void handleFiles(files ?? null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-rose-300 hover:text-rose-200"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">{description}</p>
      <label
        htmlFor={inputId}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-4 text-center transition ${
          isDragActive ? "border-canvas-accent bg-slate-900/60" : "hover:border-canvas-accent"
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        {value ? (
          <img
            src={value}
            alt="Uploaded reference"
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">
            Drag & drop an image, or click to browse.
          </span>
        )}
      </label>
    </div>
  );
}
