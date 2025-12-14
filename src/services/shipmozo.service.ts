// shipmozo.service.ts - Shipmozo shipping partner integration
import db from "@/config/db.config";
import shipmozo from "@/config/shipmozo";
import { ApiError } from "@/utils/ApiError";
import { Prisma } from "@prisma/client";

/**
 * ====================================================================
 * Phase 7: Shipmozo Service
 * ====================================================================
 * Handles shipment creation, tracking, and label generation
 */

interface ShipmentAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface ShipmentItem {
  name: string;
  quantity: number;
  price: number;
  weight?: number;
}

interface CreateShipmentRequest {
  subOrderId: string;
  pickupAddress: ShipmentAddress;
  deliveryAddress: ShipmentAddress;
  items: ShipmentItem[];
  paymentMode: "prepaid" | "cod";
  codAmount?: number;
  weight?: number; // Total weight in kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  courierCode?: string;
}

interface ShipmentResponse {
  success: boolean;
  shipmozoOrderId: string;
  awbNumber: string;
  courierName: string;
  courierCode: string;
  trackingUrl: string;
  labelUrl?: string;
  expectedDeliveryDate?: string;
}

interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  remarks?: string;
}

/**
 * Create a shipment with Shipmozo
 * This is a mock implementation - replace with actual Shipmozo API calls
 */
