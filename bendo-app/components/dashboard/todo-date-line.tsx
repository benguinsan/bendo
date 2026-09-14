import { formatTodoDateLine } from "@/lib/dashboard/dates";

type TodoDateLineProps = {
  date: Date;
};

export function TodoDateLine({ date }: TodoDateLineProps) {
  return (
    <p className="text-muted-foreground text-sm">{formatTodoDateLine(date)}</p>
  );
}
