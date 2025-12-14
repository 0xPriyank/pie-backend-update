import { z } from "zod";

const dimensionsSchema = z.object({
  length: z.string(),
  breadth: z.string(),
  height: z.string()
});

const ratePayloadSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  weight: z.string(),
  dimensions: dimensionsSchema,
  paymentType: z.enum(["cod", "prepaid"]),
  orderAmount: z.string()
});

const serviceabilitySchema = z.object({
  filterType: z.enum(["pincode", "courier"]).optional(),
  courierId: z.string().optional(),
  pincode: z.string().optional()
});

const pickupSchema = z.object({
  pickupWarehouseName: z.string(),
  pickupName: z.string(),
  pickupAddress: z.string(),
  pickupAddress2: z.string(),
  pickupPincode: z.string(),
  pickupPhone: z.string(),
  pickGstNumber: z.string()
});

const rtoSchema = z.object({
  rtoWarehouseName: z.string(),
  rtoName: z.string(),
  rtoAddress: z.string(),
  rtoAddress2: z.string(),
  rtoPincode: z.string(),
  rtoPhone: z.string(),
  rtoGstNumber: z.string()
});

const warehousePayloadSchema = z.object({
  pickup: pickupSchema,
  isRtoDifferent: z.enum(["yes", "no"]),
  rto: rtoSchema.optional()
});

const orderShipmentSchema = z.object({
  orderNumber: z.string(),
  shippingCharges: z.number(),
  discount: z.number(),
  codCharges: z.number(),
  paymentType: z.enum(["cod", "prepaid"]),
  orderAmount: z.number(),
  packageWeight: z.number(),
  packageLength: z.number(),
  packageBreadth: z.number(),
  packageHeight: z.number(),
  isDangerous: z.enum(["0", "1"]),
  tagIfAny: z.string().optional(),
  isRequestAutoPickup: z.enum(["yes", "no"]),
  isShipmentCreated: z.enum(["yes", "no"]),
  courierId: z.string(),
  pickupWarehouseId: z.string(),
  rtoWarehouseId: z.string(),
  consignee: z.object({
    consigneeName: z.string(),
    consigneeAddress: z.string(),
    consigneeAddress2: z.string().optional(),
    consigneeCity: z.string(),
    consigneeState: z.string(),
    consigneePincode: z.string(),
    consigneePhone: z.string()
  }),
  orderItems: z.array(
    z.object({
      orderItemName: z.string(),
      orderItemQty: z.string(),
      orderItemPrice: z.string(),
      orderItemSku: z.string()
    })
  ),
  qcCheck: z.number().optional(),
  brandName: z.string().optional(),
  productSize: z.string().optional(),
  productColor: z.string().optional(),
  orderCategoryId: z.string().optional(),
  productDamage: z.string().optional(),
  productUsage: z.string().optional(),
  uploadedImage1: z.string().optional(),
  uploadedImage2: z.string().optional(),
  uploadedImage3: z.string().optional(),
  uploadedImage4: z.string().optional(),
  productColourType: z.string().optional(),
  productSizeType: z.string().optional(),
  returnReason: z.string().optional()
});

const awbArraySchema = z.object({
  awbNumbers: z.array(z.string()).nonempty("AWB numbers cannot be empty")
});

const awbSingleSchema = z.object({
  awbNumber: z.string()
});

export {
  ratePayloadSchema,
  serviceabilitySchema,
  warehousePayloadSchema,
  orderShipmentSchema,
  awbArraySchema,
  awbSingleSchema
};
