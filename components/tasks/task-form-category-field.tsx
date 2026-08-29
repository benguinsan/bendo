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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      setLoadError(null);

      try {
        const result = await listCategoriesViaApi();
        if (cancelled) {
          return;
        }

        if (!result.ok) {
          setCategories([]);
          setLoadError(result.error);
          setLoading(false);
          return;
        }

        setCategories(result.categories);
      } catch {
        if (!cancelled) {
          setCategories([]);
          setLoadError("Could not load categories.");
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const fieldError = error ?? loadError ?? undefined;

  return (
    <Field data-invalid={fieldError ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>Category</FieldLabel>
      <select
        id={fieldId}
        name="categoryId"
        value={value}
        disabled={loading || Boolean(loadError)}
        aria-invalid={Boolean(fieldError)}
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
      <FieldError>{fieldError}</FieldError>
    </Field>
  );
}
