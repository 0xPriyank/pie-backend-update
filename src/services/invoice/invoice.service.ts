// invoice.service.ts - Handles invoice generation for MasterOrder/SubOrder system
import db from "@/config/db.config";
import { Prisma } from "@prisma/client";
import { InvoiceData, InvoiceItem, generateInvoiceHTML } from "./invoice";
import { generatePDFBuffer } from "./generate";
import { ApiError } from "@/utils/ApiError";

interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

/**
 * Generate unique invoice number format: INV-YYYY-XXXXXX
 * Example: INV-2025-000123
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Find the latest invoice for this year
  const latestInvoice = await db.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  let sequence = 1;
  if (latestInvoice) {
    // Extract sequence number from format INV-2025-000123
    const parts = latestInvoice.invoiceNumber.split("-");
    if (parts.length === 3) {
      sequence = parseInt(parts[2]) + 1;
    }
  }

  // Pad with zeros (6 digits)
  const paddedSequence = String(sequence).padStart(6, "0");
  return `INV-${year}-${paddedSequence}`;
}

/**
 * Calculate GST breakdown (CGST/SGST/IGST) based on seller and customer state
 * For same state: CGST + SGST (split 50/50)
 * For different state: IGST (full amount)
 */
export function calculateGST(
  subtotal: number,
  taxPercent: number,
  sellerState: string,
  customerState: string
): GSTBreakdown {
  const totalTax = (subtotal * taxPercent) / 100;
  
  // Normalize state names for comparison (trim, lowercase)
  const normalizedSellerState = sellerState.trim().toLowerCase();
  const normalizedCustomerState = customerState.trim().toLowerCase();
  
  // Same state → CGST + SGST (split equally)
  if (normalizedSellerState === normalizedCustomerState) {
    return {
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      totalTax
    };
  }
  
  // Different states → IGST only
  return {
    cgst: 0,
    sgst: 0,
    igst: totalTax,
    totalTax
  };
}

/**
 * Generate invoice for a SubOrder (per-seller invoice)
 * Each SubOrder gets its own invoice since different sellers
 */
export async function generateInvoiceForSubOrder(
  subOrderId: string
): Promise<{ invoiceId: string; pdfBuffer: Buffer; invoiceNumber: string }> {
  // Fetch SubOrder with all required relations
  const subOrder = await db.subOrder.findUnique({
    where: { id: subOrderId },
    include: {
      seller: {
        include: {
          sellerAddress: true,
          GSTInfo: true
        }
      },
      masterOrder: {
        include: {
          customer: {
            include: {
              ShippingAddress: {
                where: { isMain: true },
                take: 1
              }
            }
          },
          shippingAddress: true,
          paymentAttempts: {
            where: { status: "SUCCESS" },
            orderBy: { attemptTime: "desc" },
            take: 1
          }
        }
      },
      items: {
        include: {
          variant: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });

  if (!subOrder) {
    throw new ApiError(404, "SubOrder not found");
  }

  const { seller, masterOrder, items } = subOrder;
  
  // Validation
  if (!masterOrder.customer) {
    throw new ApiError(400, "Customer information missing");
  }

  // Get customer shipping address (prefer order-specific, fallback to customer default)
  const shippingAddress = masterOrder.shippingAddress || 
                          (masterOrder.customer.ShippingAddress && masterOrder.customer.ShippingAddress[0]);
  
  if (!shippingAddress) {
    throw new ApiError(400, "Customer shipping address missing");
  }

  // Get successful payment details
  const payment = masterOrder.paymentAttempts[0];
  if (!payment) {
    throw new ApiError(400, "No successful payment found for this order");
  }

  // Calculate GST breakdown based on seller/customer states
  const sellerState = seller.sellerAddress?.state || seller.country || "";
  const customerState = shippingAddress.state || "";
  
  const subtotal = Number(subOrder.subtotal);
  const taxAmount = Number(subOrder.taxAmount);
  const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
  const gstBreakdown = calculateGST(subtotal, taxPercent, sellerState, customerState);

  // Generate unique invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Map SubOrderItems to InvoiceItems
  const invoiceItems: InvoiceItem[] = items.map((item) => {
    const basePrice = Number(item.price);
    const quantity = item.quantity;
    const discount = Number(item.discount || 0);
    const itemTax = Number(item.taxAmount);
    const itemTotal = Number(item.total);
    
    // Calculate tax rate from item
    const taxableAmount = basePrice * quantity - discount;
    const itemTaxRate = taxableAmount > 0 ? (itemTax / taxableAmount) * 100 : 0;
    
    return {
      name: item.variant.product.name,
      description: item.variant.product.description || undefined,
      hsn: undefined, // TODO: Add HSN code to Product model
      quantity,
      unitPrice: basePrice,
      discount: discount / quantity, // Per-unit discount
      taxRate: itemTaxRate
    };
  });

  // Prepare invoice data for HTML generation
  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate: new Date().toISOString().split("T")[0],
    currency: "INR",
    company: {
      name: seller.businessName || seller.fullName || "Seller Business",
      addressLines: [
        seller.sellerAddress?.street || "",
        `${seller.sellerAddress?.city || ""}, ${seller.sellerAddress?.state || ""}`,
        `${seller.sellerAddress?.country || ""} - ${seller.sellerAddress?.pincode || ""}`
      ].filter(Boolean),
      phone: seller.sellerAddress?.contact || undefined,
      email: seller.email,
      website: undefined,
      gstin: seller.GSTInfo?.gstin || undefined,
      logoUrl: undefined // TODO: Add seller logo support
    },
    billTo: {
      name: masterOrder.customer.fullName || "Customer",
      company: undefined,
      addressLines: [
        shippingAddress.street || "",
        `${shippingAddress.city || ""}, ${shippingAddress.state || ""}`,
        `${shippingAddress.country || ""} - ${shippingAddress.pincode || ""}`
      ].filter(Boolean),
      phone: shippingAddress.contact || undefined,
      email: masterOrder.customer.email,
      gstin: undefined // Customers usually don't have GSTIN (B2C)
    },
    shipTo: {
      name: shippingAddress.fullName || undefined,
      addressLines: [
        shippingAddress.street || "",
        `${shippingAddress.city || ""}, ${shippingAddress.state || ""}`,
        `${shippingAddress.country || ""} - ${shippingAddress.pincode || ""}`
      ].filter(Boolean)
    },
    items: invoiceItems,
    shippingAmount: Number(subOrder.shippingFee || 0),
    additionalCharges: [],
    couponDiscount: 0, // Coupon is applied at MasterOrder level, not SubOrder
    notes: `Order Number: ${masterOrder.orderNumber}. SubOrder Number: ${subOrder.subOrderNumber}. Thank you for your business!`,
    payment: {
      method: formatPaymentMethod(undefined, payment.paymentMethod),
      paymentId: payment.razorpayPaymentId || undefined,
      orderId: payment.razorpayOrderId || undefined
    },
    qrCodeDataUri: null // Optional: Generate QR code for payment verification
  };

  // Generate HTML and PDF
  const html = generateInvoiceHTML(invoiceData);
  const pdfBuffer = Buffer.from(await generatePDFBuffer(html));

  // Save invoice to database
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      masterOrderId: masterOrder.id,
      subOrderId: subOrder.id,
      sellerId: seller.id,
      customerId: masterOrder.customer.id,
      subtotal: new Prisma.Decimal(subtotal),
      cgstAmount: new Prisma.Decimal(gstBreakdown.cgst),
      sgstAmount: new Prisma.Decimal(gstBreakdown.sgst),
      igstAmount: new Prisma.Decimal(gstBreakdown.igst),
      totalTax: new Prisma.Decimal(gstBreakdown.totalTax),
      totalAmount: new Prisma.Decimal(subtotal + gstBreakdown.totalTax + Number(subOrder.shippingFee || 0)),
      pdfUrl: null, // TODO: Upload to Cloudinary/S3 and store URL
      generatedAt: new Date()
    }
  });

  console.log(`✅ Invoice generated: ${invoiceNumber} for SubOrder ${subOrderId}`);

  return {
    invoiceId: invoice.id,
    pdfBuffer,
    invoiceNumber
  };
}

