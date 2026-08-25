import Link from "next/link";

import { CreateCategoryForm } from "@/components/task-categories/create-category-form";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function CreateCategoryView() {
  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <Card className="rounded-card shadow-panel flex min-h-0 flex-1 flex-col py-6 [--card-spacing:--spacing(6)] lg:h-full">
        <CardHeader>
          <h1 className="text-foreground font-sans text-[15px] font-medium">
            <span className="border-primary border-b-2 pb-0.5">Create</span>{" "}
            Categories
          </h1>
          <CardAction>
            <Link
              href="/task-categories"
              className="text-foreground text-sm underline underline-offset-2"
            >
              Go Back
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <CreateCategoryForm />
        </CardContent>
      </Card>
    </div>
  );
}
