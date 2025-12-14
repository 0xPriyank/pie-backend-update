import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * ====================================================================
 * Phase 5: Payment Service
 * ====================================================================
 * Handles payment-related operations and order status updates
 */

interface PaymentDetails {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  errorCode?: string;
  errorDescription?: string;
  paidAt?: Date;
}

interface OrderUpdateResult {
  masterOrder: any;
  subOrders: any[];
  paymentAttempt?: any;
}

/**
 * ----CTP: Find Master Order by Gateway Order ID
 */
export async function findOrderByGatewayOrderId(
  gatewayOrderId: string
): Promise<any> {
  try {
    // Try finding via PaymentAttempt
    const paymentAttempt = await prisma.paymentAttempt.findFirst({
      where: {
        razorpayOrderId: gatewayOrderId,
      },
      include: {
        masterOrder: {
          include: {
            subOrders: {
              include: {
                seller: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                  },
                },
                items: {
                  include: {
                    variant: {
                      include: {
                        product: true,
                      },
                    },
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (paymentAttempt?.masterOrder) {
      return {
        masterOrder: paymentAttempt.masterOrder,
        paymentAttempt,
      };
    }

    // Fallback: Try finding by order notes (if gateway order ID is stored there)
    const masterOrder = await prisma.masterOrder.findFirst({
      where: {
        notes: {
          contains: gatewayOrderId,
        },
      },
      include: {
        subOrders: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    return { masterOrder, paymentAttempt: null };
  } catch (error) {
    console.error("Error finding order by gateway order ID:", error);
    throw new ApiError(500, "Failed to find order");
  }
}

/**
 * ----CTP: Update Order Status After Successful Payment
 */
export async function updateOrderStatusOnPaymentSuccess(
  paymentDetails: PaymentDetails
): Promise<OrderUpdateResult> {
  try {
    const { masterOrder, paymentAttempt } = await findOrderByGatewayOrderId(
      paymentDetails.gatewayOrderId || paymentDetails.orderId
    );

    if (!masterOrder) {
      throw new ApiError(404, `Order not found for payment ${paymentDetails.paymentId}`);
    }

    // Validate payment amount matches order amount
    const orderAmount = Number(masterOrder.finalAmount);
    const paidAmount = paymentDetails.amount / 100; // Convert paisa to rupees

    if (Math.abs(orderAmount - paidAmount) > 0.01) {
      console.error(
        `Payment amount mismatch: Order ${masterOrder.orderNumber} expects ${orderAmount}, got ${paidAmount}`
      );
      throw new ApiError(
        400,
        `Payment amount mismatch: Expected ${orderAmount}, got ${paidAmount}`
      );
    }

    // Update master order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Master Order
      const updatedMasterOrder = await tx.masterOrder.update({
        where: { id: masterOrder.id },
        data: {
          paymentStatus: "SUCCESS",
          status: "PAID",
          paymentMethod: getPaymentMethod(paymentDetails.method),
          updatedAt: new Date(),
        },
      });

      // 2. Update Sub-Orders
      const updatedSubOrders = await Promise.all(
        masterOrder.subOrders.map(async (subOrder: any) => {
          return await tx.subOrder.update({
            where: { id: subOrder.id },
            data: {
              paymentStatus: "SUCCESS",
              status: "CONFIRMED",
              updatedAt: new Date(),
            },
          });
        })
      );

      // 3. Update Payment Attempt if exists
      let updatedPaymentAttempt = null;
      if (paymentAttempt) {
        updatedPaymentAttempt = await tx.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: {
            status: "SUCCESS",
            razorpayPaymentId: paymentDetails.gatewayPaymentId,
            attemptTime: paymentDetails.paidAt || new Date(),
          },
        });
      }

      // 4. Reduce inventory for ordered items
      for (const subOrder of masterOrder.subOrders) {
        for (const item of subOrder.items) {
          if (item.variant) {
            await tx.productVariant.update({
              where: { id: item.variant.id },
              data: {
                inventory: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }
      }

      // 5. Auto-generate invoices for all SubOrders (Phase 6)
      try {
        // Import invoice service dynamically to avoid circular dependency
        const { generateInvoicesForMasterOrder } = await import("./invoice/invoice.service");
        await generateInvoicesForMasterOrder(masterOrder.id);
        console.log(`✅ Auto-generated invoices for MasterOrder ${masterOrder.id}`);
      } catch (invoiceError) {
        // Log but don't fail the payment - invoices can be regenerated later
        console.error(`⚠️ Failed to auto-generate invoices for MasterOrder ${masterOrder.id}:`, invoiceError);
      }

      // 6. Auto-create shipments for all SubOrders (Phase 7)
      try {
        const { autoCreateShipmentForSubOrder } = await import("./shipmozo.service");
        for (const subOrder of updatedSubOrders) {
          await autoCreateShipmentForSubOrder(subOrder.id);
        }
        console.log(`✅ Auto-triggered shipment creation for MasterOrder ${masterOrder.id}`);
      } catch (shipmentError) {
        // Log but don't fail the payment - shipments can be created manually later
        console.error(`⚠️ Failed to auto-create shipments for MasterOrder ${masterOrder.id}:`, shipmentError);
      }

      return {
        masterOrder: updatedMasterOrder,
        subOrders: updatedSubOrders,
        paymentAttempt: updatedPaymentAttempt,
      };
    });

    console.log(
      `✅ Payment successful: Order ${masterOrder.orderNumber} - ${paymentDetails.paymentId}`
    );

    return result;
  } catch (error) {
    console.error("Error updating order on payment success:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to update order status");
  }
}

/**
 * ----CTP: Update Order Status After Payment Failure
      for (const subOrder of masterOrder.subOrders) {
        for (const item of subOrder.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventory: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return {
        masterOrder: updatedMasterOrder,
        subOrders: updatedSubOrders,
        paymentAttempt: updatedPaymentAttempt,
      };
    });

    console.log(
      `✅ Payment successful for Order ${masterOrder.orderNumber} - Payment ID: ${paymentDetails.paymentId}`
    );

    return result;
  } catch (error) {
    console.error("Error updating order on payment success:", error);
    throw error instanceof ApiError
      ? error
      : new ApiError(500, "Failed to update order status");
  }
}

/**
 * ----CTP: Handle Failed Payment
 */
export async function updateOrderStatusOnPaymentFailure(
  paymentDetails: PaymentDetails
): Promise<void> {
  try {
    const { masterOrder, paymentAttempt } = await findOrderByGatewayOrderId(
      paymentDetails.gatewayOrderId || paymentDetails.orderId
    );

    if (!masterOrder) {
      console.warn(`Order not found for failed payment ${paymentDetails.paymentId}`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update Payment Attempt if exists
      if (paymentAttempt) {
        await tx.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: {
            status: "FAILED",
            refundReason: paymentDetails.errorDescription || "Payment failed",
          },
        });
      }

      // Log the failed payment attempt in notes
      await tx.masterOrder.update({
        where: { id: masterOrder.id },
        data: {
          notes: `${masterOrder.notes || ""}\nPayment failed at ${new Date().toISOString()}: ${
            paymentDetails.errorDescription || "Unknown error"
          }`,
          updatedAt: new Date(),
        },
      });
    });

    console.log(
      `❌ Payment failed for Order ${masterOrder.orderNumber} - Reason: ${
        paymentDetails.errorDescription || "Unknown"
      }`
    );
  } catch (error) {
    console.error("Error handling payment failure:", error);
    // Don't throw - this is a notification, not critical
  }
}

/**
 * ----CTP: Handle Payment Refund
 */
export async function processPaymentRefund(
  paymentId: string,
  orderId: string,
  refundAmount: number,
  reason?: string
): Promise<void> {
  try {
    const { masterOrder } = await findOrderByGatewayOrderId(orderId);

    if (!masterOrder) {
      throw new ApiError(404, `Order not found for refund ${paymentId}`);
    }

    await prisma.$transaction(async (tx) => {
      // Update master order status
      await tx.masterOrder.update({
        where: { id: masterOrder.id },
        data: {
          paymentStatus: "REFUNDED",
          status: "CANCELLED",
          notes: `${masterOrder.notes || ""}\nRefund processed at ${new Date().toISOString()}: ${
            reason || "Refund initiated"
          }`,
          updatedAt: new Date(),
        },
      });

      // Update all sub-orders
      await tx.subOrder.updateMany({
        where: { masterOrderId: masterOrder.id },
        data: {
          paymentStatus: "REFUNDED",
          status: "CANCELLED",
          updatedAt: new Date(),
        },
      });

      // Restore inventory
      for (const subOrder of masterOrder.subOrders) {
        for (const item of subOrder.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventory: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    });

    console.log(
      `💰 Refund processed for Order ${masterOrder.orderNumber} - Amount: ₹${refundAmount / 100}`
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error instanceof ApiError
      ? error
      : new ApiError(500, "Failed to process refund");
  }
}

/**
 * ----CTP: Helper function to map payment method string to enum
 */
function getPaymentMethod(method: string): any {
  const methodMap: Record<string, string> = {
    card: "RAZORPAY",
    netbanking: "RAZORPAY",
    upi: "RAZORPAY",
    wallet: "RAZORPAY",
    emi: "RAZORPAY",
    cardless_emi: "RAZORPAY",
    paylater: "RAZORPAY",
    CARD: "CASHFREE",
    UPI: "CASHFREE",
    NB: "CASHFREE",
    WALLET: "CASHFREE",
    cod: "CASH_ON_DELIVERY",
  };

  return methodMap[method] || "RAZORPAY";
}

/**
 * ----CTP: Get Payment Summary for Order
 */
export async function getPaymentSummary(orderId: string): Promise<any> {
  try {
    const masterOrder = await prisma.masterOrder.findUnique({
      where: { id: orderId },
      include: {
        paymentAttempts: {
          orderBy: {
            attemptTime: "desc",
          },
        },
      },
    });

    if (!masterOrder) {
      throw new ApiError(404, "Order not found");
    }

    return {
      orderNumber: masterOrder.orderNumber,
      totalAmount: masterOrder.finalAmount,
      paymentStatus: masterOrder.paymentStatus,
      paymentMethod: masterOrder.paymentMethod,
      attempts: masterOrder.paymentAttempts.length,
      lastAttempt: masterOrder.paymentAttempts[0] || null,
    };
  } catch (error) {
    console.error("Error getting payment summary:", error);
    throw error instanceof ApiError
      ? error
      : new ApiError(500, "Failed to get payment summary");
  }
}
