import { Router } from "express";
import {
  getCouriers,
  getRates,
  checkServiceability,
  createWarehouse,
  createOrderShipment,
  trackShipment,
  createManifest,
  cancelShipment,
  createLabel
} from "@/controllers/logistics/shipping.controller";

const router = Router();

router.get("/shipping/couriers", getCouriers);
router.post("/shipping/rates", getRates);
router.post("/shipping/serviceability", checkServiceability);
router.post("/warehouse", createWarehouse);
router.post("/orders/shipment", createOrderShipment);
router.get("/orders/track/:awbNumber", trackShipment);
router.post("/orders/manifest", createManifest);
router.post("/orders/cancel", cancelShipment);
router.post("/orders/label", createLabel);

export default router;
