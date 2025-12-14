import { Prisma } from "@prisma/client";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// Common order select for consistent data structure
export const commonOrderSelect = Prisma.validator<Prisma.OrdersSelect>()({
  id: true,
  customerId: true,
  subTotal: true,
  shippingCharge: true,
  tax: true,
  couponDiscount: true,
  couponCode: true,
  total: true,
  paidAmount: true,
  refundAmount: true,
  orderStatus: true,
  paymentStatus: true,
  paymentMethod: true,
  isPaid: true,
  orderPlacedAt: true,
  paymentAcceptedAt: true,
  deliveredToCourierAt: true,
  beingDelivered: true,
  delivered: true,
  canceledAt: true,
  orderNotes: true,
  currencyCode: true,
  isGift: true,
  updatedAt: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  razorpaySignature: true,
  isPaymentVerified: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      email: true,
      contact: {
        select: {
          number: true
        }
      }
    }
  },
  shippingAddress: {
    select: {
      id: true,
      fullName: true,
      contact: true,
      street: true,
      city: true,
      state: true,
      country: true,
      pincode: true
    }
  },
  orderItems: {
    select: {
      id: true,
      productId: true,
      sellerId: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      discountAmount: true,
      tax: true,
      productName: true,
      productSKU: true,
      options: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          images: {
            select: {
              id: true,
              src: true,
              objectKey: true,
              isMain: true
            }
          }
        }
      }
    }
  },
  PaymentAttempt: {
    select: {
      id: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      status: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      attemptTime: true,
      refundReason: true
    },
    orderBy: {
      attemptTime: "desc"
    }
  }
});

export type OrderWithRelations = Prisma.OrdersGetPayload<{
  select: typeof commonOrderSelect;
}>;

/**
 * Get all orders for a specific seller with pagination and filtering
 */
export async function getSellerOrders(
  sellerId: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: Prisma.OrdersWhereInput = {
    orderItems: {
      some: {
        sellerId: sellerId
      }
    }
  };

  if (filters?.orderStatus) {
    whereClause.orderStatus = filters.orderStatus;
  }

  if (filters?.paymentStatus) {
    whereClause.paymentStatus = filters.paymentStatus;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    whereClause.orderPlacedAt = {};
    if (filters.dateFrom) {
      whereClause.orderPlacedAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      whereClause.orderPlacedAt.lte = filters.dateTo;
    }
  }

  const orders = await prisma.orders.findMany({
    where: whereClause,
    select: commonOrderSelect,
    skip,
    take: limit,
    orderBy: { orderPlacedAt: "desc" }
  });

  const totalOrders = await prisma.orders.count({
    where: whereClause
  });

  return {
    orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      pageSize: limit
    }
  };
}

/**
 * Get a specific order by ID for a seller
 */
