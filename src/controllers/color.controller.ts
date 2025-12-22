import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { z } from "zod";

// Validation schema for creating color
const createColorSchema = z.object({
  name: z.string().min(1, "Color name is required"),
  value: z.string().min(1, "Color value/hex code is required"), // e.g., "#FF0000" or "red"
});

// Validation schema for updating color
const updateColorSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
});

/**
 * Create new color
 * POST /api/v1/colors
 */
export const createColor = async (req: Request, res: Response) => {
  try {
    const validation = createColorSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { name, value } = validation.data;

    // Check if color already exists
    const existingColor = await prisma.color.findFirst({
      where: {
        OR: [{ name }, { value }],
      },
    });

    if (existingColor) {
      return res.status(409).json({
        success: false,
        message: "Color with this name or value already exists",
      });
    }

    const color = await prisma.color.create({
      data: { name, value },
    });

    return res.status(201).json({
      success: true,
      message: "Color created successfully",
      data: color,
    });
  } catch (error: any) {
    console.error("Error creating color:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create color",
      error: error.message,
    });
  }
};

/**
 * Get all colors
 * GET /api/v1/colors
 */
export const getAllColors = async (req: Request, res: Response) => {
  try {
    const colors = await prisma.color.findMany({
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
      message: "Colors retrieved successfully",
      data: colors,
    });
  } catch (error: any) {
    console.error("Error fetching colors:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch colors",
      error: error.message,
    });
  }
};

/**
 * Get color by ID
 * GET /api/v1/colors/:colorId
 */
export const getColorById = async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;

    const color = await prisma.color.findUnique({
      where: { id: colorId },
      include: {
        _count: {
          select: {
            products: true,
            cartItems: true,
          },
        },
      },
    });

    if (!color) {
      return res.status(404).json({
        success: false,
        message: "Color not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Color retrieved successfully",
      data: color,
    });
  } catch (error: any) {
    console.error("Error fetching color:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch color",
      error: error.message,
    });
  }
};

/**
 * Update color
 * PATCH /api/v1/colors/:colorId
 */
export const updateColor = async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;

    const validation = updateColorSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const color = await prisma.color.findUnique({
      where: { id: colorId },
    });

    if (!color) {
      return res.status(404).json({
        success: false,
        message: "Color not found",
      });
    }

    const updatedColor = await prisma.color.update({
      where: { id: colorId },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Color updated successfully",
      data: updatedColor,
    });
  } catch (error: any) {
    console.error("Error updating color:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update color",
      error: error.message,
    });
  }
};

/**
 * Delete color
 * DELETE /api/v1/colors/:colorId
 */
export const deleteColor = async (req: Request, res: Response) => {
  try {
    const { colorId } = req.params;

    const color = await prisma.color.findUnique({
      where: { id: colorId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!color) {
      return res.status(404).json({
        success: false,
        message: "Color not found",
      });
    }

    // Check if color is being used by products
    if (color._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete color. It is being used by ${color._count.products} product(s)`,
      });
    }

    await prisma.color.delete({
      where: { id: colorId },
    });

    return res.status(200).json({
      success: true,
      message: "Color deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting color:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete color",
      error: error.message,
    });
  }
};
