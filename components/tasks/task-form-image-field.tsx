"use client";

import { ImageUpIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { validateTaskImage } from "@/lib/tasks/task-input";
import { cn } from "@/lib/utils";

type TaskFormImageFieldProps = {
  previewUrl: string | null;
  error?: string;
  onPreviewChange: (previewUrl: string | null) => void;
  onError: (message?: string) => void;
};

export function TaskFormImageField({
  previewUrl,
  error,
  onPreviewChange,
  onError,
}: TaskFormImageFieldProps) {
  const imageId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionPreviewRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(
    () => () => {
      if (sessionPreviewRef.current) {
        URL.revokeObjectURL(sessionPreviewRef.current);
      }
    },
    []
  );

  function applyImageFile(file: File) {
    const imageError = validateTaskImage(file);
    if (imageError) {
      onError(imageError);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    if (sessionPreviewRef.current) {
      URL.revokeObjectURL(sessionPreviewRef.current);
    }
    sessionPreviewRef.current = nextUrl;
    onPreviewChange(nextUrl);
    onError();
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={imageId}>Upload Image</FieldLabel>
      <div
        className={cn(
          "border-input flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border px-3 py-4 md:min-h-48",
          isDragging && "border-primary"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const [file] = event.dataTransfer.files;
          if (file) {
            applyImageFile(file);
          }
        }}
      >
        {previewUrl ? (
          /* oxlint-disable-next-line next/no-img-element */
          <img
            src={previewUrl}
            alt="Selected task preview"
            className="max-h-28 w-full object-cover"
          />
        ) : (
          <>
            <ImageUpIcon className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-center text-xs">
              Drag&Drop files here
            </p>
          </>
        )}
        <p className="text-muted-foreground text-xs">or</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse
        </Button>
        <input
          id={imageId}
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const [file] = event.target.files ?? [];
            if (file) {
              applyImageFile(file);
            }
          }}
        />
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