export async function getSellerOrderById(orderId: string, sellerId: string) {
  const order = await prisma.orders.findFirst({
    where: {
      id: orderId,
      orderItems: {
        some: {
          sellerId: sellerId
        }
      }
    },
    select: commonOrderSelect
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Transform order to include seller-specific information
  return {
    ...order,
    sellerSubTotal: order.orderItems
      .filter((item) => item.sellerId === sellerId)
      .reduce((sum, item) => sum + item.totalPrice, 0),
    sellerItems: order.orderItems.filter((item) => item.sellerId === sellerId)
  };
}

/**
 * Update order status for a seller
 */
export async function updateOrderStatus(
  orderId: string,
  sellerId: string,
  newStatus: OrderStatus,
  additionalData?: {
    deliveredToCourierAt?: Date;
    beingDelivered?: Date;
    delivered?: Date;
    canceledAt?: Date;
    orderNotes?: string;
  }
) {
  // Check if order exists and has items from this seller
  const order = await prisma.orders.findFirst({
    where: {
      id: orderId,
      orderItems: {
        some: {
          sellerId: sellerId
        }
      }
    },
    include: {
      orderItems: {
        where: {
          sellerId: sellerId
        }
      }
    }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Validate status transition
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    Pending: ["Processing", "Canceled"],
    Processing: ["Shipped", "Canceled"],
    Shipped: ["Delivered", "Returned"],
    Delivered: ["Returned"],
    Canceled: [],
    Returned: []
  };

  const currentStatus = order.orderStatus;
  const allowedTransitions = validTransitions[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  // Prepare update data
  const updateData: Prisma.OrdersUpdateInput = {
    orderStatus: newStatus
  };

  // Add timestamp based on status
  if (newStatus === "Shipped" && additionalData?.deliveredToCourierAt) {
    updateData.deliveredToCourierAt = additionalData.deliveredToCourierAt;
  }
  if (newStatus === "Delivered" && additionalData?.delivered) {
    updateData.delivered = additionalData.delivered;
  }
  if (newStatus === "Canceled" && additionalData?.canceledAt) {
    updateData.canceledAt = additionalData.canceledAt;
  }
  if (additionalData?.orderNotes) {
    updateData.orderNotes = additionalData.orderNotes;
  }

  const updatedOrder = await prisma.orders.update({
    where: { id: orderId },
    data: updateData,
    select: commonOrderSelect
  });

  return {
    ...updatedOrder,
    sellerSubTotal: updatedOrder.orderItems
      .filter((item) => item.sellerId === sellerId)
      .reduce((sum, item) => sum + item.totalPrice, 0),
    sellerItems: updatedOrder.orderItems.filter((item) => item.sellerId === sellerId)
  };
}

/**
 * Delete an order (only if it's in a cancellable state)
 */
export async function deleteOrder(orderId: string, sellerId: string) {
  const order = await prisma.orders.findFirst({
    where: {
      id: orderId,
      orderItems: {
        some: {
          sellerId: sellerId
        }
      }
    }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Only allow deletion of orders in certain statuses
  const deletableStatuses = ["Pending", "Canceled"];
  if (!deletableStatuses.includes(order.orderStatus)) {
    throw new ApiError(400, `Cannot delete order with status: ${order.orderStatus}`);
  }

  // Check if order has payments
  const paymentAttempts = await prisma.paymentAttempt.count({
    where: { ordersId: orderId }
  });

  if (paymentAttempts > 0) {
    throw new ApiError(400, "Cannot delete order with payment history");
  }

  // Delete order items for this seller
  await prisma.orderItems.deleteMany({
    where: {
      ordersId: orderId,
      sellerId: sellerId
    }
  });

  // Check if this was the last seller in the order
  const remainingItems = await prisma.orderItems.count({
    where: { ordersId: orderId }
  });

  // If no items left, delete the entire order
  if (remainingItems === 0) {
    await prisma.orders.delete({
      where: { id: orderId }
    });
  }

  return { message: "Order deleted successfully" };
}

/**
 * Get order statistics for a seller
 */
export async function getSellerOrderStats(
  sellerId: string,
  dateRange?: {
    from: Date;
    to: Date;
  }
) {
  const whereClause: Prisma.OrdersWhereInput = {
    orderItems: {
      some: {
        sellerId: sellerId
      }
    }
  };

  if (dateRange) {
    whereClause.orderPlacedAt = {
      gte: dateRange.from,
      lte: dateRange.to
    };
  }

  const orders = await prisma.orders.findMany({
    where: whereClause,
    include: {
      orderItems: {
        where: {
          sellerId: sellerId
        }
      }
    }
  });

  const stats = {
    totalOrders: orders.length,
    totalRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    canceledOrders: 0,
    returnedOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0
  };

  orders.forEach((order) => {
    const sellerItems = order.orderItems.filter((item) => item.sellerId === sellerId);
    const sellerTotal = sellerItems.reduce((sum, item) => sum + item.totalPrice, 0);

    stats.totalRevenue += sellerTotal;

    // Count by order status
    switch (order.orderStatus) {
      case "Pending":
        stats.pendingOrders++;
        break;
      case "Processing":
        stats.processingOrders++;
        break;
      case "Shipped":
        stats.shippedOrders++;
        break;
      case "Delivered":
        stats.deliveredOrders++;
        break;
      case "Canceled":
        stats.canceledOrders++;
        break;
      case "Returned":
        stats.returnedOrders++;
        break;
    }

    // Count by payment status
    if (order.isPaid) {
      stats.paidOrders++;
    } else {
      stats.unpaidOrders++;
    }
  });

  return stats;
}

/**
 * Get recent orders for a seller
 */
export async function getSellerRecentOrders(sellerId: string, limit: number = 5) {
  const orders = await prisma.orders.findMany({
    where: {
      orderItems: {
        some: {
          sellerId: sellerId
        }
      }
    },
    select: commonOrderSelect,
    orderBy: { orderPlacedAt: "desc" },
    take: limit
  });

  return orders.map((order) => ({
    ...order,
    sellerSubTotal: order.orderItems
      .filter((item) => item.sellerId === sellerId)
      .reduce((sum, item) => sum + item.totalPrice, 0),
    sellerItems: order.orderItems.filter((item) => item.sellerId === sellerId)
  }));
}
