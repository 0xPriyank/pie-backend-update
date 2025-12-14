import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { checkout } from "@/controllers/order.controller";
import {
  cancelOrder,
  createOrder,
  getCartSummary,
  getCustomerOrders,
  getOrderDetails,
  handleAbandonedPayment,
  handlePaymentFailure,
  validateCoupon,
  verifyPayment
} from "@/controllers/checkout.controller";
import { downloadInvoiceBySubOrder } from "@/controllers/invoice.controller";

const router = Router();

router.use(verifyJWT("customer"));

router.route("/").post(checkout);
router.route("/summary").get(getCartSummary);
router.route("/coupon/validate").post(validateCoupon);
router.route("/order").post(createOrder);
router.route("/orders").get(getCustomerOrders);
router.route("/orders/:orderId").get(getOrderDetails);
router.route("/orders/:orderId/cancel").post(cancelOrder);
// Note: Invoice download moved to /api/invoices/suborder/:subOrderId/download
router.route("/payment/verify").post(verifyPayment);
router.route("/payment/failure").post(handlePaymentFailure);
router.route("/payment/abandon").post(handleAbandonedPayment);

export default router;
