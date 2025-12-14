import type { Request, Response } from "express";
import prisma from "@/config/db.config";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import type { Prisma } from "@prisma/client";

type ReservedOrderItemType = {
  id?: string;
  productId: string;
  colorId: string;
  sizeId: string;
  quantity: number;
  expiresAt: Date;
  orderItemId?: string; // optional if you add it later
  tax?: number;
  totalPrice?: number;
};

// Define cart item type
// type CartItem = {
//   productId: string;
//   product: {
//     id: string;
//     name: string;
//     sku: string;
//     sellerId: string;
//     category: [
//       taxSlab: {
//         percentage: number;
//       },
//     ];
//   };
//   quantity: number;
//   unitPrice: number;
// };

const reserveStock = async (
  productId: string,
  colorId: string,
  sizeId: string,
  quantity: number
): Promise<ReservedOrderItemType> => {
  const inventory = await prisma.product.findFirst({
    where: {
      id: productId,
      colorId: colorId,
      sizeId: sizeId
    }
  });

  if (!inventory || inventory.stockAvailable < quantity) {
    throw new ApiError(400, "Insufficient stock for product variant");
  }

  await prisma.product.update({
    where: { id: inventory.id },
    data: { stockAvailable: { decrement: quantity } }
  });

  const res = await prisma.reservedStock.create({
    data: {
      productId: productId,
      colorId: colorId,
      sizeId: sizeId,
      quantity: quantity,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  return res;
};

const findTaxRateFromCategory = async (categoryId: string) => {
  let currentId = categoryId;

  while (currentId) {
    const category = await prisma.category.findUnique({
      where: { id: currentId },
      select: { taxSlab: true, parentCategoryId: true }
    });

    if (!category) return null;

    if (category.parentCategoryId === null) {
      return category.taxSlab.percentage;
    }

    currentId = category.parentCategoryId;
  }

  return null;
};

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const { cartId } = req.body;
  const customerId = req.user?.id as string;

  // Check if cart exists and is active
  const cart = await prisma.cart.findUnique({
    where: {
      id: cartId,
      status: "ACTIVE"
    },
    include: {
      items: {
        include: {
          product: { include: { categories: { include: { taxSlab: true } } } }
        }
      }
    }
  });

  if (!cart) {
    throw new ApiError(404, "Cart not found or already checked out");
  }

  const cartItems = cart.items as typeof cart.items;

  if (!cartItems.length) {
    throw new ApiError(400, "Cart is empty");
  }

  let subTotal = 0;
  let shippingCharge = 0;
  let total = 0;
  let totalTax = 0;
  const reservedOrderdItems: ReservedOrderItemType[] = [];

  for (const item of cartItems) {
    let reservedStock: ReservedOrderItemType = await reserveStock(
      item.productId,
      item.colorId,
      item.sizeId,
      item.quantity
    );
    if (!reservedStock) {
      throw new ApiError(400, "Item out of Stock");
    }
    let taxRate: number | null = null;

    for (const leafCategory of item.product.categories) {
      taxRate = await findTaxRateFromCategory(leafCategory.id);
      if (taxRate !== null) break;
    }
    if (!taxRate) taxRate = 5; //set a default value incase taxRate is null

    const amount = item.unitPrice * item.quantity;
    const tax = (amount * taxRate) / 100;
    const shipping = 40 * 100; //constant 40 rs
    const totalAmount = amount + tax + shipping;
    console.log(taxRate, amount, tax, shipping, totalAmount);
    reservedStock = { ...reservedStock, tax: tax, totalPrice: subTotal };
    shippingCharge += shipping;
    totalTax += tax;
    subTotal += amount;
    total += totalAmount;
    reservedOrderdItems.push(reservedStock);
  }

  // Create order and update cart status in a transaction
  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create the order
    const newOrder = await tx.orders.create({
      data: {
        customerId,
        subTotal,
        shippingCharge,
        tax: totalTax,
        total,
        orderStatus: "Pending",
        isPaid: false,
        paymentMethod: "RAZORPAY",
        orderItems: {
          create: cart.items.map((item, idx: number) => ({
            productId: item.productId,
            sellerId: item.product.sellerId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            productName: item.product.name,
            productSKU: item.product.sku,
            tax: reservedOrderdItems[idx].tax,
            reservedStockId: reservedOrderdItems[idx].id
          }))
        }
      }
    });

    // Update cart status to CHECKED_OUT
    await tx.cart.update({
      where: { id: cartId },
      data: { status: "CHECKED_OUT" as const }
    });

    return newOrder;
  });

  res.status(200).json({
    order
  });
});
