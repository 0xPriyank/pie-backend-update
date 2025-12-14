import { Request, Response } from "express";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import prisma from "@/config/db.config";
import { commonProductSelect, transformProduct } from "@/controllers/product.controller";
import { getAllCategoryIds } from "@/controllers/product.controller";

export const getProducts = async (req: Request, res: Response) => {
  // Extract query parameters
  try {
    const {
      category: categorySlug,
      categoryId,
      sellerId,
      inStock,
      minPrice,
      maxPrice,
      colorId,
      sizeId,
      search,
      page = "1",
      limit = "12"
    } = req.query as Record<string, string | undefined>;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 10));

    // Build where clause
    let resolvedCategoryId: string | undefined;
    let allCategoryIds: string[] | undefined;

    if (categorySlug) {
      const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!category) throw new ApiError(404, "Category not found");
      resolvedCategoryId = category.id;
    } else if (categoryId) {
      resolvedCategoryId = categoryId;
    }

    if (resolvedCategoryId) {
      allCategoryIds = await getAllCategoryIds(resolvedCategoryId);
    }

    // Build Prisma where filter
    const where: Record<string, unknown> = { isDeleted: false };

    if (allCategoryIds) {
      where.categories = {
        some: {
          id: {
            in: allCategoryIds
          }
        }
      };
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }
    if (typeof inStock !== "undefined") {
      if (inStock === "true" || inStock === "false") {
        where.inStock = inStock === "true";
      }
    }
    if (colorId) {
      where.colorId = colorId;
    }
    if (sizeId) {
      where.sizeId = sizeId;
    }
    if (minPrice || maxPrice) {
      where.price = {} as { gte?: number; lte?: number };
      if (minPrice) (where.price as { gte?: number; lte?: number }).gte = Number(minPrice);
      if (maxPrice) (where.price as { gte?: number; lte?: number }).lte = Number(maxPrice);
    }
    if (search) {
      const searchStr = search.trim();
      where.OR = [
        { name: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
        { shortDescription: { contains: searchStr, mode: "insensitive" } }
      ];
    }

    // Fetch products
    const products = await prisma.product.findMany({
      where,
      select: commonProductSelect,
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    if (products.length === 0 && pageNum === 1) {
      throw new ApiError(404, "No products found");
    }

    const transformedProducts = await Promise.all(products.map(transformProduct));

    // Count total products for pagination
    const totalProducts = await prisma.product.count({ where });
    const totalPages = Math.ceil(totalProducts / limitNum);

    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalProducts,
      pageSize: limitNum
    };
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: { products: transformedProducts, pagination } },
          "Products fetched successfully"
        )
      );
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;

    res
      .status(statusCode)
      .json(
        new ApiResponse(
          200,
          { data: { products: [], pagination: [] } },
          error instanceof Error ? error.message : "Internal Server Error"
        )
      );
  }
};
