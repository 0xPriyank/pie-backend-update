import {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySellerId,
  getProductsByCategoryId,
  getProductsByAllCategoryId,
  getProductsByCategorySlug,
  getProductsByCategoryIdAndSellerId,
  addImageToProduct
} from "@/controllers/product.controller";
import { getProducts } from "@/controllers/products.controller";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";
import {
  addImageToProductSchema,
  createProductSchema,
  categoryIdSchema,
  categorySlugSchema,
  getProductByIdSchema,
  paginationSchema,
  productIdSchema,
  updateProductSchema,
  sellerIdSchema,
  getProductsByCategoryIdAndSellerIdSchema
} from "@/schemas/product.schema";
import { Router } from "express";

const router = Router();

// * -------------------------- Create Product -------------------------- * //
router.route("/").post(verifyJWT("seller"), validate(createProductSchema, "body"), createProduct);

// * -------------------------- Get All Products (Query-based, Unified) -------------------------- * //
router.route("/").get(validate(paginationSchema, "query"), getProducts);

// * -------------------------- Get Product by ID -------------------------- * //
router.route("/:productId").get(validate(getProductByIdSchema, "params"), getProductById);

// * -------------------------- Add Image to Product -------------------------- * //
router
  .route("/image")
  .post(verifyJWT("seller"), validate(addImageToProductSchema, "body"), addImageToProduct);

// * -------------------------- Update Product -------------------------- * //
router
  .route("/:productId")
  .patch(
    verifyJWT("seller"),
    validate(productIdSchema, "params"),
    validate(updateProductSchema, "body"),
    updateProduct
  );

// * -------------------------- Delete Product -------------------------- * //
router
  .route("/:productId")
  .delete(verifyJWT("seller"), validate(productIdSchema, "params"), deleteProduct);

// ! DEPRECATED: These routes are obsolete and will be removed in a future release.
// TODO: Remove these deprecated routes in the next major version

// * -------------------------- Get Products by Category ID and Seller ID -------------------------- * //
router
  .route("/category/:categoryId/seller/:sellerId")
  .get(
    validate(getProductsByCategoryIdAndSellerIdSchema, "params"),
    validate(paginationSchema, "query"),
    getProductsByCategoryIdAndSellerId
  );

// * -------------------------- Get Products by Seller ID -------------------------- * //
router.route("/seller/:sellerId").get(validate(sellerIdSchema, "params"), getProductsBySellerId);

// * -------------------------- Get Products by Category ID -------------------------- * //
router
  .route("/category/:categoryId")
  .get(
    validate(categoryIdSchema, "params"),
    validate(paginationSchema, "query"),
    getProductsByCategoryId
  );

// * -------------------------- Get All Products from a Subcategory and Category ID -------------------------- * //
router
  .route("/allcategory/:categoryId")
  .get(
    validate(categoryIdSchema, "params"),
    validate(paginationSchema, "query"),
    getProductsByAllCategoryId
  );

// * -------------------------- Get All Products from a Subcategory and Category ID -------------------------- * //
router
  .route("/categorybyslug/:categorySlug")
  .get(
    validate(categorySlugSchema, "params"),
    validate(paginationSchema, "query"),
    getProductsByCategorySlug
  );

export default router;
