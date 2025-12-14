import { Router } from "express";
import { validate } from "@/middlewares/validation.middleware";
import {
  customerGetProductById,
  customerGetProductsByCategoryId,
  customerGetProductsByCategorySlug,
  customerGetProductsByCategoryIdAndSellerId,
  customerGetProductsByAllCategoryId
} from "@/controllers/customer.controller";
import {
  categoryIdSchema,
  categorySlugSchema,
  getProductsByCategoryIdAndSellerIdSchema,
  paginationSchema,
  productIdSchema
} from "@/schemas/product.schema";
import { getProducts } from "@/controllers/products.controller";

const router = Router();

// *------------------------------ Customer Product routes --------------------------------- *//
router.route("/all").get(validate(paginationSchema, "query"), getProducts);

router
  .route("/category/:categoryId/seller/:sellerId")
  .get(
    validate(paginationSchema, "query"),
    validate(getProductsByCategoryIdAndSellerIdSchema, "params"),
    customerGetProductsByCategoryIdAndSellerId
  );

router
  .route("/category/:categoryId")
  .get(
    validate(categoryIdSchema, "params"),
    validate(paginationSchema, "query"),
    customerGetProductsByCategoryId
  );

router
  .route("/categorybyslug/:categorySlug")
  .get(
    validate(categorySlugSchema, "params"),
    validate(paginationSchema, "query"),
    customerGetProductsByCategorySlug
  );

router
  .route("/allcategory/:categoryId")
  .get(
    validate(categoryIdSchema, "params"),
    validate(paginationSchema, "query"),
    customerGetProductsByAllCategoryId
  );

router.route("/:productId").get(validate(productIdSchema, "params"), customerGetProductById);

export default router;
