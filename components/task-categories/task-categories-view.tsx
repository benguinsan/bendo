"use client";

import Link from "next/link";
import { useState } from "react";

import { EditTaxonomyDialog } from "@/components/task-categories/edit-taxonomy-dialog";
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
  type PriorityTaxonomyRow,
  type StatusTaxonomyRow,
} from "@/lib/task-categories/taxonomy";
import type { TaxonomyKind } from "@/lib/task-categories/taxonomy-input";

type TaxonomyEditTarget =
  | { kind: "status"; row: StatusTaxonomyRow }
  | { kind: "priority"; row: PriorityTaxonomyRow };

type TaxonomySectionProps = {
  headingId: string;
  titleRest: string;
  addLabel: string;
  nameColumn: string;
  rows: readonly StatusTaxonomyRow[] | readonly PriorityTaxonomyRow[];
  emptyTitle: string;
  emptyDescription: string;
  onEdit: (row: { id: string; label: string }) => void;
};

function cloneStatusRows(): StatusTaxonomyRow[] {
  return statusTaxonomyRows.map((row) => ({ ...row }));
}

function clonePriorityRows(): PriorityTaxonomyRow[] {
  return priorityTaxonomyRows.map((row) => ({ ...row }));
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
        <Button type="button" variant="link">
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
  const [target, setTarget] = useState<TaxonomyEditTarget | null>(null);

  const kind: TaxonomyKind = target?.kind ?? "status";
  const existingLabels =
    kind === "status"
      ? statusRows.map((row) => row.label)
      : priorityRows.map((row) => row.label);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setTarget(null);
    }
  }

  function handleUpdate(name: string) {
    if (!target) {
      return;
    }

    if (target.kind === "status") {
      setStatusRows((rows) =>
        rows.map((row) =>
          row.id === target.row.id ? { ...row, label: name } : row
        )
      );
      return;
    }

    setPriorityRows((rows) =>
      rows.map((row) =>
        row.id === target.row.id ? { ...row, label: name } : row
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
                setTarget({ kind: "status", row: statusRow });
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
            onEdit={(row) => {
              const priorityRow = priorityRows.find(
                (item) => item.id === row.id
              );
              if (priorityRow) {
                setTarget({ kind: "priority", row: priorityRow });
              }
            }}
          />
        </CardContent>
      </Card>
      <EditTaxonomyDialog
        open={target !== null}
        kind={kind}
        row={target?.row ?? null}
        existingLabels={existingLabels}
        onOpenChange={handleOpenChange}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
