import { cn } from "@/lib/utils";

type TaskCategoryTextProps = {
  name: string;
  className?: string;
};

/** Read-only "Category: {name}" line — Server Component only. */
export function TaskCategoryText({ name, className }: TaskCategoryTextProps) {
  return (
    <p className={cn(className)}>
      Category: <span className="text-foreground">{name}</span>
    </p>
  );
}
