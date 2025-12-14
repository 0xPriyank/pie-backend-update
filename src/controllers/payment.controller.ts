import { razorpay } from "@/config/razorpay";
import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import crypto from "crypto";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { env } from "@/config/env";

export const initiatePaymentAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, paymentMethod = "RAZORPAY" } = req.body;
  const userId = req.user?.id;

  if (!orderId) {
    throw new ApiError(400, "Order ID is required");
  }

  // Validate the order exists and belongs to the user
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: {
      PaymentAttempt: true
    }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.customerId !== userId) {
    throw new ApiError(403, "You are not authorized to initiate payment for this order");
  }

  if (order.isPaid) {
    throw new ApiError(400, "Order is already paid");
  }

  // Create a new payment attempt
  const paymentAttempt = await prisma.paymentAttempt.create({
    data: {
      ordersId: orderId,
      status: "INITIATED",
      paymentMethod,
      amount: order.total,
      razorpayOrderId: "" // Required field, will update later
    }
  });

  res
    .status(201)
    .json(new ApiResponse(201, { data: paymentAttempt }, "Payment attempt initiated successfully"));
});

export const capturePayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentAttemptId } = req.body;
  const userId = req.user?.id;

  if (!paymentAttemptId) {
    throw new ApiError(400, "Payment attempt ID is required");
  }

  // Get the payment attempt with related order
  const paymentAttempt = await prisma.paymentAttempt.findUnique({
    where: { id: paymentAttemptId },
    include: { order: true }
  });

  if (!paymentAttempt) {
    throw new ApiError(404, "Payment attempt not found");
  }

  const order = paymentAttempt.order;

  if (!order) {
    throw new ApiError(404, "Order not found for this payment attempt");
  }

  if (order.customerId !== userId) {
    throw new ApiError(403, "You are not authorized to capture payment for this order");
  }

  if (order.isPaid) {
    throw new ApiError(400, "Order is already paid");
  }

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: paymentAttempt.amount,
      currency: "INR",
      receipt: order.id,
      notes: {
        customer: order.customerId,
        paymentAttemptId: paymentAttempt.id
      }
    });

    if (!razorpayOrder) {
      throw new ApiError(400, "Razorpay order creation failed");
    }

    // Update payment attempt with Razorpay order ID
    await prisma.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: {
        razorpayOrderId: razorpayOrder.id,
        status: "PROCESSING"
      }
    });

    // Update order with Razorpay order ID
    await prisma.orders.update({
      where: { id: order.id },
      data: {
        razorpayOrderId: razorpayOrder.id,
        paymentStatus: "PENDING"
      }
    });

    res.status(201).json(
      new ApiResponse(
        201,
        {
          data: {
            razorpayOrder,
            paymentAttemptId: paymentAttempt.id
          }
        },
        "Payment capture initialized successfully"
      )
    );
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    // Update payment attempt status to FAILED
    await prisma.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: { status: "FAILED" }
    });

    throw new ApiError(500, "Failed to create Razorpay order");
  }
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const razorpay_order_id = req.body?.razorpay_order_id;
  const razorpay_payment_id = req.body?.razorpay_payment_id;
  const razorpay_signature = req.body?.razorpay_signature;
  const orderId = req.body.orderId;
  const userId = req.user?.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !orderId) {
    throw new ApiError(400, "Payment verification failed - missing required fields");
  }

  const order = await prisma.orders.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.customerId !== userId) {
    throw new ApiError(403, "Unauthorized payment verification");
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_SECRET as string)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    // Update payment attempt status
    await prisma.paymentAttempt.updateMany({
      where: { ordersId: orderId },
      data: { status: "FAILED" }
    });

    throw new ApiError(400, "Payment verification failed - invalid signature");
  }

  try {
    // Update payment attempt
    await prisma.paymentAttempt.updateMany({
      where: { ordersId: orderId },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id
      }
    });

    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "SUCCESS",
        isPaid: true,
        isPaymentVerified: true,
        paymentAcceptedAt: new Date(Date.now()),
        orderStatus: "Processing"
      }
    });

    res
      .status(201)
      .json(new ApiResponse(201, { data: updatedOrder }, "Payment verified successfully"));
  } catch (error) {
    console.error("Error verifying payment:", error);
    // Update payment attempt status
    await prisma.paymentAttempt.updateMany({
      where: { ordersId: orderId },
      data: { status: "FAILED" }
    });

    throw new ApiError(500, "Failed to update order status after payment verification");
  }
});
