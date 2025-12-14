import prisma from "@/config/db.config";
import { couponInput, updateCouponInput } from "@/schemas/coupon.schema";
import { bulkCouponInput } from "@/schemas/coupon.schema";

export async function createSellerCoupon(id: string, data: couponInput) {
  const {
    couponCode,
    name,
    isActive,
    couponType,
    value,
    startDate,
    validity,
    minimumAmount,
    maximumAmount,
    specificCustomerEmail,
    productApplicable,
    couponUsageLimit,
    userUsageLimit
  } = data;
  const coupon = await prisma.coupon.create({
    data: {
      couponCode: couponCode,
      name: name,
      isActive: isActive,
      couponType: couponType,
      value: value,
      startDate: startDate,
      validity: validity,
      minimumAmount: minimumAmount,
      maximumAmount: maximumAmount,
      specificCustomerEmail: specificCustomerEmail,
      productApplicable: productApplicable,
      couponUsageLimit: couponUsageLimit,
      userUsageLimit: userUsageLimit,
      sellerId: id
    }
  });
  return coupon;
}

export async function getCouponsBySeller(sellerId: string) {
  return await prisma.coupon.findMany({
    where: { sellerId },
    orderBy: { startDate: "desc" }
  });
}

export async function getCouponById(couponId: string, sellerId: string) {
  return await prisma.coupon.findFirst({
    where: { id: couponId, sellerId }
  });
}
export async function updateSellerCoupon(
  couponId: string,
  sellerId: string,
  data: updateCouponInput
) {
  const existingCoupon = await prisma.coupon.findFirst({
    where: { id: couponId, sellerId }
  });

  if (!existingCoupon) {
    return null;
  }
  const updatedCoupon = await prisma.coupon.update({
    where: { id: couponId },
    data
  });

  return updatedCoupon;
}

export async function deleteSellerCoupon(couponId: string, sellerId: string) {
  const existingCoupon = await prisma.coupon.findFirst({
    where: { id: couponId, sellerId }
  });

  if (!existingCoupon) {
    return null;
  }

  const deactivatedCoupon = await prisma.coupon.update({
    where: { id: couponId, sellerId: sellerId },
    data: { isActive: false }
  });

  return deactivatedCoupon;
}

export async function getCouponAnalytics(couponId: string, sellerId: string) {
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, sellerId },
    select: { id: true }
  });

  if (!coupon) {
    return null;
  }

  const [usageCount, aggregateResults, uniqueCustomers] = await prisma.$transaction([
    prisma.couponUsage.count({
      where: { couponId }
    }),

    prisma.orders.aggregate({
      _sum: {
        couponDiscount: true,
        total: true
      },
      where: {
        couponUsage: {
          couponId: couponId
        }
      }
    }),

    prisma.couponUsage.findMany({
      where: { couponId },
      distinct: ["customerId"],
      select: { customerId: true }
    })
  ]);

  return {
    couponId,
    timesUsed: usageCount,
    uniqueCustomersReached: uniqueCustomers,
    totalDiscountGiven: aggregateResults._sum.couponDiscount || 0,
    totalRevenueGenerated: aggregateResults._sum.total || 0
  };
}

export async function bulkImportCoupons(sellerId: string, data: bulkCouponInput) {
  const couponsToCreate = data.map((coupon) => ({
    ...coupon,
    sellerId: sellerId
  }));

  const result = await prisma.coupon.createMany({
    data: couponsToCreate,
    skipDuplicates: true
  });
  return result;
}
