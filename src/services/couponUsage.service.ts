import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";

export const createCouponUsage = async (
  customerId: string,
  couponCode: string,
  orderId: string
) => {
  const coupon = await prisma.coupon.findUnique({
    where: { couponCode }
  });
  if (!coupon) {
    throw new ApiError(404, "Coupon code is not valid.");
  }
  if (!coupon.isActive) {
    throw new ApiError(400, "This coupon is no longer active.");
  }
  if (coupon.validity < new Date()) {
    throw new ApiError(400, "This coupon has expired.");
  }

  const totalUsageCount = await prisma.couponUsage.count({
    where: { couponId: coupon.id }
  });

  if (totalUsageCount >= coupon.couponUsageLimit) {
    throw new ApiError(403, "This coupon has reached its maximum usage limit.");
  }

  const userUsageCount = await prisma.couponUsage.count({
    where: {
      couponId: coupon.id,
      customerId: customerId
    }
  });

  if (userUsageCount >= coupon.userUsageLimit) {
    throw new ApiError(403, "You have already used this coupon the maximum number of times.");
  }

  const orderUsage = await prisma.couponUsage.findFirst({
    where: { orderId }
  });

  if (orderUsage) {
    throw new ApiError(409, "A coupon has already been applied to this order.");
  }

  const order = await prisma.orders.findFirst({
    where: {
      id: orderId
    }
  });

  if (!order) {
    throw new ApiError(404, "Order could not be found.");
  }

  if (order?.total < coupon.minimumAmount.toNumber()) {
    throw new ApiError(409, "Order does not meet coupon minimum criteria");
  }

  const newUsage = await prisma.couponUsage.create({
    data: {
      customerId,
      couponId: coupon.id,
      orderId
    }
  });
  return newUsage;
};
