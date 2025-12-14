import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import {
  createCouponSchema,
  updateCouponSchema,
  bulkImportCouponSchema
} from "@/schemas/coupon.schema";
import {
  createSellerCoupon,
  getCouponsBySeller,
  getCouponById,
  updateSellerCoupon,
  deleteSellerCoupon,
  getCouponAnalytics,
  bulkImportCoupons
} from "@/services/seller/coupon.service";

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const sellerID = req.user?.id;
  if (!sellerID) {
    throw new ApiError(401, "Unauthorized");
  }

  const validationResult = createCouponSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(
      400,
      "Invalid address data provided",
      validationResult.error.errors as never
    );
  }

  try {
    const result = await createSellerCoupon(sellerID, validationResult.data);
    res.status(200).json({ coupon: result });
  } catch (error) {
    throw new ApiError(500, "Error creating coupon", error as never);
  }
});

export const getSellerCoupons = asyncHandler(async (req: Request, res: Response) => {
  const sellerID = req.user?.id;
  if (!sellerID) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const coupons = await getCouponsBySeller(sellerID);
    res.status(200).json({ coupons: coupons });
  } catch (error) {
    throw new ApiError(500, "Error getting seller coupons", error as never);
  }
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const sellerID = req.user?.id;
  const { couponId } = req.params;

  if (!sellerID) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const coupon = await getCouponById(couponId, sellerID);
    if (!coupon) {
      throw new ApiError(404, "Coupon not found or you do not have permission to view it.");
    }
    res.status(200).json({ coupon: coupon });
  } catch (error) {
    throw new ApiError(500, "Error getting coupon", error as never);
  }
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const sellerID = req.user?.id;
  const { couponId } = req.params;

  if (!sellerID) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!couponId) {
    throw new ApiError(400, "Coupon Id not provided");
  }

  const validationResult = updateCouponSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(400, "Invalid coupon data provided", validationResult.error as never);
  }

  try {
    const updatedCoupon = await updateSellerCoupon(couponId, sellerID, validationResult.data);

    if (!updatedCoupon) {
      throw new ApiError(404, "Coupon not found or you do not have permission to update it.");
    }
    res.status(200).json({ updatedCoupon: updatedCoupon });
  } catch (error) {
    throw new ApiError(500, "Error updating the coupon", error as never);
  }
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const sellerID = req.user?.id;
  const { couponId } = req.params;

  if (!sellerID) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!couponId) {
    throw new ApiError(400, "Coupon Id not provided");
  }

  try {
    const deleteCoupon = await deleteSellerCoupon(couponId, sellerID);
    res.status(200).json({ deleteCoupon: deleteCoupon });
  } catch (error) {
    throw new ApiError(500, "Internal Error", error as never);
  }
});

export const couponAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  const { couponId } = req.params;

  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!couponId) {
    throw new ApiError(400, "Coupon Id not provided");
  }

  try {
    const analytics = await getCouponAnalytics(couponId, sellerId);
    res.status(200).json({ analytics: analytics });
  } catch (error) {
    throw new ApiError(500, "Server Error", error as never);
  }
});

export const bulkCouponCreate = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  const validationResult = bulkImportCouponSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(
      400,
      "Invalid data provided. Please provide an array of coupon objects.",
      validationResult.error as never
    );
  }
  try {
    const result = await bulkImportCoupons(sellerId, validationResult.data);
    res.status(201).json({ result });
  } catch (error) {
    throw new ApiError(500, "Server Error", error as never);
  }
});
