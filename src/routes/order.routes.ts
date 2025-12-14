// ----CTP: Order Management Routes - Master/Sub-Order system
import { Router } from "express";
import * as masterOrderController from "../controllers/masterOrder.controller";
import * as subOrderController from "../controllers/subOrder.controller";
import { verifyJWT } from "../modules/auth/auth";

const router = Router();

// ----CTP: Customer Order Routes (Master Orders) - requires customer auth
router.post("/orders", verifyJWT("customer"), masterOrderController.createMasterOrder);
router.get("/orders", verifyJWT("customer"), masterOrderController.getCustomerOrders);
router.get("/orders/:orderId", verifyJWT("customer"), masterOrderController.getMasterOrderDetails);
router.post("/orders/:orderId/cancel", verifyJWT("customer"), masterOrderController.cancelMasterOrder);

// ----CTP: Seller Order Routes (Sub-Orders) - requires seller auth
router.get("/seller/sub-orders", verifyJWT("seller"), subOrderController.getSellerOrders);
router.get("/seller/sub-orders/dashboard/stats", verifyJWT("seller"), subOrderController.getSellerOrderStats);
router.get("/seller/sub-orders/:subOrderId", verifyJWT("seller"), subOrderController.getSubOrderDetails);
router.put("/seller/sub-orders/:subOrderId/status", verifyJWT("seller"), subOrderController.updateSubOrderStatus);
router.put("/seller/sub-orders/:subOrderId/tracking", verifyJWT("seller"), subOrderController.addTrackingInfo);
router.post("/seller/sub-orders/:subOrderId/accept", verifyJWT("seller"), subOrderController.acceptOrder);
router.post("/seller/sub-orders/:subOrderId/reject", verifyJWT("seller"), subOrderController.rejectOrder);

export default router;
