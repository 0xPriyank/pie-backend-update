// shipment.routes.ts - Shipmozo shipment and tracking routes
import { Router } from "express";
import * as shipmentController from "@/controllers/shipment.controller";
import { verifyJWT } from "@/modules/auth/auth";

/**
 * ====================================================================
 * Phase 7: Shipment Routes
 * ====================================================================
 * Routes for shipment creation, tracking, labels, and webhooks
 */

const router = Router();

// ==================== Customer Routes ====================
// Get all shipments for logged-in customer
router.get(
  "/customer",
  verifyJWT("customer"),
  shipmentController.getCustomerShipments
);

// ==================== Seller Routes ====================
// Get all shipments for logged-in seller
router.get(
  "/seller",
  verifyJWT("seller"),
  shipmentController.getSellerShipments
);

// ==================== SubOrder Shipment Routes ====================
// Create shipment for SubOrder (manual creation)
router.post(
  "/suborder/:subOrderId",
  verifyJWT("seller"), // Only seller can create shipment
  shipmentController.createShipmentForSubOrder
);

// Auto-create shipment (admin/internal use)
router.post(
  "/auto-create/:subOrderId",
  // verifyJWT("admin"), // Uncomment when admin auth is ready
  shipmentController.autoCreateShipment
);

// Get tracking information for SubOrder
router.get(
  "/suborder/:subOrderId/tracking",
  // No auth - allow tracking without login (like order tracking pages)
  shipmentController.getShipmentTracking
);

// Download shipping label
router.get(
  "/suborder/:subOrderId/label",
  verifyJWT("seller"), // Only seller can download label
  shipmentController.downloadShippingLabel
);

// Cancel shipment
router.post(
  "/suborder/:subOrderId/cancel",
  verifyJWT("seller"), // Only seller can cancel
  shipmentController.cancelShipment
);

// ==================== Webhook Routes ====================
// Shipmozo tracking webhook (no auth - verified via signature)
router.post(
  "/webhooks/tracking",
  shipmentController.handleShipmozoTrackingWebhook
);

export default router;
