import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { z } from "zod";

// Validation schema for creating size
const createSizeSchema = z.object({
  name: z.string().min(1, "Size name is required"), // e.g., "Small", "Medium", "Large"
  value: z.string().min(1, "Size value is required"), // e.g., "S", "M", "L", "XL", "42"
});

// Validation schema for updating size
const updateSizeSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
});

/**
 * Create new size
 * POST /api/v1/sizes
 */
export const createSize = async (req: Request, res: Response) => {
  try {
    const validation = createSizeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { name, value } = validation.data;

    // Check if size already exists
    const existingSize = await prisma.size.findFirst({
      where: {
        OR: [{ name }, { value }],
      },
    });

    if (existingSize) {
      return res.status(409).json({
        success: false,
        message: "Size with this name or value already exists",
      });
    }

    const size = await prisma.size.create({
      data: { name, value },
    });

    return res.status(201).json({
      success: true,
      message: "Size created successfully",
      data: size,
    });
  } catch (error: any) {
    console.error("Error creating size:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create size",
      error: error.message,
    });
  }
};

/**
 * Get all sizes
 * GET /api/v1/sizes
 */
export const getAllSizes = async (req: Request, res: Response) => {
  try {
    const sizes = await prisma.size.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        value: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Sizes retrieved successfully",
      data: sizes,
    });
  } catch (error: any) {
    console.error("Error fetching sizes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sizes",
      error: error.message,
    });
  }
};

/**
 * Get size by ID
 * GET /api/v1/sizes/:sizeId
 */
export const getSizeById = async (req: Request, res: Response) => {
  try {
    const { sizeId } = req.params;

    const size = await prisma.size.findUnique({
      where: { id: sizeId },
      include: {
        _count: {
          select: {
            products: true,
            cartItems: true,
          },
        },
      },
    });

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Size not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Size retrieved successfully",
      data: size,
    });
  } catch (error: any) {
    console.error("Error fetching size:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch size",
      error: error.message,
    });
  }
};

/**
 * Update size
 * PATCH /api/v1/sizes/:sizeId
 */
export const updateSize = async (req: Request, res: Response) => {
  try {
    const { sizeId } = req.params;

    const validation = updateSizeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const size = await prisma.size.findUnique({
      where: { id: sizeId },
    });

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Size not found",
      });
    }

    const updatedSize = await prisma.size.update({
      where: { id: sizeId },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Size updated successfully",
      data: updatedSize,
    });
  } catch (error: any) {
    console.error("Error updating size:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update size",
      error: error.message,
    });
  }
};

/**
 * Delete size
 * DELETE /api/v1/sizes/:sizeId
 */
export const deleteSize = async (req: Request, res: Response) => {
  try {
    const { sizeId } = req.params;

    const size = await prisma.size.findUnique({
      where: { id: sizeId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Size not found",
      });
    }

    // Check if size is being used by products
    if (size._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete size. It is being used by ${size._count.products} product(s)`,
      });
    }

    await prisma.size.delete({
      where: { id: sizeId },
    });

    return res.status(200).json({
      success: true,
      message: "Size deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting size:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete size",
      error: error.message,
    });
  }
};
