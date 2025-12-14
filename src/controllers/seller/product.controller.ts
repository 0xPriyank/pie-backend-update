import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import {
  createProduct,
  getSellerProducts,
  getSellerProductById,
  updateProduct,
  deleteProduct,
  getSellerProductsByCategory as getSellerProductsByCategoryService,
  getSellerProductsByCategorySlug as getSellerProductsByCategorySlugService,
  addImageToProduct
} from "@/services/seller/product.service";
import {
  createProductSchema,
  updateProductSchema,
  paginationSchema,
  productIdSchema,
  categoryIdSchema,
  categorySlugSchema
} from "@/schemas/product.schema";
import { z } from "zod";
import prisma from "@/config/db.config";

// Schema for adding image to product
const addImageToProductSchema = z.object({
  productId: z.string().uuid(),
  fileId: z.string().uuid(),
  isMain: z.boolean().optional().default(false)
});

/**
 * Create a new product for the logged-in seller
 * POST /seller/product
 */
export const createSellerProduct = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized. Authentication required to create a product.");
  }

  const productData = createProductSchema.parse(req.body);

  const newProduct = await createProduct(sellerId, productData);

  res.status(201).json(new ApiResponse(201, { data: newProduct }, "Product created successfully"));
});

/**
 * Get all products for the logged-in seller with pagination
 * GET /seller/product/all
 */
export const getAllSellerProducts = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { page, limit } = paginationSchema.parse(req.query);

  const result = await getSellerProducts(sellerId, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Products fetched successfully"));
});

/**
 * Get a specific product by ID for the logged-in seller
 * GET /seller/product/:productId
 */
export const getSellerProduct = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { productId } = productIdSchema.parse(req.params);

  const product = await getSellerProductById(productId, sellerId);

  res.status(200).json(new ApiResponse(200, { data: product }, "Product fetched successfully"));
});

/**
 * Update a product for the logged-in seller
 * PATCH /seller/product/:productId
 */
export const updateSellerProduct = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { productId } = productIdSchema.parse(req.params);
  const updateData = updateProductSchema.parse(req.body);

  const updatedProduct = await updateProduct(productId, sellerId, updateData);

  res
    .status(200)
    .json(new ApiResponse(200, { data: updatedProduct }, "Product updated successfully"));
});

/**
 * Delete a product for the logged-in seller (soft delete)
 * DELETE /seller/product/:productId
 */
export const deleteSellerProduct = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { productId } = productIdSchema.parse(req.params);

  const result = await deleteProduct(productId, sellerId);

  res.status(200).json(new ApiResponse(200, { data: result }, "Product deleted successfully"));
});

/**
 * Get products by category for the logged-in seller
 * GET /seller/product/category/:categoryId
 */
export const getSellerProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { categoryId } = categoryIdSchema.parse(req.params);
  const { page, limit } = paginationSchema.parse(req.query);

  const result = await getSellerProductsByCategoryService(sellerId, categoryId, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Products fetched successfully"));
});

/**
 * Get products by category slug for the logged-in seller
 * GET /seller/product/categorybyslug/:categorySlug
 */
export const getSellerProductsByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { categorySlug } = categorySlugSchema.parse(req.params);
  const { page, limit } = paginationSchema.parse(req.query);

  const result = await getSellerProductsByCategorySlugService(sellerId, categorySlug, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Products fetched successfully"));
});

/**
 * Add image to product for the logged-in seller
 * POST /seller/product/image
 */
export const addImageToSellerProduct = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { productId, fileId, isMain } = addImageToProductSchema.parse(req.body);

  const image = await addImageToProduct(productId, sellerId, fileId, isMain);

  res
    .status(200)
    .json(new ApiResponse(200, { data: image }, "Image added to product successfully"));
});

/**
 * Get product statistics for the logged-in seller
 * GET /seller/product/stats
 */
export const getSellerProductStats = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  // Get product statistics
  const totalProducts = await prisma.product.count({
    where: { sellerId, isDeleted: false }
  });

  const activeProducts = await prisma.product.count({
    where: { sellerId, isDeleted: false, isActive: true }
  });

  const inStockProducts = await prisma.product.count({
    where: { sellerId, isDeleted: false, inStock: true }
  });

  const lowStockProducts = await prisma.product.count({
    where: {
      sellerId,
      isDeleted: false,
      stockAvailable: {
        lte: 10,
        gt: 0
      }
    }
  });

  const outOfStockProducts = await prisma.product.count({
    where: {
      sellerId,
      isDeleted: false,
      stockAvailable: 0
    }
  });

  const stats = {
    totalProducts,
    activeProducts,
    inStockProducts,
    lowStockProducts,
    outOfStockProducts
  };

  res
    .status(200)
    .json(new ApiResponse(200, { data: stats }, "Product statistics fetched successfully"));
});
