type PanelTitleProps = {
  accent: string;
  rest: string;
};

/** Card/panel title with primary underline on the accent word. */
export function PanelTitle({ accent, rest }: PanelTitleProps) {
  return (
    <h1 className="text-foreground font-sans text-[15px] font-medium">
      <span className="border-primary border-b-2 pb-0.5">{accent}</span> {rest}
    </h1>
  );
}
