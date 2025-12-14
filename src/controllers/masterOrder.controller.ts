// ----CTP: Master Order Controller - Shopify-level order splitting
import { Request, Response } from "express";
import prisma from "../config/db.config";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// ----CTP: Validation schema for creating order
const createOrderSchema = z.object({
  cartId: z.string().uuid("Invalid cart ID"),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    contact: z.string().min(10),
    email: z.string().email().optional(),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    pincode: z.string().min(6),
    landmark: z.string().optional(),
  }),
  billingAddressId: z.string().uuid().optional(),
  paymentMethod: z.enum(["RAZORPAY", "CASH_ON_DELIVERY", "CASHFREE"]),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * ----CTP: Create Master Order with Automatic Sub-Order Splitting
 * POST /api/customer/orders
 * 
 * Flow:
 * 1. Validate cart and calculate totals
 * 2. Apply coupon if provided
 * 3. Create OrderShippingAddress snapshot
 * 4. Create MasterOrder
 * 5. Group cart items by seller -> Create SubOrders
 * 6. Calculate commission for each SubOrder
 * 7. Generate order numbers
 */
export const createMasterOrder = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { cartId, shippingAddress, billingAddressId, paymentMethod, couponCode, notes } = validation.data;

    // ----CTP: Get cart with items
    const cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        customerId,
        status: "ACTIVE",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
                categories: {
                  include: {
                    taxSlab: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty or not found",
      });
    }

    // ----CTP: Calculate totals
    let subtotal = 0;
    cart.items.forEach(item => {
      const price = item.product.discount > 0
        ? Math.round(item.product.price * (1 - item.product.discount / 100))
        : item.product.price;
      subtotal += price * item.quantity;
    });

    let couponDiscount = 0;
    let couponCodeApplied = null;

    // ----CTP: Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          couponCode,
          isActive: true,
          startDate: { lte: new Date() },
          validity: { gte: new Date() },
        },
      });

      if (coupon) {
        // Check usage limits
        const usageCount = await prisma.couponUsage.count({
          where: { couponId: coupon.id },
        });

        const userUsageCount = await prisma.couponUsage.count({
          where: { couponId: coupon.id, customerId },
        });

        if (usageCount < coupon.couponUsageLimit && userUsageCount < coupon.userUsageLimit) {
          if (subtotal >= Number(coupon.minimumAmount)) {
            if (coupon.couponType === "PERCENTAGE") {
              couponDiscount = Math.min(
                Math.round(subtotal * (Number(coupon.value) / 100)),
                Number(coupon.maximumAmount) || Infinity
              );
            } else {
              couponDiscount = Math.min(Number(coupon.value), subtotal);
            }
            couponCodeApplied = couponCode;
          }
        }
      }
    }

    // ----CTP: Calculate tax (example: 18% GST)
    const taxRate = 0.18; // Can be fetched from category's taxSlab
    const taxableAmount = subtotal - couponDiscount;
    const taxAmount = Math.round(taxableAmount * taxRate);

    // ----CTP: Shipping (can be per seller, for now assume free)
    const shippingAmount = 0;

    const totalAmount = subtotal;
    const finalAmount = taxableAmount + taxAmount + shippingAmount;

    // ----CTP: Create shipping address snapshot
    const orderShippingAddress = await prisma.orderShippingAddress.create({
      data: shippingAddress,
    });

    // ----CTP: Generate master order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // ----CTP: Create master order
    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber,
        customerId,
        totalAmount: new Decimal(totalAmount),
        discountAmount: new Decimal(couponDiscount),
        shippingAmount: new Decimal(shippingAmount),
        taxAmount: new Decimal(taxAmount),
        finalAmount: new Decimal(finalAmount),
        paymentMethod,
        couponCode: couponCodeApplied,
        couponDiscount: new Decimal(couponDiscount),
        shippingAddressId: orderShippingAddress.id,
        billingAddressId,
        notes,
      },
    });

    // ----CTP: Group cart items by seller
    const itemsBySeller = cart.items.reduce((acc, item) => {
      const sellerId = item.product.sellerId;
      if (!acc[sellerId]) {
        acc[sellerId] = [];
      }
      acc[sellerId].push(item);
      return acc;
    }, {} as Record<string, typeof cart.items>);

    // ----CTP: Create sub-orders for each seller
    const subOrders = [];
    let subOrderIndex = 1;

    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      // Calculate sub-order totals
      let subOrderSubtotal = 0;
      items.forEach(item => {
        const price = item.product.discount > 0
          ? Math.round(item.product.price * (1 - item.product.discount / 100))
          : item.product.price;
        subOrderSubtotal += price * item.quantity;
      });

      const subOrderTax = Math.round(subOrderSubtotal * taxRate);
      const subOrderShipping = 0; // Can be calculated per seller

      // ----CTP: Calculate platform commission (example: 15%)
      const commissionRate = 0.15; // Should fetch from CommissionRule
      const platformFee = Math.round(subOrderSubtotal * commissionRate);
      const sellerAmount = subOrderSubtotal + subOrderTax + subOrderShipping - platformFee;

      // ----CTP: Generate sub-order number
      const subOrderNumber = `${orderNumber}-S${subOrderIndex}`;

      // ----CTP: Create sub-order
      const subOrder = await prisma.subOrder.create({
        data: {
          subOrderNumber,
          masterOrderId: masterOrder.id,
          sellerId,
          subtotal: new Decimal(subOrderSubtotal),
          shippingFee: new Decimal(subOrderShipping),
          taxAmount: new Decimal(subOrderTax),
          platformFee: new Decimal(platformFee),
          sellerAmount: new Decimal(sellerAmount),
        },
      });

      // ----CTP: Create sub-order items (need to use variants in future)
      for (const item of items) {
        const itemPrice = item.product.discount > 0
          ? Math.round(item.product.price * (1 - item.product.discount / 100))
          : item.product.price;

        const itemDiscount = item.product.discount > 0
          ? item.product.price - itemPrice
          : 0;

        const itemTax = Math.round(itemPrice * item.quantity * taxRate);
        const itemTotal = itemPrice * item.quantity;

        // Note: In future, this should use variantId instead of creating a variant on the fly
        // For now, we'll create a basic variant for backward compatibility
        const basicVariant = await prisma.productVariant.create({
          data: {
            productId: item.product.id,
            sku: item.product.sku + `-V${Date.now()}`,
            price: item.product.price,
            inventory: 0,
          },
        });

        await prisma.subOrderItem.create({
          data: {
            subOrderId: subOrder.id,
            variantId: basicVariant.id,
            quantity: item.quantity,
            price: new Decimal(itemPrice),
            discount: new Decimal(itemDiscount),
            taxAmount: new Decimal(itemTax),
            total: new Decimal(itemTotal),
          },
        });
      }

      subOrders.push(subOrder);
      subOrderIndex++;
    }

    // ----CTP: Mark cart as checked out
    await prisma.cart.update({
      where: { id: cartId },
      data: { status: "CHECKED_OUT" },
    });

    // ----CTP: Create coupon usage record
    if (couponCodeApplied) {
      const coupon = await prisma.coupon.findFirst({
        where: { couponCode: couponCodeApplied },
      });
      if (coupon) {
        // Note: CouponUsage requires orderId (old Orders model), need to adapt
        // For now, skip or create a placeholder
      }
    }

    // ----CTP: Fetch created order with relations
    const createdOrder = await prisma.masterOrder.findUnique({
      where: { id: masterOrder.id },
      include: {
        shippingAddress: true,
        subOrders: {
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        images: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Order created successfully. Split into ${subOrders.length} sub-orders`,
      data: createdOrder,
    });
  } catch (error: any) {
    console.error("Create master order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get Customer's Master Orders
 * GET /api/customer/orders
 */
export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await prisma.masterOrder.findMany({
      where: { customerId },
      include: {
        shippingAddress: true,
        subOrders: {
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                email: true,
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.masterOrder.count({
      where: { customerId },
    });

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
    console.error("Get customer orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get Single Master Order Details
 * GET /api/customer/orders/:orderId
 */
export const getMasterOrderDetails = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    const { orderId } = req.params;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await prisma.masterOrder.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        shippingAddress: true,
        billingAddress: true,
        subOrders: {
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                email: true,
                contact: true,
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
          },
        },
        paymentAttempts: true,
        invoices: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order details",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Cancel Master Order (if not yet fulfilled)
 * POST /api/customer/orders/:orderId/cancel
 */
export const cancelMasterOrder = async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user?.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const order = await prisma.masterOrder.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        subOrders: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ----CTP: Check if order can be cancelled
    if (order.status === "DELIVERED" || order.status === "SHIPPED") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled after shipping",
      });
    }

    // ----CTP: Update master order status
    await prisma.masterOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        notes: `Cancelled by customer. Reason: ${reason || "No reason provided"}`,
      },
    });

    // ----CTP: Cancel all sub-orders
    await prisma.subOrder.updateMany({
      where: { masterOrderId: orderId },
      data: { status: "CANCELLED" },
    });

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

