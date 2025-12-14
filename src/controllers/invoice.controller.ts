/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from "express";
import { ApiError } from "@/utils/ApiError";
import {
  generateInvoiceForSubOrder,
  generateInvoicesForMasterOrder,
  getInvoiceBySubOrderId,
  getCustomerInvoices,
  getSellerInvoices
} from "@/services/invoice/invoice.service";

/**
 * ====================================================================
 * Phase 6: Invoice Controller
 * ====================================================================
 * Updated to work with MasterOrder/SubOrder structure
 */

/**
 * Generate and download invoice PDF for a specific SubOrder
 * GET /api/invoices/suborder/:subOrderId/download
 */
export const downloadInvoiceBySubOrder = async (req: Request, res: Response) => {
  try {
    const { subOrderId } = req.params;

    // Check if invoice already exists
    let invoice;
    try {
      invoice = await getInvoiceBySubOrderId(subOrderId);
    } catch (error) {
      // Invoice doesn't exist, generate it now
      console.log(`Invoice not found for SubOrder ${subOrderId}, generating...`);
    }

    let pdfBuffer: Buffer;
    let invoiceNumber: string;

    if (invoice) {
      // Invoice exists, check if PDF needs regeneration
      if (invoice.pdfUrl) {
        // TODO: Fetch from Cloudinary/S3 if stored
        // For now, regenerate
        const result = await generateInvoiceForSubOrder(subOrderId);
        pdfBuffer = result.pdfBuffer;
        invoiceNumber = result.invoiceNumber;
      } else {
        const result = await generateInvoiceForSubOrder(subOrderId);
        pdfBuffer = result.pdfBuffer;
        invoiceNumber = result.invoiceNumber;
      }
    } else {
      // Generate new invoice
      const result = await generateInvoiceForSubOrder(subOrderId);
      pdfBuffer = result.pdfBuffer;
      invoiceNumber = result.invoiceNumber;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${invoiceNumber}.pdf"`);
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error downloading invoice:", error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Invoice download failed" });
  }
};

/**
 * Generate invoices for all SubOrders in a MasterOrder
 * POST /api/invoices/masterorder/:masterOrderId/generate
 */
export const generateInvoicesForOrder = async (req: Request, res: Response) => {
  try {
    const { masterOrderId } = req.params;

    const result = await generateInvoicesForMasterOrder(masterOrderId);

    res.status(200).json({
      success: true,
      message: `Generated ${result.invoices.length} invoice(s)`,
      invoices: result.invoices
    });
  } catch (error) {
    console.error("Error generating invoices:", error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Invoice generation failed" });
  }
};

/**
 * Get invoice details for a SubOrder
 * GET /api/invoices/suborder/:subOrderId
 */
export const getInvoiceDetails = async (req: Request, res: Response) => {
  try {
    const { subOrderId } = req.params;

    const invoice = await getInvoiceBySubOrderId(subOrderId);

    res.status(200).json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        subOrderId: invoice.subOrderId,
        masterOrderId: invoice.masterOrderId,
        sellerName: invoice.seller.sellerAddress?.street || invoice.seller.businessName,
        customerName: invoice.customer.fullName,
        customerEmail: invoice.customer.email,
        subtotal: invoice.subtotal,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        igstAmount: invoice.igstAmount,
        totalTax: invoice.totalTax,
        totalAmount: invoice.totalAmount,
        generatedAt: invoice.generatedAt,
        pdfUrl: invoice.pdfUrl
      }
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

/**
 * Get all invoices for a customer
 * GET /api/invoices/customer
 * Requires authentication (req.user)
 */
export const getCustomerInvoicesList = async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const invoices = await getCustomerInvoices(customerId);

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.masterOrder.orderNumber,
        orderDate: inv.masterOrder.createdAt,
        sellerName: inv.seller.sellerAddress?.street || inv.seller.businessName,
        totalAmount: inv.totalAmount,
        generatedAt: inv.generatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

/**
 * Get all invoices for a seller
 * GET /api/invoices/seller
 * Requires authentication (req.seller)
 */
export const getSellerInvoicesList = async (req: Request, res: Response) => {
  try {
    const sellerId = req.seller?.id;

    if (!sellerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const invoices = await getSellerInvoices(sellerId);

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.masterOrder.orderNumber,
        orderDate: inv.masterOrder.createdAt,
        customerName: inv.customer.fullName,
        customerEmail: inv.customer.email,
        totalAmount: inv.totalAmount,
        generatedAt: inv.generatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching seller invoices:", error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
}
