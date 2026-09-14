import { PageFrame } from "@/components/app-shell/page-frame";
import { PageHeading } from "@/components/app-shell/page-heading";

type StubPageProps = {
  title: string;
};

export function StubPage({ title }: StubPageProps) {
  return (
    <PageFrame className="gap-2 px-6 py-8">
      <PageHeading className="text-[32px] sm:text-[36px]">{title}</PageHeading>
    </PageFrame>
  );
}
