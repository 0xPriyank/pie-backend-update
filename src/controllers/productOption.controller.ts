// ----CTP: Product Option Controller - Shopify-level multi-axis variant system
import { Request, Response } from "express";
import prisma from "../config/db.config";
import { z } from "zod";

// ----CTP: Validation schema for creating product option
const createOptionSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  name: z.string().min(1, "Option name is required"), // e.g., "Color", "Size"
  position: z.number().int().min(0).optional(),
  values: z.array(
    z.object({
      value: z.string().min(1, "Value is required"), // e.g., "Red", "Small"
      position: z.number().int().min(0).optional(),
    })
  ).min(1, "At least one option value is required"),
});

// ----CTP: Validation schema for updating product option
const updateOptionSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  values: z.array(
    z.object({
      id: z.string().uuid().optional(), // If exists, update; else create
      value: z.string().min(1),
      position: z.number().int().min(0).optional(),
    })
  ).optional(),
});

/**
 * ----CTP: Create Product Option with Values
 * POST /api/seller/products/:productId/options
 * 
 * Example request:
 * {
 *   "productId": "abc-123",
 *   "name": "Color",
 *   "position": 1,
 *   "values": [
 *     { "value": "Red", "position": 0 },
 *     { "value": "Blue", "position": 1 }
 *   ]
 * }
 */
export const createProductOption = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = createOptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { productId, name, position, values } = validation.data;

    // ----CTP: Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    // ----CTP: Check if option name already exists for this product
    const existingOption = await prisma.productOption.findFirst({
      where: { productId, name },
    });

    if (existingOption) {
      return res.status(409).json({
        success: false,
        message: `Option "${name}" already exists for this product`,
      });
    }

    // ----CTP: Create option with values
    const option = await prisma.productOption.create({
      data: {
        productId,
        name,
        position: position || 0,
        values: {
          create: values.map((v, idx) => ({
            value: v.value,
            position: v.position !== undefined ? v.position : idx,
          })),
        },
      },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Product option created successfully",
      data: option,
    });
  } catch (error: any) {
    console.error("Create product option error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product option",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get All Options for a Product
 * GET /api/seller/products/:productId/options
 */
export const getProductOptions = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { productId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ----CTP: Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    // ----CTP: Get all options with values
    const options = await prisma.productOption.findMany({
      where: { productId },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error: any) {
    console.error("Get product options error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product options",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Update Product Option
 * PUT /api/seller/products/options/:optionId
 */
export const updateProductOption = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { optionId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = updateOptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    // ----CTP: Verify option ownership via product
    const option = await prisma.productOption.findFirst({
      where: {
        id: optionId,
        product: { sellerId },
      },
      include: { values: true },
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found or unauthorized",
      });
    }

    const { name, position, values } = validation.data;

    // ----CTP: Update option and values
    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(name && { name }),
        ...(position !== undefined && { position }),
        ...(values && {
          values: {
            // ----CTP: Delete values not in the new list
            deleteMany: {
              id: {
                notIn: values
                  .filter((v) => v.id)
                  .map((v) => v.id as string),
              },
            },
            // ----CTP: Update existing and create new values
            upsert: values.map((v, idx) => ({
              where: { id: v.id || "new-" + idx },
              create: {
                value: v.value,
                position: v.position !== undefined ? v.position : idx,
              },
              update: {
                value: v.value,
                ...(v.position !== undefined && { position: v.position }),
              },
            })),
          },
        }),
      },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Product option updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update product option error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product option",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Delete Product Option
 * DELETE /api/seller/products/options/:optionId
 * Note: This will also delete associated variants (cascade)
 */
export const deleteProductOption = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { optionId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ----CTP: Verify option ownership
    const option = await prisma.productOption.findFirst({
      where: {
        id: optionId,
        product: { sellerId },
      },
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found or unauthorized",
      });
    }

    // ----CTP: Delete option (cascade deletes values and variants)
    await prisma.productOption.delete({
      where: { id: optionId },
    });

    res.status(200).json({
      success: true,
      message: "Product option deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete product option error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product option",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Delete Option Value
 * DELETE /api/seller/products/options/values/:valueId
 */
export const deleteOptionValue = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { valueId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ----CTP: Verify value ownership via option->product
    const value = await prisma.productOptionValue.findFirst({
      where: {
        id: valueId,
        option: {
          product: { sellerId },
        },
      },
    });

    if (!value) {
      return res.status(404).json({
        success: false,
        message: "Option value not found or unauthorized",
      });
    }

    // ----CTP: Delete value (may affect variants)
    await prisma.productOptionValue.delete({
      where: { id: valueId },
    });

    res.status(200).json({
      success: true,
      message: "Option value deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete option value error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete option value",
      error: error.message,
    });
  }
};

