// ----CTP: Product Option & Variant Routes - Shopify-level variant system
import { Router } from "express";
import * as optionController from "../controllers/productOption.controller";
import * as variantController from "../controllers/productVariant.controller";
import { verifyJWT } from "../modules/auth/auth";

const router = Router();

// ----CTP: Apply seller authentication to all routes
router.use(verifyJWT("seller"));

// ----CTP: Product Option Routes (Seller only)
router.post("/product-options", optionController.createProductOption);
router.get("/product-options/:productId", optionController.getProductOptions);
router.put("/product-options/:optionId", optionController.updateProductOption);
router.delete("/product-options/:optionId", optionController.deleteProductOption);
router.delete("/product-option-values/:valueId", optionController.deleteOptionValue);

// ----CTP: Product Variant Routes (Seller only)
router.post("/product-variants", variantController.createProductVariant);
router.post("/product-variants/auto-generate", variantController.generateProductVariants);
router.get("/product-variants/:productId", variantController.getProductVariants);
router.get("/product-variants/single/:variantId", variantController.getProductVariantById);
router.put("/product-variants/:variantId", variantController.updateProductVariant);
router.delete("/product-variants/:variantId", variantController.deleteProductVariant);
router.put("/product-variants/bulk-update", variantController.bulkUpdateInventory);

export default router;
