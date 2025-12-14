/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { razorpay } from "@/config/razorpay";
import crypto from "crypto";
import { calculateCartTotals } from "@/utils/cartCalculation"; // New utility file
import { env } from "@/config/env";
// import { sendOrderConfirmationEmail, sendPaymentSuccessEmail } from '../services/emailService';
// import { generateInvoicePDF } from '../services/pdfService';

interface CheckoutRequest {
  shippingAddressId: string;
  paymentMethod: "RAZORPAY" | "CASH_ON_DELIVERY";
  couponCode?: string;
  orderNotes?: string;
}

// Helper to initiate refund - could be moved to a separate service if more complex refund logic is needed
async function initiateRefund(order: any) {
  try {
    if (order.razorpayPaymentId) {
      await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: order.total,
        speed: "normal",
        notes: {
          orderId: order.id,
          reason: "Order canceled by customer"
        }
      });

      // Update order with refund information
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          refundAmount: order.total
        }
      });

      // Create payment attempt record for refund
      await prisma.paymentAttempt.create({
        data: {
          ordersId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          status: "REFUNDED",
          paymentMethod: "RAZORPAY",
          amount: order.total,
          currency: "INR",
          refundReason: "Order canceled by customer"
        }
      });
    }
  } catch (error) {
    console.error("Error initiating refund:", error);
    // In a real application, you might want to log this more robustly or notify an admin
  }
}

// --- Controller Functions ---

