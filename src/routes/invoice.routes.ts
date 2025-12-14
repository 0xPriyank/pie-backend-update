import { Router } from "express";
import {
  downloadInvoiceBySubOrder,
  generateInvoicesForOrder,
  getInvoiceDetails,
  getCustomerInvoicesList,
  getSellerInvoicesList
} from "@/controllers/invoice.controller";
import { verifyJWT } from "@/modules/auth/auth";

/**
 * ====================================================================
 * Phase 6: Invoice Routes
 * ====================================================================
 * Routes for invoice generation and retrieval
 */

const router = Router();

/**
 * Customer Routes (requires user authentication)
 */

// Get all invoices for logged-in customer
router.get("/customer", verifyJWT("customer"), getCustomerInvoicesList);

// Download invoice PDF for a specific SubOrder
router.get("/suborder/:subOrderId/download", downloadInvoiceBySubOrder);

// Get invoice details for a SubOrder
router.get("/suborder/:subOrderId", getInvoiceDetails);

/**
 * Seller Routes (requires seller authentication)
 */

// Get all invoices for logged-in seller
router.get("/seller", verifyJWT("seller"), getSellerInvoicesList);

/**
 * Admin/System Routes
 */

// Generate invoices for all SubOrders in a MasterOrder
// This is also called automatically by payment webhook
router.post("/masterorder/:masterOrderId/generate", generateInvoicesForOrder);

export default router;
