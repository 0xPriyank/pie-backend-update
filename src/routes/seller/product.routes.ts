import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";
import {
  createSellerProduct,
  getAllSellerProducts,
  getSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerProductsByCategory,
  getSellerProductsByCategorySlug,
  addImageToSellerProduct,
  getSellerProductStats
} from "@/controllers/seller/product.controller";
import {
  createProductSchema,
  updateProductSchema,
  paginationSchema,
  productIdSchema,
  categoryIdSchema,
  categorySlugSchema
} from "@/schemas/product.schema";
import { z } from "zod";

// Schema for adding image to product
const addImageToProductSchema = z.object({
  productId: z.string().uuid(),
  fileId: z.string().uuid(),
  isMain: z.boolean().optional().default(false)
});

const router = Router();

// Apply seller authentication middleware to all routes
router.use(verifyJWT("seller"));

/**
 * Product CRUD Operations
 */

// Create a new product
router.post("/", validate(createProductSchema, "body"), createSellerProduct);

// Get all products for the seller with pagination
router.get("/all", validate(paginationSchema, "query"), getAllSellerProducts);

// Get products by category
router.get(
  "/category/:categoryId",
  validate(categoryIdSchema, "params"),
  validate(paginationSchema, "query"),
  getSellerProductsByCategory
);

// Get products by category slug
router.get(
  "/categorybyslug/:categorySlug",
  validate(categorySlugSchema, "params"),
  validate(paginationSchema, "query"),
  getSellerProductsByCategorySlug
);

// Add image to product
router.post("/image", validate(addImageToProductSchema, "body"), addImageToSellerProduct);

// Get product statistics
router.get("/stats", getSellerProductStats);

// Get a specific product by ID
router.get("/:productId", validate(productIdSchema, "params"), getSellerProduct);

// Update a product
router.patch(
  "/:productId",
  validate(productIdSchema, "params"),
  validate(updateProductSchema, "body"),
  updateSellerProduct
);

// Delete a product (soft delete)
router.delete("/:productId", validate(productIdSchema, "params"), deleteSellerProduct);

export default router;