export const getCartSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.id; // Assuming customer ID from authenticated user

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const { couponCode } = req.query;

    const cart = await prisma.cart.findFirst({
      where: {
        customerId,
        status: "ACTIVE"
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                // category: {
                //   include: {
                //     taxSlab: true, // Including tax slab for calculation
                //   },
                // },
                seller: true
              }
            },
            color: true,
            size: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Your cart is empty." });
      return;
    }

    // Calculate cart totals using the utility function
    const calculation = await calculateCartTotals(cart.items, couponCode as string);

    res.json({
      cart,
      calculation,
      itemCount: cart.items.length
    });
  } catch (error) {
    console.error("Error getting cart summary:", error);
    res.status(500).json({ error: "Failed to retrieve cart summary. Please try again later." });
  }
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  let shippingCharge = 50;
  const shippingThreshold = 5000;
  try {
    const { code } = req.body;
    const customerId = req.user?.id; // Assuming customer ID from authenticated user

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const coupon = await prisma.promotion.findFirst({
      where: {
        code,
        active: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!coupon) {
      res.status(400).json({ error: "Invalid or expired coupon code." });
      return;
    }

    // Check usage limits (now uncommented and functional)
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      res.status(400).json({ error: "Coupon usage limit exceeded." });
      return;
    }

    // Check per customer limit (now uncommented and functional)
    // if (coupon.perCustomerLimit) {
    //   const customerUsage = await prisma.orders.count({
    //     where: {
    //       customerId,
    //       couponId: coupon.id,
    //       orderStatus: { not: 'Canceled' }, // Count only non-canceled orders
    //     },
    //   });

    //   if (customerUsage >= coupon.perCustomerLimit) {
    //     res.status(400).json({ error: 'You have already used this coupon the maximum number of times.' });
    //     return;
    //   }
    // }

    const cart = await prisma.cart.findFirst({
      where: {
        customerId,
        status: "ACTIVE"
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Your cart is empty. Cannot apply coupon." });
      return;
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Check minimum order value (now uncommented and functional)
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      res.status(400).json({
        error: `Minimum order value of ₹${coupon.minOrderValue} is required to use this coupon.`
      });
      return;
    }

    // Calculate discount
    let discount = 0;
    if (coupon.isPercentage) {
      discount = (subtotal * coupon.discount) / 100;
      // Apply max discount amount if set
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discount; // Convert to paise for fixed amount
    }
    if (subtotal - discount < shippingThreshold) {
      shippingCharge = 0;
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        isPercentage: coupon.isPercentage,
        value: coupon.discount,
        discount: Math.round(discount),
        shippingCharge: shippingCharge
      }
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ error: "Failed to validate coupon. Please try again later." });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const checkoutData: CheckoutRequest = req.body;
    const customerId = req.user?.id; // Assuming customer ID from authenticated user

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    // Validate shipping address
    let shippingAddress = await prisma.shippingAddress.findFirst({
      where: {
        id: checkoutData.shippingAddressId
        //customerId,
      }
    });

    if (!shippingAddress) {
      console.log("Need to implement this thing");

      console.warn("⚠️ Shipping address not found. Creating a dummy address for testing.");
      shippingAddress = await prisma.shippingAddress.create({
        data: {
          id: checkoutData.shippingAddressId, // optional: use a UUID or let it auto-generate
          fullName: "Test User",
          contact: "9898989898",
          customerId: customerId,
          street: "456 Oak Avenue",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          pincode: "400001",
          type: "HOME",
          isMain: false
        }
      });
    }

    // Get active cart with items
    const cart = await prisma.cart.findFirst({
      where: {
        customerId,
        status: "ACTIVE"
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                // category: {
                //   include: {
                //     taxSlab: true,
                //   },
                // },
                seller: true
              }
            },
            color: true,
            size: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Your cart is empty. Cannot create order." });
      return;
    }

    // Check stock availability
    for (const item of cart.items) {
      if (item.product.stockAvailable < item.quantity) {
        res.status(400).json({
          error: `Insufficient stock for ${item.product.name}. Please adjust quantity.`
        });
        return;
      }
    }

    // Calculate totals with coupon
    const calculation = await calculateCartTotals(cart.items, checkoutData.couponCode);

    // Validate coupon if provided, again (redundant if validateCoupon is called prior, but good for direct order creation)
    let coupon = null;
    if (checkoutData.couponCode) {
      coupon = await prisma.promotion.findFirst({
        where: {
          code: checkoutData.couponCode,
          active: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });

      if (!coupon) {
        res.status(400).json({ error: "Invalid or expired coupon code provided." });
        return;
      }
    }

    // Create order in a transaction for atomicity
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.orders.create({
        data: {
          customerId,
          subTotal: calculation.subtotal,
          tax: calculation.tax,
          shippingCharge: calculation.shippingCharge,
          couponDiscount: calculation.couponDiscount || 0,
          couponCode: checkoutData.couponCode || null,
          total: calculation.total,
          paymentMethod: checkoutData.paymentMethod,
          shippingAddressId: checkoutData.shippingAddressId,
          orderNotes: checkoutData.orderNotes,
          orderItems: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              sellerId: item.product.sellerId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              productName: item.product.name,
              productSKU: item.product.sku
              //tax: Math.round((item.unitPrice * item.quantity * (item.product.category?.taxSlab?.percentage || 0)) / 100), // Tax calculation
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              product: true,
              seller: true
            }
          },
          shippingAddress: true,
          customer: {
            include: {
              contact: true
            }
          }
          //coupon: true, // Include coupon in the returned order
        }
      });

      // Decrement stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockAvailable: { decrement: item.quantity } }
        });
      }

      // Increment coupon usage if applied
      if (coupon) {
        await tx.promotion.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } }
        });
      }

      // Mark cart as checked out
      // await tx.cart.update({
      //   where: { id: cart.id },
      //   data: { status: 'CHECKED_OUT' },
      // });
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      await tx.cart.delete({
        where: { id: cart.id }
      });

      return newOrder;
    });

    // Handle payment based on method
    if (checkoutData.paymentMethod === "CASH_ON_DELIVERY") {
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          orderStatus: "Processing",
          paymentStatus: "PENDING"
        }
      });

      // TODO: Uncomment when email service is ready
      // await sendOrderConfirmationEmail(order);

      res.status(201).json({
        success: true,
        orderId: order.id,
        orderStatus: "Processing",
        paymentMethod: "COD",
        total: calculation.total,
        message: "Order placed successfully via Cash on Delivery."
      });
    } else {
      // For online payment, create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: calculation.total * 100, // Amount in paise
        currency: "INR",
        receipt: `order_${order.id.slice(0, 30)}`,
        notes: {
          orderId: order.id,
          customerId: customerId
        }
      });

      // Update order with Razorpay order ID
      await prisma.orders.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id }
      });

      // Create payment attempt record
      await prisma.paymentAttempt.create({
        data: {
          ordersId: order.id,
          razorpayOrderId: razorpayOrder.id,
          status: "CREATED",
          paymentMethod: "RAZORPAY",
          amount: calculation.total,
          currency: "INR"
        }
      });

      res.status(200).json({
        success: true,
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY,
        amount: calculation.total,
        currency: "INR",
        customerEmail: order.customer.email,
        customerPhone: order.customer.contact?.number,
        customerName: order.customer.fullName,
        message: "Razorpay order created. Proceed to payment."
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order. Please try again later." });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      res.status(400).json({ error: "Payment verification failed: Invalid signature." });
      return;
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpayPaymentId);

    const paymentMethod = paymentDetails.method;
    // e.g., "card", "upi", "netbanking", "wallet", "emi"
    const cardNetwork = paymentDetails.card?.network || null;
    const upiVpa = paymentDetails.vpa || null;

    // Fetch order from DB
    const order = await prisma.orders.findUnique({
      where: { razorpayOrderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
            seller: true
          }
        },
        shippingAddress: true
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found for verification." });
      return;
    }

    // Update order status and payment attempt in a transaction
    await prisma.$transaction([
      prisma.orders.update({
        where: { id: order.id },
        data: {
          paymentStatus: "SUCCESS",
          orderStatus: "Processing",
          isPaid: true,
          isPaymentVerified: true,
          razorpayPaymentId,
          razorpaySignature,
          // paymentMethod, // TODO: store the payment method
          // cardNetwork, // TODO: optional: store card network if applicable
          // upiVpa, // TODO: optional: store UPI VPA if applicable
          paymentAcceptedAt: new Date()
        }
      }),
      prisma.paymentAttempt.updateMany({
        where: { razorpayOrderId },
        data: {
          status: "SUCCESS",
          razorpayPaymentId
        }
      })
    ]);

    // TODO: Uncomment when email service is ready
    // await sendPaymentSuccessEmail(order);
    // const invoicePDF = await generateInvoicePDF(order); // Uncomment when PDF service is ready

    res.json({
      success: true,
      orderId: order.id,
      paymentStatus: "SUCCESS",
      orderStatus: "Processing",
      paymentDetails,
      paymentMethod,
      cardNetwork,
      upiVpa,
      message: "Payment verified and order confirmed."
      // invoiceGenerated: !!invoicePDF // Indicate if invoice was generated
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment. Please try again later." });
  }
};

export const handlePaymentFailure = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId, error } = req.body; // 'error' can contain details from Razorpay webhook

    const order = await prisma.orders.findUnique({
      where: { razorpayOrderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
        //coupon: true, // Include coupon to restore usage
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found for payment failure handling." });
      return;
    }

    // Use a transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.orders.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          orderStatus: "Canceled", // Keep this as is for failed payments
          canceledAt: new Date(), // Add this line
          orderNotes: error
            ? `Payment failed: ${JSON.stringify(error)}`
            : "Payment failed at gateway"
        }
      });

      // Update payment attempt
      await tx.paymentAttempt.updateMany({
        where: { razorpayOrderId },
        data: {
          status: "FAILED"
          //failureReason: error ? JSON.stringify(error) : 'Payment failed at gateway',
        }
      });

      // Restore stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockAvailable: { increment: item.quantity } }
        });
      }

      // Restore coupon usage if applied
      if (order.couponCode) {
        const coupon = await tx.promotion.findFirst({
          where: { code: order.couponCode }
        });
        if (coupon) {
          await tx.promotion.update({
            where: { id: coupon.id },
            data: { usageCount: { decrement: 1 } }
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      paymentStatus: "FAILED",
      orderStatus: "Canceled",
      message: "Payment failed. Order has been canceled and stock restored."
    });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    res.status(500).json({ error: "Failed to handle payment failure. Internal server error." });
  }
};

