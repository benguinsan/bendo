"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateCategoryViaApi } from "@/lib/task-categories/category-api-client";
import { validateUpdatedCategory } from "@/lib/task-categories/category-input";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";

type EditCategoryDialogProps = {
  category: PersistedCategory | null;
  existingNames: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (category: PersistedCategory) => void;
};

type EditCategoryFormProps = {
  category: PersistedCategory;
  existingNames: readonly string[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (category: PersistedCategory) => void;
};

function EditCategoryForm({
  category,
  existingNames,
  onOpenChange,
  onUpdate,
}: EditCategoryFormProps) {
  const nameId = useId();
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateUpdatedCategory({
      name,
      existingNames,
      currentName: category.name,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    setIsSubmitting(true);
    const updated = await updateCategoryViaApi({
      categoryId: category.id,
      name: result.data.name,
    });
    setIsSubmitting(false);

    if (!updated.ok) {
      setError(updated.error);
      return;
    }

    onUpdate(updated.category);
    onOpenChange(false);
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="bg-card rounded-card flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-6 overflow-y-auto p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <DialogTitle className="font-sans text-base font-medium">
            <span className="border-primary border-b-2 pb-0.5">Edit</span>{" "}
            Category
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit this category name.
          </DialogDescription>
        </div>
        <DialogClose
          render={<Button type="button" variant="link" className="underline" />}
        >
          Go Back
        </DialogClose>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="border-border flex flex-col gap-6 rounded-lg border p-4 sm:p-6">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={nameId}>Category Name</FieldLabel>
              <Input
                id={nameId}
                name="name"
                value={name}
                aria-invalid={Boolean(error)}
                className="h-10"
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) {
                    setError(undefined);
                  }
                }}
              />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              className="min-w-24 px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating…" : "Update"}
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-w-24 px-8"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

export function EditCategoryDialog({
  category,
  existingNames,
  open,
  onOpenChange,
  onUpdate,
}: EditCategoryDialogProps) {
  return (
    <Dialog open={open && category !== null} onOpenChange={onOpenChange}>
      {open && category ? (
        <EditCategoryForm
          category={category}
          existingNames={existingNames}
          onOpenChange={onOpenChange}
          onUpdate={onUpdate}
        />
      ) : null}
    </Dialog>
  );
}
