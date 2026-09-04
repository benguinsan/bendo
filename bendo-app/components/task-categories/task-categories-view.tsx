"use client";

import Link from "next/link";
import { useState } from "react";

import { EditCategoryDialog } from "@/components/task-categories/edit-category-dialog";
import { TaxonomyLabelDialog } from "@/components/task-categories/edit-taxonomy-dialog";
import { TaxonomyTable } from "@/components/task-categories/taxonomy-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { deleteCategoryViaApi } from "@/lib/task-categories/category-api-client";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";
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

type TaskCategoriesViewProps = {
  initialCategories: PersistedCategory[];
};

type TaxonomySectionProps = {
  headingId: string;
  titleRest: string;
  addLabel: string;
  nameColumn: string;
  rows: readonly { id: string; label: string }[];
  emptyTitle: string;
  emptyDescription: string;
  onEdit: (row: { id: string; label: string }) => void;
  onDelete?: (row: { id: string; label: string }) => void;
  onAdd?: () => void;
  hideTaskPrefix?: boolean;
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

function toCategoryRows(categories: PersistedCategory[]) {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
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
  onDelete,
  onAdd,
  hideTaskPrefix = false,
}: TaxonomySectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2
          id={headingId}
          className="text-foreground font-sans text-[15px] font-medium"
        >
          {hideTaskPrefix ? (
            <span className="border-primary border-b-2 pb-0.5">
              {titleRest}
            </span>
          ) : (
            <>
              <span className="border-primary border-b-2 pb-0.5">Task</span>{" "}
              {titleRest}
            </>
          )}
        </h2>
        {onAdd ? (
          <Button type="button" variant="link" onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null}
      </div>
      <TaxonomyTable
        labelledBy={headingId}
        nameColumn={nameColumn}
        rows={rows}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </section>
  );
}

export function TaskCategoriesView({
  initialCategories,
}: TaskCategoriesViewProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [statusRows, setStatusRows] = useState(cloneStatusRows);
  const [priorityRows, setPriorityRows] = useState(clonePriorityRows);
  const [taxonomyDialog, setTaxonomyDialog] =
    useState<TaxonomyDialogState | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const categoryRows = toCategoryRows(categories);
  const editingCategory =
    categories.find((category) => category.id === editingCategoryId) ?? null;
  const taxonomyKind: TaxonomyKind = taxonomyDialog?.kind ?? "status";
  const taxonomyMode = taxonomyDialog?.mode ?? "edit";
  const taxonomyExistingLabels =
    taxonomyKind === "status"
      ? statusRows.map((row) => row.label)
      : priorityRows.map((row) => row.label);

  function handleTaxonomyOpenChange(open: boolean) {
    if (!open) {
      setTaxonomyDialog(null);
    }
  }

  function handleTaxonomySubmitLabel(name: string) {
    if (!taxonomyDialog) {
      return;
    }

    if (taxonomyDialog.mode === "create") {
      setPriorityRows((rows) => [
        ...rows,
        { id: createPriorityRowId(), label: name },
      ]);
      return;
    }

    if (taxonomyDialog.kind === "status") {
      setStatusRows((rows) =>
        rows.map((row) =>
          row.id === taxonomyDialog.row.id ? { ...row, label: name } : row
        )
      );
      return;
    }

    setPriorityRows((rows) =>
      rows.map((row) =>
        row.id === taxonomyDialog.row.id ? { ...row, label: name } : row
      )
    );
  }

  async function handleDeleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);
    setDeleteError(null);

    try {
      const result = await deleteCategoryViaApi(categoryId);

      if (!result.ok) {
        setDeleteError(result.error);
        setDeletingCategoryId(null);
        return;
      }

      setCategories((current) =>
        current.filter((category) => category.id !== categoryId)
      );
    } catch {
      setDeleteError("Could not delete category.");
    }

    setDeletingCategoryId(null);
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
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
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
            headingId="user-categories-heading"
            titleRest="Categories"
            hideTaskPrefix
            addLabel=""
            nameColumn="Category Name"
            rows={categoryRows}
            emptyTitle="No categories yet"
            emptyDescription="Categories you create will show up here."
            onEdit={(row) => setEditingCategoryId(row.id)}
            onDelete={(row) => {
              if (deletingCategoryId === null) {
                void handleDeleteCategory(row.id);
              }
            }}
          />
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
                setTaxonomyDialog({
                  mode: "edit",
                  kind: "status",
                  row: statusRow,
                });
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
              setTaxonomyDialog({ mode: "create", kind: "priority" });
            }}
            onEdit={(row) => {
              const priorityRow = priorityRows.find(
                (item) => item.id === row.id
              );
              if (priorityRow) {
                setTaxonomyDialog({
                  mode: "edit",
                  kind: "priority",
                  row: priorityRow,
                });
              }
            }}
          />
        </CardContent>
      </Card>
      <EditCategoryDialog
        category={editingCategory}
        existingNames={categories.map((category) => category.name)}
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategoryId(null);
          }
        }}
        onUpdate={(updated) => {
          setCategories((current) =>
            current
              .map((category) =>
                category.id === updated.id ? updated : category
              )
              .toSorted((left, right) => left.name.localeCompare(right.name))
          );
        }}
      />
      <TaxonomyLabelDialog
        open={taxonomyDialog !== null}
        mode={taxonomyMode}
        kind={taxonomyKind}
        row={taxonomyDialog?.mode === "edit" ? taxonomyDialog.row : null}
        existingLabels={taxonomyExistingLabels}
        onOpenChange={handleTaxonomyOpenChange}
        onSubmitLabel={handleTaxonomySubmitLabel}
      />
    </div>
  );
}
