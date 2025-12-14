import { env } from "./env";

/**
 * ====================================================================
 * Shipmozo Configuration
 * ====================================================================
 * Configuration for Shipmozo shipping partner integration
 */

export const shipmozo = {
  // API Configuration
  apiKey: env.SHIPMOZO_API_KEY || "",
  apiSecret: env.SHIPMOZO_API_SECRET || "",
  baseUrl: env.SHIPMOZO_BASE_URL || "https://api.shipmozo.com/v1",
  
  // Webhook Configuration
  webhookSecret: env.SHIPMOZO_WEBHOOK_SECRET || "",
  
  // Default Settings
  defaultCourier: env.SHIPMOZO_DEFAULT_COURIER || "delhivery", // delhivery, bluedart, xpressbees, etc.
  pickupEnabled: env.SHIPMOZO_PICKUP_ENABLED === "true" || false,
  
  // Shipment Configuration
  defaultPackagingType: "box", // box, envelope, bag
  defaultWeightUnit: "kg",
  defaultDimensionUnit: "cm",
  
  // Business Details
  companyName: env.SHIPMOZO_COMPANY_NAME || "PIE Commerce",
  pickupAddress: {
    name: env.SHIPMOZO_PICKUP_NAME || "PIE Warehouse",
    phone: env.SHIPMOZO_PICKUP_PHONE || "",
    address: env.SHIPMOZO_PICKUP_ADDRESS || "",
    city: env.SHIPMOZO_PICKUP_CITY || "",
    state: env.SHIPMOZO_PICKUP_STATE || "",
    pincode: env.SHIPMOZO_PICKUP_PINCODE || "",
    country: "India"
  }
};

// Validate configuration
export function validateShipmozoConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!shipmozo.apiKey) {
    errors.push("SHIPMOZO_API_KEY is not configured");
  }
  
  if (!shipmozo.apiSecret) {
    errors.push("SHIPMOZO_API_SECRET is not configured");
  }
  
  if (!shipmozo.pickupAddress.phone) {
    errors.push("SHIPMOZO_PICKUP_PHONE is not configured");
  }
  
  if (!shipmozo.pickupAddress.pincode) {
    errors.push("SHIPMOZO_PICKUP_PINCODE is not configured");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default shipmozo;