export async function createShipment(
  request: CreateShipmentRequest
): Promise<ShipmentResponse> {
  try {
    // Validate SubOrder exists
    const subOrder = await db.subOrder.findUnique({
      where: { id: request.subOrderId },
      include: {
        masterOrder: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!subOrder) {
      throw new ApiError(404, "SubOrder not found");
    }

    // Check if shipment already exists
    const existingShipment = await db.shipmozoShipment.findUnique({
      where: { subOrderId: request.subOrderId }
    });

    if (existingShipment) {
      throw new ApiError(400, "Shipment already created for this SubOrder");
    }

    // Calculate total weight if not provided
    const totalWeight = request.weight || calculateTotalWeight(request.items);

    // Prepare Shipmozo API payload
    const shipmozoPayload = {
      order_id: subOrder.subOrderNumber,
      order_date: new Date().toISOString(),
      pickup_address: request.pickupAddress,
      delivery_address: request.deliveryAddress,
      items: request.items,
      payment_mode: request.paymentMode,
      cod_amount: request.codAmount || 0,
      weight: totalWeight,
      dimensions: request.dimensions || {
        length: 20,
        width: 15,
        height: 10
      },
      courier_code: request.courierCode || shipmozo.defaultCourier
    };

    console.log(`📦 Creating shipment for SubOrder ${request.subOrderId}...`);

    // **MOCK API CALL** - Replace with actual Shipmozo API
    // const response = await fetch(`${shipmozo.baseUrl}/shipments/create`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${shipmozo.apiKey}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify(shipmozoPayload)
    // });
    // const shipmentData = await response.json();

    // **MOCK RESPONSE** for development
    const mockShipmentData = {
      success: true,
      shipmozo_order_id: `SHIP-${Date.now()}`,
      awb_number: generateMockAWB(),
      courier_name: getCourierName(shipmozoPayload.courier_code),
      courier_code: shipmozoPayload.courier_code,
      tracking_url: `https://track.shipmozo.com/${generateMockAWB()}`,
      label_url: `https://labels.shipmozo.com/${generateMockAWB()}.pdf`,
      expected_delivery_date: getExpectedDeliveryDate(5)
    };

    // Save shipment to database
    const shipment = await db.shipmozoShipment.create({
      data: {
        subOrderId: request.subOrderId,
        shipmozoOrderId: mockShipmentData.shipmozo_order_id,
        awbNumber: mockShipmentData.awb_number,
        trackingNumber: mockShipmentData.awb_number,
        trackingUrl: mockShipmentData.tracking_url,
        courierName: mockShipmentData.courier_name,
        courierCode: mockShipmentData.courier_code,
        labelUrl: mockShipmentData.label_url,
        status: "LABEL_CREATED",
        trackingEvents: [] as Prisma.JsonArray
      }
    });

    console.log(`✅ Shipment created: ${shipment.awbNumber} (${shipment.courierName})`);

    return {
      success: true,
      shipmozoOrderId: mockShipmentData.shipmozo_order_id,
      awbNumber: mockShipmentData.awb_number,
      courierName: mockShipmentData.courier_name,
      courierCode: mockShipmentData.courier_code,
      trackingUrl: mockShipmentData.tracking_url,
      labelUrl: mockShipmentData.label_url,
      expectedDeliveryDate: mockShipmentData.expected_delivery_date
    };
  } catch (error) {
    console.error("Error creating shipment:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to create shipment");
  }
}

/**
 * Auto-create shipment for SubOrder after payment confirmation
 * Called from payment webhook or order confirmation
 */
export async function autoCreateShipmentForSubOrder(subOrderId: string): Promise<void> {
  try {
    const subOrder = await db.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        seller: {
          include: {
            sellerAddress: true
          }
        },
        masterOrder: {
          include: {
            customer: true,
            shippingAddress: true
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
      console.error(`SubOrder ${subOrderId} not found for shipment creation`);
      return;
    }

    // Only create shipment for CONFIRMED orders
    if (subOrder.status !== "CONFIRMED") {
      console.log(`SubOrder ${subOrderId} not confirmed yet, skipping shipment creation`);
      return;
    }

    // Check if shipment already exists
    const existingShipment = await db.shipmozoShipment.findUnique({
      where: { subOrderId }
    });

    if (existingShipment) {
      console.log(`Shipment already exists for SubOrder ${subOrderId}`);
      return;
    }

    // Prepare pickup address (seller)
    const pickupAddress: ShipmentAddress = {
      name: subOrder.seller.businessName || subOrder.seller.fullName,
      phone: subOrder.seller.sellerAddress?.contact || "",
      address: subOrder.seller.sellerAddress?.street || "",
      city: subOrder.seller.sellerAddress?.city || "",
      state: subOrder.seller.sellerAddress?.state || "",
      pincode: subOrder.seller.sellerAddress?.pincode || "",
      country: subOrder.seller.sellerAddress?.country || "India"
    };

    // Prepare delivery address (customer)
    const deliveryAddress: ShipmentAddress = {
      name: subOrder.masterOrder.shippingAddress.fullName || subOrder.masterOrder.customer.fullName,
      phone: subOrder.masterOrder.shippingAddress.contact || "",
      address: subOrder.masterOrder.shippingAddress.street || "",
      city: subOrder.masterOrder.shippingAddress.city || "",
      state: subOrder.masterOrder.shippingAddress.state || "",
      pincode: subOrder.masterOrder.shippingAddress.pincode || "",
      country: subOrder.masterOrder.shippingAddress.country || "India"
    };

    // Prepare items
    const items: ShipmentItem[] = subOrder.items.map((item) => ({
      name: item.variant.product.name,
      quantity: item.quantity,
      price: Number(item.price),
      weight: item.variant.weight || 0.5 // Default 500g per item
    }));

    // Determine payment mode (COD or prepaid)
    const paymentMode = subOrder.masterOrder.paymentMethod === "CASH_ON_DELIVERY" ? "cod" : "prepaid";
    const codAmount = paymentMode === "cod" ? Number(subOrder.masterOrder.finalAmount) : 0;

    // Create shipment
    await createShipment({
      subOrderId,
      pickupAddress,
      deliveryAddress,
      items,
      paymentMode,
      codAmount
    });

    console.log(`✅ Auto-created shipment for SubOrder ${subOrderId}`);
  } catch (error) {
    // Log error but don't fail the order confirmation
    console.error(`⚠️ Failed to auto-create shipment for SubOrder ${subOrderId}:`, error);
  }
}

/**
 * Get tracking information for a shipment
 */
export async function getShipmentTracking(subOrderId: string) {
  const shipment = await db.shipmozoShipment.findUnique({
    where: { subOrderId },
    include: {
      subOrder: {
        select: {
          subOrderNumber: true,
          status: true
        }
      }
    }
  });

  if (!shipment) {
    throw new ApiError(404, "Shipment not found for this SubOrder");
  }

  return {
    shipmentId: shipment.id,
    subOrderNumber: shipment.subOrder.subOrderNumber,
    awbNumber: shipment.awbNumber,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    courierName: shipment.courierName,
    courierCode: shipment.courierCode,
    status: shipment.status,
    currentLocation: shipment.currentLocation,
    pickupDate: shipment.pickupDate,
    deliveredDate: shipment.deliveredDate,
    trackingEvents: (shipment.trackingEvents as unknown as TrackingEvent[]) || [],
    labelUrl: shipment.labelUrl,
    manifestUrl: shipment.manifestUrl
  };
}

/**
 * Update shipment tracking from webhook
 */
export async function updateShipmentTracking(
  awbNumber: string,
  status: string,
  location: string,
  timestamp: string,
  remarks?: string
): Promise<void> {
  try {
    const shipment = await db.shipmozoShipment.findFirst({
      where: { awbNumber }
    });

    if (!shipment) {
      console.error(`Shipment not found for AWB ${awbNumber}`);
      return;
    }

    // Parse existing tracking events
    const existingEvents = Array.isArray(shipment.trackingEvents) 
      ? (shipment.trackingEvents as unknown as TrackingEvent[]) 
      : [];

    // Add new event
    const newEvent: TrackingEvent = {
      status,
      location,
      timestamp,
      remarks
    };

    const updatedEvents = [...existingEvents, newEvent];

    // Map Shipmozo status to our ShipmentStatus enum
    const mappedStatus = mapShipmozoStatus(status);

    // Update shipment
    await db.shipmozoShipment.update({
      where: { id: shipment.id },
      data: {
        status: mappedStatus,
        currentLocation: location,
        trackingEvents: updatedEvents as unknown as Prisma.JsonArray,
        ...(mappedStatus === "PICKED_UP" && !shipment.pickupDate ? { pickupDate: new Date(timestamp) } : {}),
        ...(mappedStatus === "DELIVERED" && !shipment.deliveredDate ? { deliveredDate: new Date(timestamp) } : {})
      }
    });

    console.log(`✅ Updated tracking for AWB ${awbNumber}: ${status}`);
  } catch (error) {
    console.error("Error updating shipment tracking:", error);
    throw new ApiError(500, "Failed to update shipment tracking");
  }
}

/**
 * Cancel a shipment
 */
export async function cancelShipment(subOrderId: string): Promise<void> {
  try {
    const shipment = await db.shipmozoShipment.findUnique({
      where: { subOrderId }
    });

    if (!shipment) {
      throw new ApiError(404, "Shipment not found");
    }

    if (shipment.status === "DELIVERED") {
      throw new ApiError(400, "Cannot cancel delivered shipment");
    }

    // **MOCK API CALL** - Replace with actual Shipmozo cancellation API
    // await fetch(`${shipmozo.baseUrl}/shipments/${shipment.shipmozoOrderId}/cancel`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${shipmozo.apiKey}`
    //   }
    // });

    await db.shipmozoShipment.update({
      where: { id: shipment.id },
      data: {
        status: "CANCELLED"
      }
    });

    console.log(`✅ Cancelled shipment ${shipment.awbNumber}`);
  } catch (error) {
    console.error("Error cancelling shipment:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to cancel shipment");
  }
}

/**
 * Helper Functions
 */

function calculateTotalWeight(items: ShipmentItem[]): number {
  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0.5; // Default 500g per item
    return total + (itemWeight * item.quantity);
  }, 0);
}

function generateMockAWB(): string {
  const prefix = "AWB";
  const randomNum = Math.floor(10000000000 + Math.random() * 90000000000);
  return `${prefix}${randomNum}`;
}

function getCourierName(courierCode: string): string {
  const couriers: Record<string, string> = {
    delhivery: "Delhivery",
    bluedart: "Blue Dart",
    xpressbees: "Xpressbees",
    dtdc: "DTDC",
    ecom: "Ecom Express",
    shadowfax: "Shadowfax"
  };
  return couriers[courierCode] || "Delhivery";
}

function getExpectedDeliveryDate(daysToAdd: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

function mapShipmozoStatus(shipmozoStatus: string): "PENDING" | "LABEL_CREATED" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION" | "RETURNED" | "CANCELLED" {
  const statusMap: Record<string, "PENDING" | "LABEL_CREATED" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION" | "RETURNED" | "CANCELLED"> = {
    "pending": "PENDING",
    "label_created": "LABEL_CREATED",
    "manifested": "LABEL_CREATED",
    "picked_up": "PICKED_UP",
    "in_transit": "IN_TRANSIT",
    "out_for_delivery": "OUT_FOR_DELIVERY",
    "delivered": "DELIVERED",
    "exception": "EXCEPTION",
    "returned": "RETURNED",
    "cancelled": "CANCELLED",
    "rto": "RETURNED"
  };

  return statusMap[shipmozoStatus.toLowerCase()] || "PENDING";
}
