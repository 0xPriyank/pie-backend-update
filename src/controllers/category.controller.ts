import { Request, Response } from "express";
import { db as prisma } from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";

// CREATE Category or Subcategory
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, parentCategoryId, taxId } = req.body;

  const newCategory = await prisma.category.create({
    data: {
      name,
      slug,
      parentCategoryId,
      taxId
    }
  });

  res.status(201).json(new ApiResponse(201, newCategory, "Category created successfully"));
});

// GET all categories (with nested subcategories)
export const getAllCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { parentCategoryId: null },
    include: {
      subCategories: {
        include: {
          subCategories: true // nested subcategories
        }
      }
    }
  });

  res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// DELETE Category (and all subcategories recursively)
async function deleteCategoryAndSubcategories(id: string) {
  // Check if category exists before proceeding
  const existingCategory = await prisma.category.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingCategory) {
    console.log(`Category with id ${id} not found or already deleted.`);
    return;
  }

  const subcategories = await prisma.category.findMany({ where: { parentCategoryId: id } });

  for (const sub of subcategories) {
    await deleteCategoryAndSubcategories(sub.id);
  }

  await prisma.category.delete({ where: { id } });
}

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  console.log("Incoming categoryId:", categoryId);

  await deleteCategoryAndSubcategories(categoryId);

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Category and its subcategories deleted successfully"));
});