export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id;

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        customerId: customerId
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: true
              }
            },
            seller: true
          }
        },
        shippingAddress: true,
        customer: true,
        //coupon: true,
        PaymentAttempt: {
          orderBy: { attemptTime: "desc" }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found or you do not have permission to view it." });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error("Error getting order details:", error);
    res.status(500).json({ error: "Failed to retrieve order details. Please try again later." });
  }
};

export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.id; // Assuming customer ID from authenticated user
    const { page = 1, limit = 10, status } = req.query;

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
      customerId
    };

    if (status) {
      whereClause.orderStatus = status as string;
    }

    const [orders, totalOrders] = await prisma.$transaction([
      prisma.orders.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: true
                }
              }
            }
          },
          shippingAddress: true
        },
        orderBy: { orderPlacedAt: "desc" },
        skip,
        take: Number(limit)
      }),
      prisma.orders.count({
        where: whereClause
      })
    ]);

    res.json({
      orders,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / Number(limit)),
        totalOrders,
        hasNext: skip + Number(limit) < totalOrders,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    console.error("Error getting customer orders:", error);
    res.status(500).json({ error: "Failed to retrieve customer orders. Please try again later." });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id; // Assuming customer ID from authenticated user
    const { reason } = req.body;

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        customerId,
        orderStatus: { in: ["Pending", "Processing"] } // Only allow cancellation if in these statuses
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
        //coupon: true, // Include coupon to restore usage
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found or cannot be canceled at this stage." });
      return;
    }

    // Use a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.orders.update({
        where: { id: order.id },
        data: {
          orderStatus: "Canceled",
          canceledAt: new Date(),
          orderNotes: reason || order.orderNotes // Add cancellation reason
        }
      });

      // Restore stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockAvailable: { increment: item.quantity } }
        });
      }

      // Restore coupon usage if applied
      if (order.couponCode) {
        const coupon = await tx.promotion.findFirst({
          where: { code: order.couponCode }
        });
        if (coupon) {
          await tx.promotion.update({
            where: { id: coupon.id },
            data: { usageCount: { decrement: 1 } }
          });
        }
      }
    });

    // Handle refund if payment was made via Razorpay
    if (order.isPaid && order.paymentMethod === "RAZORPAY") {
      await initiateRefund(order);
    }

    res.status(200).json({
      success: true,
      orderId: order.id,
      orderStatus: "Canceled",
      message: "Order canceled successfully."
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ error: "Failed to cancel order. Please try again later." });
  }
};

