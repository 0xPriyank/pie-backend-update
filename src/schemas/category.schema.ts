import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  taxId: z.string().uuid(),
  parentCategoryId: z.string().uuid().optional()
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().trim().uuid()
});
