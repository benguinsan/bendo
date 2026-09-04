import { cn } from "@/lib/utils";

type StatusDonutProps = {
  percent: number;
  label: string;
  strokeClassName: string;
  dotClassName: string;
};

export function StatusDonut({
  percent,
  label,
  strokeClassName,
  dotClassName,
}: StatusDonutProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-[100px]">
        <svg viewBox="0 0 100 100" className="size-[100px] -rotate-90">
          <title>{`${label} ${percent}%`}</title>
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-border fill-none"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={cn("fill-none", strokeClassName)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <p className="text-foreground absolute inset-0 flex items-center justify-center text-lg font-medium">
          {percent}%
        </p>
      </div>
      <div className="text-foreground flex items-center gap-2 text-sm">
        <span className={cn("size-2 rounded-full", dotClassName)} />
        <span>{label}</span>
      </div>
    </div>
  );
}
