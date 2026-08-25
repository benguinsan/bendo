import { z } from "zod";

export const TAXONOMY_LABEL_MAX = 50;

export type TaxonomyKind = "status" | "priority";

export type TaxonomyLabelValues = {
  name: string;
};

export type ValidateTaxonomyLabelInput = {
  name: string;
  kind: TaxonomyKind;
  existingLabels: readonly string[];
  currentLabel: string;
};

const kindCopy = {
  status: {
    required: "Task status name is required",
    max: `Task status name must be ${TAXONOMY_LABEL_MAX} characters or fewer`,
    duplicate: "A task status with this name already exists",
  },
  priority: {
    required: "Task priority title is required",
    max: `Task priority title must be ${TAXONOMY_LABEL_MAX} characters or fewer`,
    duplicate: "A task priority with this title already exists",
  },
} as const;

export function normalizeTaxonomyLabel(name: string): string {
  return name.trim().replaceAll(/\s+/gu, " ");
}

function taxonomyLabelSchema(kind: TaxonomyKind) {
  const copy = kindCopy[kind];

  return z
    .string()
    .transform(normalizeTaxonomyLabel)
    .pipe(z.string().min(1, copy.required).max(TAXONOMY_LABEL_MAX, copy.max));
}

function isSameLabel(left: string, right: string): boolean {
  return (
    normalizeTaxonomyLabel(left).toLowerCase() ===
    normalizeTaxonomyLabel(right).toLowerCase()
  );
}

export function validateTaxonomyLabel({
  name,
  kind,
  existingLabels,
  currentLabel,
}: ValidateTaxonomyLabelInput):
  | { success: true; data: TaxonomyLabelValues }
  | { success: false; error: string } {
  const parsed = taxonomyLabelSchema(kind).safeParse(name);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? kindCopy[kind].required,
    };
  }

  const hasDuplicate = existingLabels.some(
    (label) =>
      !isSameLabel(label, currentLabel) && isSameLabel(label, parsed.data)
  );

  if (hasDuplicate) {
    return { success: false, error: kindCopy[kind].duplicate };
  }

  return { success: true, data: { name: parsed.data } };
}