/**
 * Generate invoices for all SubOrders in a MasterOrder
 * This should be called automatically when payment is confirmed
 */
export async function generateInvoicesForMasterOrder(
  masterOrderId: string
): Promise<{ invoices: Array<{ invoiceId: string; invoiceNumber: string; subOrderId: string }> }> {
  // Fetch all SubOrders for the MasterOrder
  const subOrders = await db.subOrder.findMany({
    where: { masterOrderId },
    select: { id: true }
  });

  if (subOrders.length === 0) {
    throw new ApiError(404, "No SubOrders found for this MasterOrder");
  }

  const invoices = [];
  
  // Generate invoice for each SubOrder (per-seller)
  for (const subOrder of subOrders) {
    try {
      const result = await generateInvoiceForSubOrder(subOrder.id);
      invoices.push({
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        subOrderId: subOrder.id
      });
    } catch (error) {
      console.error(`❌ Failed to generate invoice for SubOrder ${subOrder.id}:`, error);
      // Continue with other invoices even if one fails
    }
  }

  console.log(`✅ Generated ${invoices.length} invoices for MasterOrder ${masterOrderId}`);
  
  return { invoices };
}

/**
 * Fetch existing invoice by SubOrder ID
 */
export async function getInvoiceBySubOrderId(subOrderId: string) {
  const invoice = await db.invoice.findUnique({
    where: { subOrderId },
    include: {
      seller: {
        select: {
          sellerAddress: { select: { street: true } },
          businessName: true
        }
      },
      customer: {
        select: { fullName: true, email: true }
      }
    }
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found for this SubOrder");
  }

  return invoice;
}

/**
 * Fetch all invoices for a customer (for customer portal)
 */
export async function getCustomerInvoices(customerId: string) {
  const invoices = await db.invoice.findMany({
    where: { customerId },
    include: {
      masterOrder: {
        select: { orderNumber: true, createdAt: true }
      },
      seller: {
        select: {
          sellerAddress: { select: { street: true } },
          businessName: true
        }
      }
    },
    orderBy: { generatedAt: "desc" }
  });

  return invoices;
}

/**
 * Fetch all invoices for a seller (for seller dashboard)
 */
export async function getSellerInvoices(sellerId: string) {
  const invoices = await db.invoice.findMany({
    where: { sellerId },
    include: {
      customer: {
        select: { fullName: true, email: true }
      },
      masterOrder: {
        select: { orderNumber: true, createdAt: true }
      }
    },
    orderBy: { generatedAt: "desc" }
  });

  return invoices;
}

/**
 * Format payment method for invoice display
 */
function formatPaymentMethod(gateway?: string, method?: string): string {
  if (!method) return "Online Payment";
  
  // Format method string (e.g., "UPI" → "UPI", "CREDIT_CARD" → "Credit Card", "RAZORPAY" → "Razorpay")
  const formattedMethod = String(method)
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  
  return formattedMethod || "Online Payment";
}
