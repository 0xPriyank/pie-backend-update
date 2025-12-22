import { Router } from "express";
import {
  createSize,
  getAllSizes,
  getSizeById,
  updateSize,
  deleteSize,
} from "@/controllers/size.controller";

const router = Router();

// Public routes - anyone can view sizes
router.get("/", getAllSizes);
router.get("/:sizeId", getSizeById);

// Protected routes - only authenticated users can create/update/delete
// Note: Add verifyJWT middleware when authentication is required
router.post("/", createSize);
router.patch("/:sizeId", updateSize);
router.delete("/:sizeId", deleteSize);

export default router;
