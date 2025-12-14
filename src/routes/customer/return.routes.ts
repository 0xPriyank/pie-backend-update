import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import {
  createReturnRequest,
  getMyReturns,
  getMyReturnById,
  cancelMyReturn
} from "@/controllers/customer/return.controller";

const router = Router();

// All routes require customer authentication
router.use(verifyJWT("customer"));

/**
 * Customer Return Routes
 */

// Create return request
router.post("/", createReturnRequest);

// Get all my returns
router.get("/", getMyReturns);

// Get specific return
router.get("/:returnId", getMyReturnById);

// Cancel return
router.post("/:returnId/cancel", cancelMyReturn);

export default router;
