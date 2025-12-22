import { Router } from "express";
import { validate } from "@/middlewares/validation.middleware";
import { categoryCreateSchema, categoryIdParamSchema } from "@/schemas/category.schema";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getPublicCategories,
  updateCategory
} from "@/controllers/category.controller";
import { verifyJWT } from "@/modules/auth/auth";

const router = Router();

// Public routes - anyone can view all categories
router.get("/public", getPublicCategories);

// Seller-specific routes - require authentication
router.use(verifyJWT("seller")); // Apply seller authentication to all routes below

router
  .route("/")
  .post(validate(categoryCreateSchema, "body"), createCategory)
  .get(getAllCategories);

router
  .route("/:categoryId")
  .patch(updateCategory)
  .delete(validate(categoryIdParamSchema, "params"), deleteCategory);

export default router;
