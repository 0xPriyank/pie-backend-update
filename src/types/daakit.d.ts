// 1. Core API Response Interfaces
export interface LoginResponse {
  status: boolean;
  data: string; // token
}

export interface ApiResponse {
  status: boolean;
  message?: string;
}

// 2. Courier-related Interfaces
export interface Courier {
  id: string;
  name: string;
}

export interface CourierRate {
  id: string;
  name: string;
  freightCharges: number;
  codCharges: number;
  totalCharges: number;
  minWeight: number;
  chargeableWeight: number;
}

export interface PincodeServiceability {
  courierId: string;
  pincode: string;
  cod: "Y" | "N";
  prepaid: "Y" | "N";
}

export interface RatePayload {
  origin: string;
  destination: string;
  weight: string;
  paymentType: "cod" | "prepaid";
  orderAmount: string;
  dimensions: {
    length: string;
    breadth: string;
    height: string;
  };
}

export interface ServiceabilityPayload {
  courierId?: string;
  pincode: string;
}

// 3. Warehouse Interfaces
export interface Pickup {
  pickupWarehouseName: string;
  pickupName: string;
  pickupAddress: string;
  pickupAddress2?: string;
  pickupPincode: string;
  pickupPhone: string;
  pickGstNumber?: string;
}

export interface Rto {
  rtoWarehouseName: string;
  rtoName: string;
  rtoAddress: string;
  rtoAddress2?: string;
  rtoPincode: string;
  rtoPhone: string;
  rtoGstNumber?: string;
}

export interface WarehousePayload {
  pickup: Pickup;
  isRtoDifferent: "yes" | "no";
  rto?: Rto;
}

export interface WarehouseResponse extends ApiResponse {
  pickupWarehouseId: number;
  rtoWarehouseId: string;
}

// 4. Orders / Shipments Interfaces
export interface OrderItem {
  orderItemName: string;
  orderItemQty: string;
  orderItemPrice: string;
  orderItemSku: string;
}

export interface Consignee {
  consigneeName: string;
  consigneeAddress: string;
  consigneeAddress2?: string;
  consigneeCity: string;
  consigneeState: string;
  consigneePincode: string;
  consigneePhone: string;
}

export interface OrderShipmentPayload {
  orderNumber: string;
  shippingCharges: number;
  discount: number;
  codCharges: number;
  paymentType: "cod" | "prepaid";
  orderAmount: number;

  packageWeight: number;
  packageLength: number;
  packageBreadth: number;
  packageHeight: number;

  isDangerous: "0" | "1";
  tagIfAny?: string;
  isRequestAutoPickup: "yes" | "no";
  isShipmentCreated: "yes" | "no";

  courierId: string;
  pickupWarehouseId: string;
  rtoWarehouseId: string;

  consignee: Consignee;
  orderItems: OrderItem[];

  qcCheck?: number;
  brandName?: string;
  productSize?: string;
  productColor?: string;
  orderCategoryId?: string;
  productDamage?: string;
  productUsage?: string;
  uploadedImage1?: string;
  uploadedImage2?: string;
  uploadedImage3?: string;
  uploadedImage4?: string;
  productColourType?: string;
  productSizeType?: string;
  returnReason?: string;
}

export interface OrderShipmentResponse extends ApiResponse {
  awbNumber?: string;
}

export interface TrackShipmentHistory {
  date: string;
  location: string;
  status: string;
}

export interface TrackShipmentResponse extends ApiResponse {
  shipmentStatus: string;
  history?: TrackShipmentHistory[];
}

// 5. Manifest / Cancel / Label Interfaces
export interface CreateManifestPayload {
  awbNumbers: string[];
}

export interface CreateManifestResponse extends ApiResponse {
  manifestNumber?: string;
}

export interface CancelShipmentPayload {
  awbNumber: string;
}

export type CancelShipmentResponse = ApiResponse;

export interface CreateLabelPayload {
  awbNumbers: string[];
}

export interface Label {
  awbNumber: string;
  labelUrl: string;
}

export interface CreateLabelResponse extends ApiResponse {
  labels?: Label[];
}
