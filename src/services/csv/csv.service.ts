// csv.service.ts - Simplified CSV Import/Export service
import { Readable } from "stream";
import csv from "csv-parser";
import { format } from "fast-csv";
import db from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";

/**
 * ====================================================================
 * Phase 8: CSV Import/Export Service (Simplified)
 * ====================================================================
 * Handles bulk operations for product variants, orders, and inventory
 */

// ==================== Product Variant CSV Export ====================

interface ProductVariantCSVRow {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number;
  costPrice: number;
  inventory: number;
  weight: number;
  isActive: boolean;
  sellerId: string;
}

/**
 * Export product variants to CSV format
 */
export async function exportProductsToCSV(
  sellerId?: string,
  filters?: {
    isActive?: boolean;
    search?: string;
  }
): Promise<string> {
  try {
    // Fetch product variants with product info
    const variants = await db.productVariant.findMany({
      where: {
        ...(sellerId ? {
          product: {
            sellerId
          }
        } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search ? {
          OR: [
            { sku: { contains: filters.search, mode: "insensitive" } },
            { title: { contains: filters.search, mode: "insensitive" } },
            { product: { name: { contains: filters.search, mode: "insensitive" } } }
          ]
        } : {})
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sellerId: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Convert to CSV rows
    const csvRows: ProductVariantCSVRow[] = variants.map(variant => ({
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      sku: variant.sku,
      title: variant.title || "",
      price: variant.price,
      compareAtPrice: variant.compareAtPrice || 0,
      costPrice: variant.costPrice || 0,
      inventory: variant.inventory,
      weight: variant.weight || 0,
      isActive: variant.isActive,
      sellerId: variant.product.sellerId
    }));

    // Generate CSV string
    return new Promise((resolve, reject) => {
      const csvStream = format({ headers: true });
      const chunks: string[] = [];

      csvStream.on("data", (chunk) => chunks.push(chunk.toString()));
      csvStream.on("end", () => resolve(chunks.join("")));
      csvStream.on("error", reject);

      csvRows.forEach(row => csvStream.write(row));
      csvStream.end();
    });
  } catch (error) {
    console.error("Error exporting products to CSV:", error);
    throw new ApiError(500, "Failed to export products to CSV");
  }
}

// ==================== Product Variant Import (Update Only) ====================

interface ProductImportRow {
  name: string;
  sku: string;
  title?: string;
  price: string;
  compareAtPrice?: string;
  costPrice?: string;
  inventory?: string;
  weight?: string;
  isActive?: string;
}

/**
 * Import/update product variants from CSV
 * Note: This focuses on updating existing variants by SKU
 */
export async function importProductsFromCSV(
  csvContent: string,
  sellerId: string
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>
  };

  try {
    const rows: ProductImportRow[] = [];

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(csvContent);
      stream
        .pipe(csv())
        .on("data", (data) => rows.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header + 1-based index

      try {
        // Validate required fields
        if (!row.sku || !row.price) {
          results.errors.push({
            row: rowNumber,
            error: "Missing required fields: sku and price"
          });
          results.failed++;
          continue;
        }

        // Check if variant with SKU exists for this seller
        const existingVariant = await db.productVariant.findFirst({
          where: {
            sku: row.sku,
            product: {
              sellerId
            }
          }
        });

        if (existingVariant) {
          // Update existing variant
          await db.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              price: parseInt(row.price),
              compareAtPrice: row.compareAtPrice ? parseInt(row.compareAtPrice) : undefined,
              costPrice: row.costPrice ? parseInt(row.costPrice) : undefined,
              inventory: row.inventory ? parseInt(row.inventory) : undefined,
              weight: row.weight ? parseFloat(row.weight) : undefined,
              isActive: row.isActive?.toLowerCase() === "true" || true,
              title: row.title || undefined
            }
          });

          results.success++;
        } else {
          results.errors.push({
            row: rowNumber,
            error: `Variant with SKU '${row.sku}' not found for this seller. Please create products first.`
          });
          results.failed++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : "Unknown error"
        });
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error("Error importing products from CSV:", error);
    throw new ApiError(500, "Failed to import products from CSV");
  }
}

