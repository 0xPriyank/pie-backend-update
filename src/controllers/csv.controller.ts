// csv.controller.ts - CSV Import/Export controllers
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as csvService from "@/services/csv/csv.service.js";
import multer from "multer";

/**
 * ====================================================================
 * Phase 8: CSV Import/Export Controller
 * ====================================================================
 * Handles bulk import/export operations via CSV files
 */

// Configure multer for CSV file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

export const uploadCSV = upload.single("file");

// ==================== Product Export ====================

/**
 * Export products to CSV
 * GET /api/csv/products/export
 */
export const exportProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // If seller, only export their products
    const sellerFilter = userRole === "seller" ? sellerId : undefined;

    const filters = {
      isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
      categoryId: req.query.categoryId as string,
      search: req.query.search as string
    };

    const csvContent = await csvService.exportProductsToCSV(sellerFilter, filters);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=products_${Date.now()}.csv`);
    res.send(csvContent);
  }
);

// ==================== Product Import ====================

/**
 * Import products from CSV
 * POST /api/csv/products/import
 */
export const importProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;

    if (!sellerId) {
      throw new ApiError(401, "Seller authentication required");
    }

    if (!req.file) {
      throw new ApiError(400, "CSV file is required");
    }

    const csvContent = req.file.buffer.toString("utf-8");

    const results = await csvService.importProductsFromCSV(csvContent, sellerId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          results,
          `Import completed: ${results.success} successful, ${results.failed} failed`
        )
      );
  }
);

// ==================== Order Export ====================

/**
 * Export orders to CSV
 * GET /api/csv/orders/export
 */
export const exportOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // If seller, only export their orders
    const sellerFilter = userRole === "seller" ? sellerId : undefined;

    const filters = {
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const csvContent = await csvService.exportOrdersToCSV(sellerFilter, filters);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=orders_${Date.now()}.csv`);
    res.send(csvContent);
  }
);

// ==================== Inventory Bulk Update ====================

/**
 * Bulk update inventory from CSV
 * POST /api/csv/inventory/update
 */
export const bulkUpdateInventory = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!req.file) {
      throw new ApiError(400, "CSV file is required");
    }

    const csvContent = req.file.buffer.toString("utf-8");

    // If seller, only update their inventory
    const sellerFilter = userRole === "seller" ? sellerId : undefined;

    const results = await csvService.bulkUpdateInventoryFromCSV(csvContent, sellerFilter);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          results,
          `Inventory update completed: ${results.success} successful, ${results.failed} failed`
        )
      );
  }
);

// ==================== CSV Template Downloads ====================

/**
 * Download product import CSV template
 * GET /api/csv/templates/products
 */
export const downloadProductTemplate = asyncHandler(
  async (_req: Request, res: Response) => {
    const template = `name,slug,description,brand,sku,price,compareAtPrice,costPerItem,inventory,size,color,weight,material,categories,tags,isActive
Sample T-Shirt,sample-tshirt,100% cotton t-shirt,BrandX,SKU001,499,599,200,50,M,Blue,0.2,Cotton,Clothing; Mens,Summer; Casual,true
Sample Jeans,sample-jeans,Denim jeans,BrandY,SKU002,1299,1599,600,30,32,Black,0.5,Denim,Clothing; Mens,Fashion,true`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=product_import_template.csv");
    res.send(template);
  }
);

/**
 * Download inventory update CSV template
 * GET /api/csv/templates/inventory
 */
export const downloadInventoryTemplate = asyncHandler(
  async (_req: Request, res: Response) => {
    const template = `sku,inventory
SKU001,100
SKU002,50
SKU003,75`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=inventory_update_template.csv");
    res.send(template);
  }
);

// ==================== CSV Export Statistics ====================

/**
 * Get CSV export statistics
 * GET /api/csv/stats
 */
export const getCSVStats = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const { default: db } = await import("@/config/db.config");

    // Count products
    const productCount = await db.product.count({
      where: userRole === "seller" ? { sellerId } : {}
    });

    // Count orders
    const orderCount = await db.subOrder.count({
      where: userRole === "seller" ? { sellerId } : {}
    });

    // Count variants
    const variantCount = await db.productVariant.count({
      where: userRole === "seller" ? {
        product: { sellerId }
      } : {}
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            products: productCount,
            orders: orderCount,
            variants: variantCount,
            lastUpdated: new Date().toISOString()
          },
          "CSV export statistics retrieved"
        )
      );
  }
);
