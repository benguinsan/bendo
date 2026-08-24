"use client";

import { CalendarIcon, ImageUpIcon, PlusIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
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
import type { DashboardTask } from "@/lib/dashboard/mock-data";
import { createMockTask } from "@/lib/tasks/create-mock-task";
import {
  parseLocalDateInput,
  priorityOptions,
  validateNewTask,
  validateTaskImage,
  type TaskFormFieldErrors,
} from "@/lib/tasks/task-input";
import { cn } from "@/lib/utils";

type AddTaskDialogProps = {
  existingTasks: DashboardTask[];
  onCreate: (task: DashboardTask) => void;
};

export function AddTaskDialog({ existingTasks, onCreate }: AddTaskDialogProps) {
  const titleId = useId();
  const dateId = useId();
  const descriptionId = useId();
  const imageId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<TaskFormFieldErrors>({});

  function resetForm(options?: { revokePreview?: boolean }) {
    const shouldRevoke = options?.revokePreview ?? true;
    setTitle("");
    setDate("");
    setPriority("");
    setDescription("");
    setIsDragging(false);
    setErrors({});
    if (shouldRevoke && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    []
  );

  function applyImageFile(file: File) {
    const imageError = validateTaskImage(file);
    if (imageError) {
      setErrors((current) => ({ ...current, image: imageError }));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setErrors((current) => ({ ...current, image: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date();
    const result = validateNewTask({
      title,
      date,
      priority,
      description,
      now,
      existingTasks,
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onCreate(
      createMockTask({
        title: result.data.title,
        description: result.data.description,
        date: result.data.date,
        priority: result.data.priority,
        thumbnailSrc: previewUrl,
        now,
      })
    );
    resetForm({ revokePreview: false });
    setOpen(false);
  }

  const dateDisplay = date ? formatNumericDate(parseLocalDateInput(date)) : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="link" />}>
        <PlusIcon data-icon="inline-start" />
        Add task
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-card rounded-card flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-6 overflow-y-auto p-6 sm:max-w-3xl sm:p-8 md:max-w-4xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-sans text-base font-medium">
              <span className="border-primary border-b-2 pb-0.5">Add</span> New
              Task
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new task with a title, date, priority, and optional
              description or image.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button type="button" variant="link" className="underline" />
            }
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
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
                <Field data-invalid={errors.description ? true : undefined}>
                  <FieldLabel htmlFor={descriptionId}>
                    Task Description
                  </FieldLabel>
                  <Textarea
                    id={descriptionId}
                    name="description"
                    value={description}
                    placeholder="Start writing here...."
                    aria-invalid={Boolean(errors.description)}
                    className="min-h-40 resize-none md:min-h-48"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <FieldError>{errors.description}</FieldError>
                </Field>
                <Field data-invalid={errors.image ? true : undefined}>
                  <FieldLabel htmlFor={imageId}>Upload Image</FieldLabel>
                  <div
                    className={cn(
                      "border-input flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border px-3 py-4 md:min-h-48",
                      isDragging && "border-primary"
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      const [file] = event.dataTransfer.files;
                      if (file) {
                        applyImageFile(file);
                      }
                    }}
                  >
                    {previewUrl ? (
                      /* oxlint-disable-next-line next/no-img-element */
                      <img
                        src={previewUrl}
                        alt="Selected task preview"
                        className="max-h-28 w-full object-cover"
                      />
                    ) : (
                      <>
                        <ImageUpIcon className="text-muted-foreground size-10" />
                        <p className="text-muted-foreground text-center text-xs">
                          Drag&Drop files here
                        </p>
                      </>
                    )}
                    <p className="text-muted-foreground text-xs">or</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse
                    </Button>
                    <input
                      id={imageId}
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        const [file] = event.target.files ?? [];
                        if (file) {
                          applyImageFile(file);
                        }
                      }}
                    />
                  </div>
                  <FieldError>{errors.image}</FieldError>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </div>
          <Button type="submit" size="lg" className="w-fit min-w-24 px-8">
            Done
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