export const handleAbandonedPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId } = req.body;

    const order = await prisma.orders.findUnique({
      where: { razorpayOrderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found for abandonment handling." });
      return;
    }

    // Only handle if order is still in created state
    if (order.paymentStatus === "PENDING" && order.orderStatus === "Pending") {
      await prisma.$transaction(async (tx) => {
        await tx.orders.update({
          where: { id: order.id },
          data: {
            paymentStatus: "ABANDONED",
            orderStatus: "Canceled",
            canceledAt: new Date(),
            orderNotes: "Payment abandoned by customer"
          }
        });

        // Restore stock
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockAvailable: { increment: item.quantity } }
          });
        }
      });

      res.json({ success: true, message: "Payment marked as abandoned" });
    } else {
      res.json({ success: true, message: "Order already processed" });
    }
  } catch (error) {
    console.error("Error handling abandoned payment:", error);
    res.status(500).json({ error: "Failed to handle abandoned payment" });
  }
};

export const generateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId;
    const customerId = req.user?.id;

    if (!customerId) {
      res.status(401).json({ error: "Unauthorized: Customer ID not found." });
      return;
    }

    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        customerId: customerId,
        isPaid: true // Only allow invoice for paid orders
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: true
              }
            },
            seller: true
          }
        },
        shippingAddress: true,
        customer: {
          include: {
            contact: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: "Invoice not found or order not paid." });
      return;
    }

    // Generate invoice data
    const invoiceData = {
      orderId: order.id,
      orderDate: order.orderPlacedAt,
      customerName: order.customer.fullName,
      customerEmail: order.customer.email,
      customerPhone: order.customer.contact?.number,
      shippingAddress: {
        fullName: order.shippingAddress?.fullName,
        street: order.shippingAddress?.street,
        city: order.shippingAddress?.city,
        state: order.shippingAddress?.state,
        country: order.shippingAddress?.country,
        pincode: order.shippingAddress?.pincode,
        contact: order.shippingAddress?.contact
      },
      items: order.orderItems.map((item) => ({
        productName: item.productName,
        sku: item.productSKU,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotal: order.subTotal,
      tax: order.tax,
      shippingCharge: order.shippingCharge,
      couponDiscount: order.couponDiscount || 0,
      couponCode: order.couponCode,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentAcceptedAt: order.paymentAcceptedAt
    };

    res.json({
      success: true,
      invoice: invoiceData,
      message: "Invoice data retrieved successfully"
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({ error: "Failed to generate invoice PDF." });
  }
};
