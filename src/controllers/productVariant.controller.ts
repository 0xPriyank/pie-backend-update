// ----CTP: Product Variant Controller - Shopify-style variant combinations
import { Request, Response } from "express";
import prisma from "../config/db.config";
import { z } from "zod";

// ----CTP: Validation schema for creating variant
const createVariantSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  sku: z.string().min(1, "SKU is required"),
  title: z.string().optional(), // e.g., "Red / Small"
  price: z.number().int().positive("Price must be positive"),
  compareAtPrice: z.number().int().positive().optional(),
  costPrice: z.number().int().positive().optional(),
  inventory: z.number().int().min(0).default(0),
  weight: z.number().positive().optional(),
  imageId: z.string().uuid().optional(),
  optionValueIds: z.array(z.string().uuid()).min(1, "At least one option value required"),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

// ----CTP: Bulk variant generation schema
const generateVariantsSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  basePrice: z.number().int().positive("Base price required"),
  baseSku: z.string().min(1, "Base SKU required"),
  inventoryPerVariant: z.number().int().min(0).default(0),
});

/**
 * ----CTP: Create Single Product Variant
 * POST /api/seller/products/:productId/variants
 */
export const createProductVariant = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = createVariantSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { productId, sku, optionValueIds, ...variantData } = validation.data;

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

    // ----CTP: Check SKU uniqueness per seller
    const existingSku = await prisma.productVariant.findFirst({
      where: {
        sku,
        product: { sellerId },
      },
    });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: `SKU "${sku}" already exists in your products`,
      });
    }

    // ----CTP: Verify option values belong to this product
    const values = await prisma.productOptionValue.findMany({
      where: {
        id: { in: optionValueIds },
        option: { productId },
      },
      include: {
        option: true,
      },
    });

    if (values.length !== optionValueIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some option values are invalid or don't belong to this product",
      });
    }

    // ----CTP: Generate title if not provided (e.g., "Red / Small")
    const title = variantData.title || values.map((v: any) => v.value).join(" / ");

    // ----CTP: Create variant
    const variant = await prisma.productVariant.create({
      data: {
        ...variantData,
        productId,
        sku,
        title,
        optionValues: {
          connect: optionValueIds.map(id => ({ id })),
        },
      },
      include: {
        optionValues: {
          include: {
            option: true,
          },
        },
        image: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Product variant created successfully",
      data: variant,
    });
  } catch (error: any) {
    console.error("Create product variant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product variant",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Generate All Variants Automatically (Cartesian Product)
 * POST /api/seller/products/:productId/variants/generate
 * 
 * Generates all possible combinations of option values
 * Example: Color [Red, Blue] × Size [S, M, L] = 6 variants
 */
export const generateProductVariants = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = generateVariantsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { productId, basePrice, baseSku, inventoryPerVariant } = validation.data;

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

    // ----CTP: Get options separately
    const productOptions = await prisma.productOption.findMany({
      where: { productId },
      include: {
        values: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    if (productOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product must have at least one option before generating variants",
      });
    }

    // ----CTP: Generate cartesian product of all option values
    const optionValueArrays = productOptions.map((opt: any) => opt.values);
    const combinations = cartesianProduct(optionValueArrays);

    if (combinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No variant combinations possible",
      });
    }

    // ----CTP: Create variants for each combination
    const createdVariants = [];
    let skipped = 0;

    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const title = combo.map((v: any) => v.value).join(" / ");
      const sku = `${baseSku}-${combo.map((v: any) => v.value.substring(0, 3).toUpperCase()).join("-")}`;

      // ----CTP: Check if SKU already exists
      const existing = await prisma.productVariant.findFirst({
        where: { sku, product: { sellerId } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku,
          title,
          price: basePrice,
          inventory: inventoryPerVariant,
          position: i,
          optionValues: {
            connect: combo.map((v: any) => ({ id: v.id })),
          },
        },
        include: {
          optionValues: {
            include: {
              option: true,
            },
          },
        },
      });

      createdVariants.push(variant);
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdVariants.length} variants${skipped > 0 ? ` (${skipped} skipped due to duplicate SKUs)` : ""}`,
      data: {
        created: createdVariants.length,
        skipped,
        variants: createdVariants,
      },
    });
  } catch (error: any) {
    console.error("Generate variants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate variants",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Helper function - Cartesian product of arrays
 * @param arrays - Array of arrays to compute cartesian product
 * @returns Array of all combinations
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map(item => [item]);
  
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  
  return first.flatMap(item =>
    restProduct.map(combination => [item, ...combination])
  );
}

/**
 * ----CTP: Get All Variants for a Product
 * GET /api/seller/products/:productId/variants
 */
export const getProductVariants = async (req: Request, res: Response) => {
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

    // ----CTP: Get all variants with relations
    const variants = await prisma.productVariant.findMany({
      where: { productId },
      include: {
        optionValues: {
          include: {
            option: true,
          },
        },
        image: true,
      },
      orderBy: { position: "asc" },
    });

    res.status(200).json({
      success: true,
      data: variants,
    });
  } catch (error: any) {
    console.error("Get product variants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product variants",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Get Single Product Variant by ID
 * GET /api/seller/product-variants/single/:variantId
 */
export const getProductVariantById = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { variantId } = req.params;

    // ----CTP: Get variant with ownership check
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { sellerId },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellerId: true,
          },
        },
        optionValues: {
          include: {
            option: true,
          },
        },
      },
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error: any) {
    console.error("Get product variant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product variant",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Update Product Variant
 * PUT /api/seller/products/variants/:variantId
 */
export const updateProductVariant = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { variantId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const updateSchema = z.object({
      sku: z.string().min(1).optional(),
      title: z.string().optional(),
      price: z.number().int().positive().optional(),
      compareAtPrice: z.number().int().positive().optional(),
      costPrice: z.number().int().positive().optional(),
      inventory: z.number().int().min(0).optional(),
      weight: z.number().positive().optional(),
      imageId: z.string().uuid().nullable().optional(),
      position: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    // ----CTP: Verify variant ownership
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { sellerId },
      },
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found or unauthorized",
      });
    }

    const { sku, ...updateData } = validation.data;

    // ----CTP: Check SKU uniqueness if updating
    if (sku && sku !== variant.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          sku,
          product: { sellerId },
          NOT: { id: variantId },
        },
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: `SKU "${sku}" already exists in your products`,
        });
      }
    }

    // ----CTP: Update variant
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(sku && { sku }),
        ...updateData,
      },
      include: {
        optionValues: {
          include: {
            option: true,
          },
        },
        image: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Product variant updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update product variant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product variant",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Delete Product Variant
 * DELETE /api/seller/products/variants/:variantId
 */
export const deleteProductVariant = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { variantId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ----CTP: Verify variant ownership
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { sellerId },
      },
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found or unauthorized",
      });
    }

    // ----CTP: Delete variant
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    res.status(200).json({
      success: true,
      message: "Product variant deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete product variant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product variant",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Bulk Update Variant Inventory
 * PATCH /api/seller/products/:productId/variants/inventory
 * 
 * Example request:
 * {
 *   "updates": [
 *     { "variantId": "abc", "inventory": 100 },
 *     { "variantId": "def", "inventory": 50 }
 *   ]
 * }
 */
export const bulkUpdateInventory = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.id;
    const { productId } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const bulkSchema = z.object({
      updates: z.array(
        z.object({
          variantId: z.string().uuid(),
          inventory: z.number().int().min(0),
        })
      ).min(1, "At least one update required"),
    });

    const validation = bulkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    const { updates } = validation.data;

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

    // ----CTP: Bulk update inventory
    const results = await Promise.all(
      updates.map(async (update) => {
        try {
          const variant = await prisma.productVariant.updateMany({
            where: {
              id: update.variantId,
              productId,
              product: { sellerId },
            },
            data: {
              inventory: update.inventory,
            },
          });

          return {
            variantId: update.variantId,
            success: variant.count > 0,
          };
        } catch (error) {
          return {
            variantId: update.variantId,
            success: false,
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;

    res.status(200).json({
      success: true,
      message: `Updated ${successful} of ${updates.length} variants`,
      data: results,
    });
  } catch (error: any) {
    console.error("Bulk update inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update inventory",
      error: error.message,
    });
  }
};