// ==================== Order CSV Export ====================

interface OrderCSVRow {
  masterOrderNumber: string;
  subOrderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  variantSKU: string;
  variantTitle: string;
  quantity: number;
  itemPrice: number;
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  sellerName: string;
}

/**
 * Export orders to CSV format
 */
export async function exportOrdersToCSV(
  sellerId?: string,
  filters?: {
    status?: string;
    paymentStatus?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<string> {
  try {
    // Build query
    const subOrders = await db.subOrder.findMany({
      where: {
        ...(sellerId ? { sellerId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {})
      },
      include: {
        masterOrder: {
          include: {
            customer: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        },
        seller: {
          select: {
            fullName: true,
            businessName: true
          }
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 1000 // Limit to avoid memory issues
    });

    // Convert to CSV rows
    const csvRows: OrderCSVRow[] = [];

    for (const subOrder of subOrders) {
      for (const item of subOrder.items) {
        csvRows.push({
          masterOrderNumber: subOrder.masterOrder.orderNumber,
          subOrderNumber: subOrder.subOrderNumber,
          orderDate: subOrder.masterOrder.createdAt.toISOString(),
          customerName: subOrder.masterOrder.customer.fullName,
          customerEmail: subOrder.masterOrder.customer.email,
          productName: item.variant.product.name,
          variantSKU: item.variant.sku,
          variantTitle: item.variant.title || "",
          quantity: item.quantity,
          itemPrice: item.variant.price,
          subtotal: Number(subOrder.subtotal),
          shippingFee: Number(subOrder.shippingFee),
          taxAmount: Number(subOrder.taxAmount),
          orderStatus: subOrder.status,
          paymentMethod: subOrder.masterOrder.paymentMethod || "",
          paymentStatus: subOrder.masterOrder.paymentStatus,
          sellerName: subOrder.seller.businessName || subOrder.seller.fullName
        });
      }
    }

    // Generate CSV string
    return new Promise((resolve, reject) => {
      const csvStream = format({ headers: true });
      const chunks: string[] = [];

      csvStream.on("data", (chunk) => chunks.push(chunk.toString()));
      csvStream.on("end", () => resolve(chunks.join("")));
      csvStream.on("error", reject);

      csvRows.forEach(row => csvStream.write(row));
      csvStream.end();
    });
  } catch (error) {
    console.error("Error exporting orders to CSV:", error);
    throw new ApiError(500, "Failed to export orders to CSV");
  }
}

// ==================== Inventory Update CSV ====================

interface InventoryUpdateRow {
  sku: string;
  inventory: string;
}

/**
 * Bulk update inventory from CSV
 */
export async function bulkUpdateInventoryFromCSV(
  csvContent: string,
  sellerId?: string
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ row: number; sku: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; sku: string; error: string }>
  };

  try {
    const rows: InventoryUpdateRow[] = [];

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(csvContent);
      stream
        .pipe(csv())
        .on("data", (data) => rows.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header + 1-based index

      try {
        // Validate required fields
        if (!row.sku || !row.inventory) {
          results.errors.push({
            row: rowNumber,
            sku: row.sku || "N/A",
            error: "Missing required fields: sku and inventory"
          });
          results.failed++;
          continue;
        }

        const newInventory = parseInt(row.inventory);
        if (isNaN(newInventory) || newInventory < 0) {
          results.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: "Invalid inventory value (must be a non-negative number)"
          });
          results.failed++;
          continue;
        }

        // Find variant
        const variant = await db.productVariant.findFirst({
          where: {
            sku: row.sku,
            ...(sellerId ? {
              product: {
                sellerId
              }
            } : {})
          }
        });

        if (!variant) {
          results.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: "Variant not found"
          });
          results.failed++;
          continue;
        }

        // Update inventory
        await db.productVariant.update({
          where: { id: variant.id },
          data: { inventory: newInventory }
        });

        results.success++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          sku: row.sku || "N/A",
          error: error instanceof Error ? error.message : "Unknown error"
        });
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error("Error updating inventory from CSV:", error);
    throw new ApiError(500, "Failed to update inventory from CSV");
  }
}
