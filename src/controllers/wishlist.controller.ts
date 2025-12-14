import { Request, Response } from "express";
import { db } from "../config/db.config";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

//POST /wishlist/add
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body;
  const customerId = req.user?.id;

  if (!customerId) {
    throw new ApiError(401, "Unauthorized - customerId not found");
  }

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const existing = await db.wishlist.findFirst({
    where: { productId, customerId }
  });

  if (existing) {
    throw new ApiError(409, "Product already in wishlist");
  }

  await db.wishlist.create({
    data: {
      productId,
      customerId
    }
  });

  res.status(201).json({ success: true, message: "Added to wishlist" });
});

//GET /wishlist
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;

  const wishlistItems = await db.wishlist.findMany({
    where: { customerId },
    include: {
      product: {
        include: {
          images: {
            select: {
              id: true,
              objectKey: true,
              alt: true,
              isMain: true,
              src: true
            }
          }
        }
      }
    },
    orderBy: {
      addedAt: "desc"
    }
  });

  res.status(200).json({ success: true, wishlist: wishlistItems });
});

export const deleteFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const { productId } = req.params;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  const item = await db.wishlist.findFirst({
    where: {
      customerId,
      productId
    }
  });

  if (!item) {
    throw new ApiError(404, "Wishlist item not found or access denied");
  }

  await db.wishlist.delete({
    where: { id: item.id }
  });

  res.status(200).json({ success: true, message: "Removed from wishlist" });
});
