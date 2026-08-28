"use client";

import { CalendarIcon } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { TaskFormCategoryField } from "@/components/tasks/task-form-category-field";
import { TaskFormImageField } from "@/components/tasks/task-form-image-field";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { formatNumericDate } from "@/lib/dashboard/dates";
import {
  parseLocalDateInput,
  priorityOptions,
  type TaskFormFieldErrors,
} from "@/lib/tasks/task-input";
import { cn } from "@/lib/utils";

export type TaskFormSubmitValues = {
  title: string;
  date: string;
  priority: string;
  categoryId: string | null;
  description: string;
  previewUrl: string | null;
};

export type TaskFormInitialValues = {
  title: string;
  date: string;
  priority: string;
  categoryId: string | null;
  description: string;
  previewUrl: string | null;
};

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  heading: ReactNode;
  description: string;
  initialValues?: TaskFormInitialValues;
  onSubmit: (
    values: TaskFormSubmitValues
  ) => TaskFormFieldErrors | null | Promise<TaskFormFieldErrors | null>;
};

type TaskFormContentProps = {
  heading: ReactNode;
  description: string;
  initialValues?: TaskFormInitialValues;
  onSubmit: (
    values: TaskFormSubmitValues
  ) => TaskFormFieldErrors | null | Promise<TaskFormFieldErrors | null>;
  onOpenChange: (open: boolean) => void;
};

function TaskFormContent({
  heading,
  description,
  initialValues,
  onSubmit,
  onOpenChange,
}: TaskFormContentProps) {
  const titleId = useId();
  const dateId = useId();
  const descriptionId = useId();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [priority, setPriority] = useState(initialValues?.priority ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialValues?.categoryId ?? ""
  );
  const [descriptionValue, setDescriptionValue] = useState(
    initialValues?.description ?? ""
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialValues?.previewUrl ?? null
  );
  const [errors, setErrors] = useState<TaskFormFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const nextErrors = await onSubmit({
      title,
      date,
      priority,
      categoryId: selectedCategoryId || null,
      description: descriptionValue,
      previewUrl,
    });
    setIsSubmitting(false);

    if (nextErrors) {
      setErrors(nextErrors);
      return;
    }

    onOpenChange(false);
  }

  const dateDisplay = date ? formatNumericDate(parseLocalDateInput(date)) : "";

  return (
    <DialogContent
      showCloseButton={false}
      className="bg-card rounded-card flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-6 overflow-y-auto p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <DialogTitle className="font-sans text-base font-medium">
            {heading}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </div>
        <DialogClose
          render={<Button type="button" variant="link" className="underline" />}
        >
          Go Back
        </DialogClose>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="border-border flex flex-col gap-4 rounded-lg border p-4 sm:p-6">
          <FieldGroup>
            <Field data-invalid={errors.title ? true : undefined}>
              <FieldLabel htmlFor={titleId}>Title</FieldLabel>
              <Input
                id={titleId}
                name="title"
                value={title}
                aria-invalid={Boolean(errors.title)}
                onChange={(event) => setTitle(event.target.value)}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>
            <Field data-invalid={errors.date ? true : undefined}>
              <FieldLabel htmlFor={dateId}>Date</FieldLabel>
              <div className="relative">
                <InputGroup>
                  <InputGroupInput
                    readOnly
                    tabIndex={-1}
                    value={dateDisplay}
                    aria-hidden="true"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarIcon />
                  </InputGroupAddon>
                </InputGroup>
                <input
                  id={dateId}
                  name="date"
                  type="date"
                  value={date}
                  aria-invalid={Boolean(errors.date)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <FieldError>{errors.date}</FieldError>
            </Field>
            <FieldSet data-invalid={errors.priority ? true : undefined}>
              <FieldLegend variant="label">Priority</FieldLegend>
              <RadioGroup
                name="priority"
                value={priority}
                className="flex flex-row flex-wrap gap-8"
                aria-invalid={Boolean(errors.priority)}
                onValueChange={(value) => setPriority(String(value))}
              >
                {priorityOptions.map((option) => {
                  const optionId = `${dateId}-${option.value}`;
                  return (
                    <Field
                      key={option.value}
                      orientation="horizontal"
                      className="w-auto"
                    >
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          option.dotClass
                        )}
                      />
                      <FieldLabel htmlFor={optionId} className="font-normal">
                        {option.label}
                      </FieldLabel>
                      <RadioGroupItem
                        id={optionId}
                        value={option.value}
                        className="rounded-[2px]"
                      />
                    </Field>
                  );
                })}
              </RadioGroup>
              <FieldError>{errors.priority}</FieldError>
            </FieldSet>
            <TaskFormCategoryField
              value={selectedCategoryId}
              error={errors.category}
              onChange={setSelectedCategoryId}
            />
            <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
              <Field data-invalid={errors.description ? true : undefined}>
                <FieldLabel htmlFor={descriptionId}>
                  Task Description
                </FieldLabel>
                <Textarea
                  id={descriptionId}
                  name="description"
                  value={descriptionValue}
                  placeholder="Start writing here...."
                  aria-invalid={Boolean(errors.description)}
                  className="min-h-40 resize-none md:min-h-48"
                  onChange={(event) => setDescriptionValue(event.target.value)}
                />
                <FieldError>{errors.description}</FieldError>
              </Field>
              <TaskFormImageField
                previewUrl={previewUrl}
                error={errors.image}
                onPreviewChange={setPreviewUrl}
                onError={(message) =>
                  setErrors((current) => ({ ...current, image: message }))
                }
              />
            </FieldGroup>
          </FieldGroup>
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-fit min-w-24 px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Done"}
        </Button>
      </form>
    </DialogContent>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  trigger,
  heading,
  description,
  initialValues,
  onSubmit,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      {open ? (
        <TaskFormContent
          heading={heading}
          description={description}
          initialValues={initialValues}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}
