import { Request, Response } from "express";
import { db as prisma } from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";

// CREATE Category or Subcategory (Seller-specific)
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, parentCategoryId, taxId } = req.body;
  const sellerId = (req as any).user?.id; // From verifyJWT middleware

  if (!sellerId) {
    throw new ApiError(401, "Seller authentication required");
  }

  // Check if category with same name/slug already exists for this seller
  const existingCategory = await prisma.category.findFirst({
    where: {
      sellerId,
      OR: [{ name }, { slug }]
    }
  });

  if (existingCategory) {
    throw new ApiError(409, "Category with this name or slug already exists");
  }

  const newCategory = await prisma.category.create({
    data: {
      name,
      slug,
      parentCategoryId,
      taxId,
      sellerId
    }
  });

  res.status(201).json(new ApiResponse(201, newCategory, "Category created successfully"));
});

// GET all categories for the authenticated seller
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = (req as any).user?.id;

  if (!sellerId) {
    throw new ApiError(401, "Seller authentication required");
  }

  const categories = await prisma.category.findMany({
    where: { 
      sellerId,
      parentCategoryId: null 
    },
    include: {
      subCategories: {
        include: {
          subCategories: true // nested subcategories
        }
      },
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// GET all categories (Public - for browsing, includes all sellers)
export const getPublicCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { parentCategoryId: null },
    include: {
      subCategories: {
        include: {
          subCategories: true
        }
      }
    }
  });

  res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// DELETE Category (and all subcategories recursively) - Seller-specific
async function deleteCategoryAndSubcategories(id: string, sellerId: string) {
  // Check if category exists and belongs to the seller
  const existingCategory = await prisma.category.findFirst({
    where: { 
      id,
      sellerId 
    },
    select: { id: true }
  });

  if (!existingCategory) {
    console.log(`Category with id ${id} not found, already deleted, or doesn't belong to seller.`);
    return;
  }

  const subcategories = await prisma.category.findMany({ 
    where: { 
      parentCategoryId: id,
      sellerId 
    } 
  });

  for (const sub of subcategories) {
    await deleteCategoryAndSubcategories(sub.id, sellerId);
  }

  await prisma.category.delete({ where: { id } });
}

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const sellerId = (req as any).user?.id;

  if (!sellerId) {
    throw new ApiError(401, "Seller authentication required");
  }

  console.log("Incoming categoryId:", categoryId);

  // Check if category belongs to seller
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      sellerId
    }
  });

  if (!category) {
    throw new ApiError(404, "Category not found or doesn't belong to you");
  }

  await deleteCategoryAndSubcategories(categoryId, sellerId);

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Category and its subcategories deleted successfully"));
});

// UPDATE Category (Seller-specific)
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { name, slug, parentCategoryId, taxId } = req.body;
  const sellerId = (req as any).user?.id;

  if (!sellerId) {
    throw new ApiError(401, "Seller authentication required");
  }

  // Check if category belongs to seller
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      sellerId
    }
  });

  if (!category) {
    throw new ApiError(404, "Category not found or doesn't belong to you");
  }

  // Check if new name/slug conflicts with existing categories
  if (name || slug) {
    const conflictingCategory = await prisma.category.findFirst({
      where: {
        sellerId,
        id: { not: categoryId },
        OR: [
          ...(name ? [{ name }] : []),
          ...(slug ? [{ slug }] : [])
        ]
      }
    });

    if (conflictingCategory) {
      throw new ApiError(409, "Category with this name or slug already exists");
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(parentCategoryId !== undefined && { parentCategoryId }),
      ...(taxId && { taxId })
    }
  });

  res.status(200).json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});
