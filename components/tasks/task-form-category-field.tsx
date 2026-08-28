"use client";

import { useEffect, useId, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { listCategoriesViaApi } from "@/lib/task-categories/category-api-client";
import type { PersistedCategory } from "@/lib/task-categories/persisted-category";
import { cn } from "@/lib/utils";

type TaskFormCategoryFieldProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export function TaskFormCategoryField({
  value,
  error,
  onChange,
}: TaskFormCategoryFieldProps) {
  const fieldId = useId();
  const [categories, setCategories] = useState<PersistedCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      const nextCategories = await listCategoriesViaApi();
      if (!cancelled) {
        setCategories(nextCategories);
        setLoading(false);
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>Category</FieldLabel>
      <select
        id={fieldId}
        name="categoryId"
        value={value}
        disabled={loading}
        aria-invalid={Boolean(error)}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
        )}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
