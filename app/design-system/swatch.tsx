import { cn } from "@/lib/utils";

export type SwatchItem = {
  name: string;
  token: string;
  className: string;
  preview?: "fill" | "text";
  sampleClassName?: string;
};

export function Swatch({
  name,
  token,
  className,
  preview = "fill",
  sampleClassName,
}: SwatchItem) {
  return (
    <div className="flex items-center gap-4">
      {preview === "text" ? (
        <div
          className={cn(
            "bg-card flex size-16 shrink-0 items-center justify-center rounded-lg border",
            sampleClassName
          )}
        >
          <span className={cn("text-sm font-medium", className)}>Aa</span>
        </div>
      ) : (
        <div className={cn("size-16 shrink-0 rounded-lg border", className)} />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-foreground text-sm">{name}</p>
        <p className="text-muted-foreground truncate text-xs">{token}</p>
      </div>
    </div>
  );
}
