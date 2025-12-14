import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { razorpay } from "@/config/razorpay";
import { Prisma, PaymentStatus } from "@prisma/client";

interface OrderItem {
  id: string;
  productId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSKU: string;
  tax: number;
  Orders: {
    id: string;
    customer: {
      id: string;
      fullName: string;
      email: string;
    };
    paymentStatus: PaymentStatus;
    isPaid: boolean;
    paymentAcceptedAt: Date | null;
    total: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    PaymentAttempt: Array<{
      id: string;
      status: string;
      attemptTime: Date;
    }>;
  };
  product: {
    id: string;
    productName: string;
    productSKU: string;
  };
}

interface GroupedOrder {
  orderId: string;
  customer: {
    id: string;
    fullName: string;
    email: string;
  };
  paymentStatus: PaymentStatus;
  isPaid: boolean;
  paymentAcceptedAt: Date | null;
  totalAmount: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  latestPaymentAttempt: {
    id: string;
    status: string;
    attemptTime: Date;
  } | null;
  items: Array<{
    productId: string;
    productName: string;
    productSKU: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    tax: number;
  }>;
}

export const getSellerOrderPayments = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  const { startDate, endDate, status } = req.query;

  // Build the where clause for filtering
  const where: Prisma.OrderItemsWhereInput = {
    sellerId: sellerId,
    Orders: {
      ...(startDate &&
        endDate && {
          paymentAcceptedAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        }),
      ...(status && {
        paymentStatus: status as PaymentStatus
      })
    }
  };

  // Get all order items for the seller with related order and payment information
  const orderItems = (await prisma.orderItems.findMany({
    where,
    include: {
      Orders: {
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          PaymentAttempt: {
            orderBy: {
              attemptTime: "desc"
            },
            take: 1
          }
        }
      },
      product: {
        select: {
          id: true,
          name: true,
          sku: true
        }
      }
    }
  })) as unknown as OrderItem[];

  // Group order items by order
  const groupedOrders = orderItems.reduce((acc: Record<string, GroupedOrder>, item: OrderItem) => {
    const orderId = item.Orders.id;
    if (!acc[orderId]) {
      acc[orderId] = {
        orderId: orderId,
        customer: item.Orders.customer,
        paymentStatus: item.Orders.paymentStatus,
        isPaid: item.Orders.isPaid,
        paymentAcceptedAt: item.Orders.paymentAcceptedAt,
        totalAmount: item.Orders.total,
        razorpayOrderId: item.Orders.razorpayOrderId,
        razorpayPaymentId: item.Orders.razorpayPaymentId,
        latestPaymentAttempt: item.Orders.PaymentAttempt[0] || null,
        items: []
      };
    }
    acc[orderId].items.push({
      productId: item.productId,
      productName: item.productName,
      productSKU: item.productSKU,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      tax: item.tax
    });
    return acc;
  }, {});

  // Convert grouped orders to array
  const orders = Object.values(groupedOrders);

  // If razorpayOrderId exists, fetch additional payment details from Razorpay
  const ordersWithRazorpayDetails = await Promise.all(
    orders.map(async (order) => {
      if (order.razorpayOrderId) {
        try {
          const razorpayOrder = await razorpay.orders.fetch(order.razorpayOrderId);
          const razorpayPayment = order.razorpayPaymentId
            ? await razorpay.payments.fetch(order.razorpayPaymentId)
            : null;

          return {
            ...order,
            razorpayDetails: {
              order: razorpayOrder,
              payment: razorpayPayment
            }
          };
        } catch (error) {
          console.error(`Error fetching Razorpay details for order ${order.orderId}:`, error);
          return order;
        }
      }
      return order;
    })
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: ordersWithRazorpayDetails },
        "Seller orders fetched successfully"
      )
    );
});
