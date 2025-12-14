// csv.routes.ts - CSV Import/Export routes
import { Router } from "express";
import * as csvController from "@/controllers/csv.controller";
import { verifyJWT } from "@/modules/auth/auth";

/**
 * ====================================================================
 * Phase 8: CSV Import/Export Routes
 * ====================================================================
 * Routes for bulk import/export operations
 */

const router = Router();

// ==================== Product CSV ====================

// Export products to CSV (seller or admin)
router.get(
  "/products/export",
  verifyJWT("seller"), // Can be extended to support admin
  csvController.exportProducts
);

// Import products from CSV (seller only)
router.post(
  "/products/import",
  verifyJWT("seller"),
  csvController.uploadCSV,
  csvController.importProducts
);

// ==================== Order CSV ====================

// Export orders to CSV (seller or admin)
router.get(
  "/orders/export",
  verifyJWT("seller"), // Can be extended to support admin
  csvController.exportOrders
);

// ==================== Inventory CSV ====================

// Bulk update inventory from CSV (seller only)
router.post(
  "/inventory/update",
  verifyJWT("seller"),
  csvController.uploadCSV,
  csvController.bulkUpdateInventory
);

// ==================== CSV Templates ====================

// Download product import template (no auth - public)
router.get(
  "/templates/products",
  csvController.downloadProductTemplate
);

// Download inventory update template (no auth - public)
router.get(
  "/templates/inventory",
  csvController.downloadInventoryTemplate
);

// ==================== Statistics ====================

// Get CSV export statistics
router.get(
  "/stats",
  verifyJWT("seller"),
  csvController.getCSVStats
);

export default router;
