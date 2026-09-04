import { z } from "zod";

export const CATEGORY_NAME_MAX = 50;

export type CategoryFormValues = {
  name: string;
};

export function normalizeCategoryName(name: string): string {
  return name.trim().replaceAll(/\s+/gu, " ");
}

export const categoryNameSchema = z
  .string()
  .transform(normalizeCategoryName)
  .pipe(
    z
      .string()
      .min(1, "Category name is required")
      .max(
        CATEGORY_NAME_MAX,
        `Category name must be ${CATEGORY_NAME_MAX} characters or fewer`
      )
  );

export const categoryWriteSchema = z.object({
  name: categoryNameSchema,
});

export function validateNewCategory(
  name: string
):
  | { success: true; data: CategoryFormValues }
  | { success: false; error: string } {
  const parsed = categoryNameSchema.safeParse(name);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Category name is required",
    };
  }

  return { success: true, data: { name: parsed.data } };
}

function isSameCategoryName(left: string, right: string): boolean {
  return (
    normalizeCategoryName(left).toLowerCase() ===
    normalizeCategoryName(right).toLowerCase()
  );
}

export function validateUpdatedCategory(input: {
  name: string;
  existingNames: readonly string[];
  currentName: string;
}):
  | { success: true; data: CategoryFormValues }
  | { success: false; error: string } {
  const parsed = categoryNameSchema.safeParse(input.name);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Category name is required",
    };
  }

  const hasDuplicate = input.existingNames.some(
    (name) =>
      !isSameCategoryName(name, input.currentName) &&
      isSameCategoryName(name, parsed.data)
  );

  if (hasDuplicate) {
    return {
      success: false,
      error: "A category with this name already exists.",
    };
  }

  return { success: true, data: { name: parsed.data } };
}
