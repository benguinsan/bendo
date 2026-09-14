type HeaderDateProps = {
  weekday: string;
  numericDate: string;
};

export function HeaderDate({ weekday, numericDate }: HeaderDateProps) {
  return (
    <div className="hidden text-right sm:block">
      <p className="text-foreground text-[15px] font-medium">{weekday}</p>
      <p className="text-date-accent text-sm font-medium">{numericDate}</p>
    </div>
  );
}
