type StubPageProps = {
  title: string;
};

export function StubPage({ title }: StubPageProps) {
  return (
    <div className="flex flex-col gap-2 px-6 py-8 lg:px-8">
      <h1 className="text-foreground text-[32px] font-medium sm:text-[36px]">
        {title}
      </h1>
    </div>
  );
}
