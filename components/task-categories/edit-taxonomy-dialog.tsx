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
import {
  validateTaxonomyLabel,
  type TaxonomyKind,
} from "@/lib/task-categories/taxonomy-input";

type TaxonomyRow = {
  id: string;
  label: string;
};

type EditTaxonomyDialogProps = {
  open: boolean;
  kind: TaxonomyKind;
  row: TaxonomyRow | null;
  existingLabels: readonly string[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (name: string) => void;
};

const dialogCopy = {
  status: {
    rest: "Task Status",
    fieldLabel: "Task Status Name",
    description: "Edit this task status name.",
  },
  priority: {
    rest: "Task Priority",
    fieldLabel: "Task Priority Title",
    description: "Edit this task priority title.",
  },
} as const;

type EditTaxonomyFormProps = {
  kind: TaxonomyKind;
  row: TaxonomyRow;
  existingLabels: readonly string[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (name: string) => void;
};

function EditTaxonomyForm({
  kind,
  row,
  existingLabels,
  onOpenChange,
  onUpdate,
}: EditTaxonomyFormProps) {
  const nameId = useId();
  const copy = dialogCopy[kind];
  const [name, setName] = useState(row.label);
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTaxonomyLabel({
      name,
      kind,
      existingLabels,
      currentLabel: row.label,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    onUpdate(result.data.name);
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
            {copy.rest}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {copy.description}
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
              <FieldLabel htmlFor={nameId}>{copy.fieldLabel}</FieldLabel>
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
            <Button type="submit" size="lg" className="min-w-24 px-8">
              Update
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

export function EditTaxonomyDialog({
  open,
  kind,
  row,
  existingLabels,
  onOpenChange,
  onUpdate,
}: EditTaxonomyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && row ? (
        <EditTaxonomyForm
          kind={kind}
          row={row}
          existingLabels={existingLabels}
          onOpenChange={onOpenChange}
          onUpdate={onUpdate}
        />
      ) : null}
    </Dialog>
  );
}
