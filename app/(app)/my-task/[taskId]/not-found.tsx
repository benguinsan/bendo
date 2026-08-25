import { ListTodoIcon } from "lucide-react";
import Link from "next/link";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ViewTaskNotFound() {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodoIcon />
          </EmptyMedia>
          <EmptyTitle>Task not found</EmptyTitle>
          <EmptyDescription>
            This task does not exist or is no longer available.{" "}
            <Link href="/my-task">Go Back</Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
