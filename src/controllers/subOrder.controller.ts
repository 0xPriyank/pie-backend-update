// ----CTP: Sub-Order Controller - Seller Dashboard Order Management
import { Request, Response } from "express";
import prisma from "../config/db.config";
import { z } from "zod";

/**
 * ----CTP: Get Seller's Sub-Orders (RBAC: Seller sees only their orders)
 * GET /api/seller/orders
 */
export const getSellerOrders = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = { sellerId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.subOrder.findMany({
      where,
      include: {
        masterOrder: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            shippingAddress: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: true,
                  },
                },
                optionValues: {
                  include: {
                    option: true,
                  },
                },
                image: true,
              },
            },
          },
        },
        shipment: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.subOrder.count({ where });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Get seller orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get Single Sub-Order Details
 * GET /api/seller/orders/:subOrderId
 */
export const getSubOrderDetails = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { subOrderId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await prisma.subOrder.findFirst({
      where: {
        id: subOrderId,
        sellerId,
      },
      include: {
        masterOrder: {
          include: {
            customer: true,
            shippingAddress: true,
            billingAddress: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                product: true,
                image: true,
                optionValues: {
                  include: {
                    option: true,
                  },
                },
              },
            },
          },
        },
        shipment: true,
        invoice: true,
        returns: {
          include: {
            items: true,
            refund: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Get sub-order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order details",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Update Sub-Order Status
 * PATCH /api/seller/orders/:subOrderId/status
 * 
 * Status flow: PENDING -> CONFIRMED -> PROCESSING -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
 */
export const updateSubOrderStatus = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { subOrderId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const statusSchema = z.object({
      status: z.enum([
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ]),
      notes: z.string().optional(),
    });

    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { status, notes } = validation.data;

    // ----CTP: Verify order ownership
    const order = await prisma.subOrder.findFirst({
      where: {
        id: subOrderId,
        sellerId,
      },
      include: {
        masterOrder: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or unauthorized",
      });
    }

    // ----CTP: Update sub-order status
    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        status,
        ...(notes && { notes: `${order.notes || ""}\n${new Date().toISOString()}: ${notes}` }),
      },
    });

    // ----CTP: Update master order status based on sub-orders
    const allSubOrders = await prisma.subOrder.findMany({
      where: { masterOrderId: order.masterOrderId },
    });

    let masterStatus = "PENDING";
    const allDelivered = allSubOrders.every(so => so.status === "DELIVERED");
    const anyDelivered = allSubOrders.some(so => so.status === "DELIVERED");
    const allShipped = allSubOrders.every(so => so.status === "SHIPPED" || so.status === "OUT_FOR_DELIVERY" || so.status === "DELIVERED");
    const anyShipped = allSubOrders.some(so => so.status === "SHIPPED" || so.status === "OUT_FOR_DELIVERY" || so.status === "DELIVERED");

    if (allDelivered) {
      masterStatus = "DELIVERED";
    } else if (anyDelivered) {
      masterStatus = "PARTIALLY_DELIVERED";
    } else if (allShipped) {
      masterStatus = "SHIPPED";
    } else if (anyShipped) {
      masterStatus = "PARTIALLY_SHIPPED";
    } else if (allSubOrders.every(so => so.status === "CANCELLED")) {
      masterStatus = "CANCELLED";
    }

    await prisma.masterOrder.update({
      where: { id: order.masterOrderId },
      data: { status: masterStatus as any },
    });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Add Tracking Information
 * PATCH /api/seller/orders/:subOrderId/tracking
 */
export const addTrackingInfo = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { subOrderId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const trackingSchema = z.object({
      trackingNumber: z.string().min(1, "Tracking number is required"),
      trackingUrl: z.string().url().optional(),
      courierName: z.string().optional(),
    });

    const validation = trackingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { trackingNumber, trackingUrl, courierName } = validation.data;

    // ----CTP: Verify order ownership
    const order = await prisma.subOrder.findFirst({
      where: {
        id: subOrderId,
        sellerId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or unauthorized",
      });
    }

    // ----CTP: Update tracking info
    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        trackingNumber,
        trackingUrl,
        // Update shipment if exists
        ...(order.id && {
          shipment: {
            upsert: {
              create: {
                trackingNumber,
                trackingUrl,
                courierName,
                status: "IN_TRANSIT",
              },
              update: {
                trackingNumber,
                trackingUrl,
                courierName,
              },
            },
          },
        }),
      },
      include: {
        shipment: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Tracking information added successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Add tracking info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add tracking information",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get Seller Dashboard Statistics
 * GET /api/seller/orders/stats
 */
export const getSellerOrderStats = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ----CTP: Count orders by status
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
      totalPlatformFees,
    ] = await Promise.all([
      prisma.subOrder.count({ where: { sellerId } }),
      prisma.subOrder.count({ where: { sellerId, status: "PENDING" } }),
      prisma.subOrder.count({
        where: {
          sellerId,
          status: { in: ["CONFIRMED", "PROCESSING", "PACKED"] },
        },
      }),
      prisma.subOrder.count({
        where: {
          sellerId,
          status: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] },
        },
      }),
      prisma.subOrder.count({ where: { sellerId, status: "DELIVERED" } }),
      prisma.subOrder.aggregate({
        where: { sellerId, status: "DELIVERED" },
        _sum: { sellerAmount: true },
      }),
      prisma.subOrder.aggregate({
        where: { sellerId, status: "DELIVERED" },
        _sum: { platformFee: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        totalRevenue: totalRevenue._sum.sellerAmount?.toString() || "0",
        totalPlatformFees: totalPlatformFees._sum.platformFee?.toString() || "0",
      },
    });
  } catch (error: any) {
    console.error("Get seller stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get seller statistics",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Accept Order (Seller confirms order)
 * POST /api/seller/orders/:subOrderId/accept
 */
export const acceptOrder = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { subOrderId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await prisma.subOrder.findFirst({
      where: {
        id: subOrderId,
        sellerId,
        status: "PENDING",
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or cannot be accepted",
      });
    }

    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        status: "CONFIRMED",
        notes: `${order.notes || ""}\n${new Date().toISOString()}: Order accepted by seller`,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Accept order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept order",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Reject Order (Seller cancels order)
 * POST /api/seller/orders/:subOrderId/reject
 */
export const rejectOrder = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { subOrderId } = req.params;
    const { reason } = req.body;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await prisma.subOrder.findFirst({
      where: {
        id: subOrderId,
        sellerId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or cannot be rejected",
      });
    }

    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        status: "CANCELLED",
        notes: `${order.notes || ""}\n${new Date().toISOString()}: Order rejected by seller. Reason: ${reason || "No reason provided"}`,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order rejected successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Reject order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject order",
      error: error.message,
    });
  }
};

