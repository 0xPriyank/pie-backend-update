import { Request, Response } from "express";
import { db } from "../config/db.config";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

// POST /cart
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, colorId, sizeId } = req.body;
  const customerId = req.user?.id;

  if (!productId || !quantity || !colorId || !sizeId) {
    throw new ApiError(400, "productId, quantity, colorId, and sizeId are required");
  }

  // Ensure customer has a cart
  let cart = await db.cart.findFirst({ where: { customerId } });
  if (!cart) {
    cart = await db.cart.create({
      data: {
        customerId
      }
    });
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stockAvailable < quantity) {
    throw new ApiError(400, "Insufficient stock available");
  }

  const unitPrice = product.price - (product.price * product.discount) / 100;

  // Check if same product/color/size already in cart
  const existingCartItem = await db.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      colorId,
      sizeId
    }
  });

  if (existingCartItem) {
    // Update quantity
    await db.cartItem.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: { increment: quantity }
      }
    });
  } else {
    // Create new item
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: unitPrice,
        colorId,
        sizeId
      }
    });
  }

  res.status(200).json({ success: true, message: "Product added to cart" });
});

// GET /cart
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;

  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const cart = await db.cart.findFirst({
    where: { customerId },
    include: {
      items: {
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
          },
          color: true,
          size: true
        }
      }
    }
  });

  if (!cart) {
    res.status(200).json({ success: true, cart: [] }); // Empty cart
    return;
  }

  res.status(200).json({ success: true, cart: cart.items });
});

// PATCH /cart/update/:cartItemId
export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { cartItemId } = req.params;
  const { quantity } = req.body;
  const customerId = req.user?.id;

  if (quantity === undefined || quantity < 0) {
    throw new ApiError(400, "Quantity must be a non-negative number");
  }

  // Check if the item exists and belongs to the customer
  const cartItem = await db.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      cart: true
    }
  });

  if (!cartItem || cartItem.cart.customerId !== customerId) {
    throw new ApiError(404, "Cart item not found");
  }

  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: cartItemId } });
    res.status(200).json({ success: true, message: "Item removed from cart" });
    return;
  }

  await db.cartItem.update({
    where: { id: cartItemId },
    data: { quantity }
  });

  res.status(200).json({ success: true, message: "Cart item updated" });
});
