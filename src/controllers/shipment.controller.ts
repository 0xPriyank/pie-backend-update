// shipment.controller.ts - Shipment management and tracking endpoints
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as shipmentService from "@/services/shipmozo.service";
import shipmozo from "@/config/shipmozo";
import crypto from "crypto";

/**
 * ====================================================================
 * Phase 7: Shipment Controller
 * ====================================================================
 * Handles shipment creation, tracking, and Shipmozo webhooks
 */

/**
 * Create shipment for SubOrder
 * POST /api/shipments/suborder/:subOrderId
 */
export const createShipmentForSubOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { subOrderId } = req.params;
    const {
      pickupAddress,
      deliveryAddress,
      items,
      paymentMode,
      codAmount,
      weight,
      dimensions,
      courierCode
    } = req.body;

    // Validate required fields
    if (!pickupAddress || !deliveryAddress || !items || !paymentMode) {
      throw new ApiError(
        400,
        "Missing required fields: pickupAddress, deliveryAddress, items, paymentMode"
      );
    }

    const shipment = await shipmentService.createShipment({
      subOrderId,
      pickupAddress,
      deliveryAddress,
      items,
      paymentMode,
      codAmount,
      weight,
      dimensions,
      courierCode
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, shipment, "Shipment created successfully")
      );
  }
);

/**
 * Auto-create shipment (called internally or from admin)
 * POST /api/shipments/auto-create/:subOrderId
 */
export const autoCreateShipment = asyncHandler(
  async (req: Request, res: Response) => {
    const { subOrderId } = req.params;

    await shipmentService.autoCreateShipmentForSubOrder(subOrderId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Shipment auto-creation triggered")
      );
  }
);

/**
 * Get tracking information for SubOrder
 * GET /api/shipments/suborder/:subOrderId/tracking
 */
export const getShipmentTracking = asyncHandler(
  async (req: Request, res: Response) => {
    const { subOrderId } = req.params;

    const tracking = await shipmentService.getShipmentTracking(subOrderId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, tracking, "Tracking information retrieved")
      );
  }
);

/**
 * Cancel shipment
 * POST /api/shipments/suborder/:subOrderId/cancel
 */
export const cancelShipment = asyncHandler(
  async (req: Request, res: Response) => {
    const { subOrderId } = req.params;

    await shipmentService.cancelShipment(subOrderId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Shipment cancelled successfully")
      );
  }
);

/**
 * Shipmozo tracking webhook
 * POST /api/webhooks/shipmozo/tracking
 * 
 * This endpoint receives real-time tracking updates from Shipmozo.
 * Webhook payload structure (Shipmozo sends this):
 * {
 *   "awb_number": "AWB12345678901",
 *   "status": "in_transit",
 *   "current_location": "Mumbai Hub",
 *   "timestamp": "2025-01-15T10:30:00Z",
 *   "remarks": "Package in transit"
 * }
 */
export const handleShipmozoTrackingWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Verify webhook signature (if Shipmozo supports it)
      const signature = req.headers["x-shipmozo-signature"] as string;
      const webhookSecret = shipmozo.webhookSecret;

      if (webhookSecret && signature) {
        const isValid = verifyShipmozoSignature(
          JSON.stringify(req.body),
          signature,
          webhookSecret
        );

        if (!isValid) {
          throw new ApiError(401, "Invalid webhook signature");
        }
      }

      const {
        awb_number,
        status,
        current_location,
        timestamp,
        remarks
      } = req.body;

      if (!awb_number || !status) {
        throw new ApiError(400, "Missing required webhook fields: awb_number, status");
      }

      // Update shipment tracking
      await shipmentService.updateShipmentTracking(
        awb_number,
        status,
        current_location || "Unknown",
        timestamp || new Date().toISOString(),
        remarks
      );

      console.log(`📦 Webhook received for AWB ${awb_number}: ${status}`);

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully"
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Always return 200 to Shipmozo to prevent retries for permanent errors
      return res.status(200).json({
        success: false,
        message: "Webhook processing failed"
      });
    }
  }
);

/**
 * Download shipping label
 * GET /api/shipments/suborder/:subOrderId/label
 */
export const downloadShippingLabel = asyncHandler(
  async (req: Request, res: Response) => {
    const { subOrderId } = req.params;

    const tracking = await shipmentService.getShipmentTracking(subOrderId);

    if (!tracking.labelUrl) {
      throw new ApiError(404, "Shipping label not available");
    }

    // Redirect to label URL or fetch and send
    return res.redirect(tracking.labelUrl);
  }
);

/**
 * Get all shipments for seller
 * GET /api/shipments/seller
 */
export const getSellerShipments = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;

    if (!sellerId) {
      throw new ApiError(401, "Seller not authenticated");
    }

    // Query shipments for seller's SubOrders
    const { default: db } = await import("@/config/db.config");

    const shipments = await db.shipmozoShipment.findMany({
      where: {
        subOrder: {
          sellerId
        }
      },
      include: {
        subOrder: {
          select: {
            subOrderNumber: true,
            status: true,
            masterOrder: {
              select: {
                customer: {
                  select: {
                    fullName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, { shipments }, "Seller shipments retrieved")
      );
  }
);

/**
 * Get all shipments for customer
 * GET /api/shipments/customer
 */
export const getCustomerShipments = asyncHandler(
  async (req: Request, res: Response) => {
    const customerId = (req as any).user?.id;

    if (!customerId) {
      throw new ApiError(401, "Customer not authenticated");
    }

    // Query shipments for customer's orders
    const { default: db } = await import("@/config/db.config");

    const shipments = await db.shipmozoShipment.findMany({
      where: {
        subOrder: {
          masterOrder: {
            customerId
          }
        }
      },
      include: {
        subOrder: {
          select: {
            subOrderNumber: true,
            status: true,
            seller: {
              select: {
                businessName: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, { shipments }, "Customer shipments retrieved")
      );
  }
);

/**
 * Helper: Verify Shipmozo webhook signature
 */
function verifyShipmozoSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}
