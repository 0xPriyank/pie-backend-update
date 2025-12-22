import { Router } from "express";
import {
  createColor,
  getAllColors,
  getColorById,
  updateColor,
  deleteColor,
} from "@/controllers/color.controller";

const router = Router();

// Public routes - anyone can view colors
router.get("/", getAllColors);
router.get("/:colorId", getColorById);

// Protected routes - only authenticated users can create/update/delete
// Note: Add verifyJWT middleware when authentication is required
router.post("/", createColor);
router.patch("/:colorId", updateColor);
router.delete("/:colorId", deleteColor);

export default router;
