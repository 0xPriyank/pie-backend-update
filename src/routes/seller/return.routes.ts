import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import {
  getSellerReturnsList,
  getSellerReturnById,
  updateSellerReturnStatus,
  processReturnRefund,
  updateSellerRefundStatus,
  getSellerRefundById,
  getSellerRefundsList
} from "@/controllers/seller/return.controller";

const router = Router();

// All routes require seller authentication
router.use(verifyJWT("seller"));

/**
 * Seller Return Routes
 */

// Get all returns
router.get("/returns", getSellerReturnsList);

// Get specific return
router.get("/returns/:returnId", getSellerReturnById);

// Update return status
router.put("/returns/:returnId/status", updateSellerReturnStatus);

/**
 * Seller Refund Routes
 */

// Process refund for a return
router.post("/refunds", processReturnRefund);

// Get all refunds
router.get("/refunds", getSellerRefundsList);

// Get specific refund
router.get("/refunds/:refundId", getSellerRefundById);

// Update refund status
router.put("/refunds/:refundId/status", updateSellerRefundStatus);

export default router;
