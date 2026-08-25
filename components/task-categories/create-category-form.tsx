"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { validateNewCategory } from "@/lib/task-categories/category-input";

export function CreateCategoryForm() {
  const router = useRouter();
  const nameId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateNewCategory(name);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setError(undefined);
    router.push("/task-categories");
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup className="w-full md:max-w-[50%]">
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
        <Button type="submit" size="lg" className="min-w-24 px-8">
          Create
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/task-categories" />}
          size="lg"
          className="min-w-24 px-8"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
