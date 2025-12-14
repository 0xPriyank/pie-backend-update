// utils/cartCalculations.ts
import db from "@/config/db.config";

const prisma = db;

interface CartItem {
  quantity: number;
  unitPrice: number;
  productId: string;
  product: {
    name: string;
    stockAvailable: number;
    category?: {
      taxSlab?: {
        percentage: number;
      };
    };
    sellerId: string;
  };
}

interface CartCalculation {
  subtotal: number;
  tax: number;
  shippingCharge: number;
  couponDiscount: number;
  total: number;
}

export async function calculateCartTotals(
  cartItems: CartItem[],
  couponCode?: string
): Promise<CartCalculation> {
  let subtotal = 0;
  let tax = 0;
  let shippingCharge = 0;
  let couponDiscount = 0;

  // Configuration for shipping and tax (can be fetched from DB or config)
  const FREE_SHIPPING_THRESHOLD = 5000; //
  const SHIPPING_CHARGE = 50; //

  // Calculate subtotal and tax
  for (const item of cartItems) {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;

    // Calculate tax based on category tax slab
    if (item.product.category?.taxSlab) {
      tax += Math.round((itemTotal * item.product.category.taxSlab.percentage) / 100);
    }
  }

  // Calculate shipping charge
  shippingCharge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;

  // Apply coupon discount
  if (couponCode) {
    const coupon = await prisma.promotion.findFirst({
      where: {
        code: couponCode,
        active: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (coupon) {
      // Re-validate coupon usage limits and min order value if this function is called independently
      // from validateCoupon endpoint, ensures consistency.
      //   if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      //     console.warn(`Coupon ${couponCode} usage limit exceeded.`);
      //     // Don't apply discount, but don't throw an error for calculation
      //   } else if (coupon.perCustomerLimit && customerId) {
      //     const customerUsage = await prisma.orders.count({
      //       where: {
      //         customerId,
      //         couponId: coupon.id,
      //         orderStatus: { not: 'Canceled' },
      //       },
      //     });
      //     if (customerUsage >= coupon.perCustomerLimit) {
      //       console.warn(`Coupon ${couponCode} per-customer usage limit exceeded for customer ${customerId}.`);
      //     }
      //   } else if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      //     console.warn(`Coupon ${couponCode} minimum order value not met. Required: ${coupon.minOrderValue / 100}`);
      //   } else {
      // Apply discount if all checks pass
      if (coupon.isPercentage) {
        couponDiscount = Math.round((subtotal * coupon.discount) / 100);
        //   if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
        //     couponDiscount = coupon.maxDiscountAmount;
        //   }
      } else {
        couponDiscount = coupon.discount; // Convert to paise
      }
    }
    //}
  }

  const total = subtotal + tax + shippingCharge - couponDiscount;

  return {
    subtotal,
    tax,
    shippingCharge,
    couponDiscount,
    total: Math.max(0, total) // Ensure total is never negative
  };
}
