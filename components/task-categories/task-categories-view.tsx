"use client";

import Link from "next/link";
import { useState } from "react";

import { TaxonomyLabelDialog } from "@/components/task-categories/edit-taxonomy-dialog";
import { TaxonomyTable } from "@/components/task-categories/taxonomy-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  priorityTaxonomyRows,
  statusTaxonomyRows,
  type StatusTaxonomyRow,
} from "@/lib/task-categories/taxonomy";
import type { TaxonomyKind } from "@/lib/task-categories/taxonomy-input";

type PriorityTableRow = {
  id: string;
  label: string;
};

type TaxonomyDialogState =
  | { mode: "edit"; kind: "status"; row: StatusTaxonomyRow }
  | { mode: "edit"; kind: "priority"; row: PriorityTableRow }
  | { mode: "create"; kind: "priority" };

type TaxonomySectionProps = {
  headingId: string;
  titleRest: string;
  addLabel: string;
  nameColumn: string;
  rows: readonly { id: string; label: string }[];
  emptyTitle: string;
  emptyDescription: string;
  onEdit: (row: { id: string; label: string }) => void;
  onAdd?: () => void;
};

function cloneStatusRows(): StatusTaxonomyRow[] {
  return statusTaxonomyRows.map((row) => ({ ...row }));
}

function clonePriorityRows(): PriorityTableRow[] {
  return priorityTaxonomyRows.map((row) => ({ ...row }));
}

function createPriorityRowId(): string {
  return `priority-${crypto.randomUUID()}`;
}

function TaxonomySection({
  headingId,
  titleRest,
  addLabel,
  nameColumn,
  rows,
  emptyTitle,
  emptyDescription,
  onEdit,
  onAdd,
}: TaxonomySectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2
          id={headingId}
          className="text-foreground font-sans text-[15px] font-medium"
        >
          <span className="border-primary border-b-2 pb-0.5">Task</span>{" "}
          {titleRest}
        </h2>
        <Button type="button" variant="link" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>
      <TaxonomyTable
        labelledBy={headingId}
        nameColumn={nameColumn}
        rows={rows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onEdit={onEdit}
      />
    </section>
  );
}

export function TaskCategoriesView() {
  const [statusRows, setStatusRows] = useState(cloneStatusRows);
  const [priorityRows, setPriorityRows] = useState(clonePriorityRows);
  const [dialog, setDialog] = useState<TaxonomyDialogState | null>(null);

  const kind: TaxonomyKind = dialog?.kind ?? "status";
  const mode = dialog?.mode ?? "edit";
  const existingLabels =
    kind === "status"
      ? statusRows.map((row) => row.label)
      : priorityRows.map((row) => row.label);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setDialog(null);
    }
  }

  function handleSubmitLabel(name: string) {
    if (!dialog) {
      return;
    }

    if (dialog.mode === "create") {
      setPriorityRows((rows) => [
        ...rows,
        { id: createPriorityRowId(), label: name },
      ]);
      return;
    }

    if (dialog.kind === "status") {
      setStatusRows((rows) =>
        rows.map((row) =>
          row.id === dialog.row.id ? { ...row, label: name } : row
        )
      );
      return;
    }

    setPriorityRows((rows) =>
      rows.map((row) =>
        row.id === dialog.row.id ? { ...row, label: name } : row
      )
    );
  }

  return (
    <div className="flex min-h-0 flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8 lg:py-8">
      <Card className="rounded-card shadow-panel flex min-h-0 flex-1 flex-col py-6 [--card-spacing:--spacing(6)] lg:h-full">
        <CardHeader>
          <h1 className="text-foreground font-sans text-[15px] font-medium">
            <span className="border-primary border-b-2 pb-0.5">Task</span>{" "}
            Categories
          </h1>
          <CardAction>
            <Link
              href="/"
              className="text-foreground text-sm underline underline-offset-2"
            >
              Go Back
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
          <div>
            <Button
              nativeButton={false}
              render={<Link href="/task-categories/create" />}
              size="lg"
            >
              Add Category
            </Button>
          </div>
          <TaxonomySection
            headingId="task-status-heading"
            titleRest="Status"
            addLabel="+ Add Task Status"
            nameColumn="Task Status"
            rows={statusRows}
            emptyTitle="No task statuses yet"
            emptyDescription="Statuses you add will show up here."
            onEdit={(row) => {
              const statusRow = statusRows.find((item) => item.id === row.id);
              if (statusRow) {
                setDialog({ mode: "edit", kind: "status", row: statusRow });
              }
            }}
          />
          <TaxonomySection
            headingId="task-priority-heading"
            titleRest="Priority"
            addLabel="+ Add New Priority"
            nameColumn="Task Priority"
            rows={priorityRows}
            emptyTitle="No task priorities yet"
            emptyDescription="Priorities you add will show up here."
            onAdd={() => {
              setDialog({ mode: "create", kind: "priority" });
            }}
            onEdit={(row) => {
              const priorityRow = priorityRows.find(
                (item) => item.id === row.id
              );
              if (priorityRow) {
                setDialog({
                  mode: "edit",
                  kind: "priority",
                  row: priorityRow,
                });
              }
            }}
          />
        </CardContent>
      </Card>
      <TaxonomyLabelDialog
        open={dialog !== null}
        mode={mode}
        kind={kind}
        row={dialog?.mode === "edit" ? dialog.row : null}
        existingLabels={existingLabels}
        onOpenChange={handleOpenChange}
        onSubmitLabel={handleSubmitLabel}
      />
    </div>
  );
}
