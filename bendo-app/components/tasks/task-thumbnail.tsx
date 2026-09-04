import Image from "next/image";

import { isObjectThumbnailSrc } from "@/lib/tasks/task-input";
import { cn } from "@/lib/utils";

type TaskThumbnailProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

export function TaskThumbnail({
  src,
  alt,
  sizes,
  className,
}: TaskThumbnailProps) {
  if (isObjectThumbnailSrc(src)) {
    return (
      // Blob/data URLs are client previews; next/image does not accept them.
      // oxlint-disable-next-line next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
