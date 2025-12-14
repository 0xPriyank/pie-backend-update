import { Router } from "express";
import { validate } from "@/middlewares/validation.middleware";
import { categoryCreateSchema, categoryIdParamSchema } from "@/schemas/category.schema";
import {
  createCategory,
  deleteCategory,
  getAllCategories
} from "@/controllers/category.controller";

const router = Router();

router
  .route("/")
  .post(validate(categoryCreateSchema, "body"), createCategory)
  .get(getAllCategories);

router.route("/:categoryId").delete(validate(categoryIdParamSchema, "params"), deleteCategory);

export default router;
