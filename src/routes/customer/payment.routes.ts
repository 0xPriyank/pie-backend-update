import { Router } from "express";
import { validate } from "@/middlewares/validation.middleware";
import { verifyJWT } from "@/modules/auth/auth";
import {
  initiatePaymentAttempt,
  capturePayment,
  verifyPayment
} from "@/controllers/payment.controller";
import {
  initiatePaymentSchema,
  capturePaymentSchema,
  verifyPaymentSchema
} from "@/schemas/payment.schema";

const router = Router();

router.use(verifyJWT("customer"));

router
  .route("/initiate-payment")
  .post(validate(initiatePaymentSchema, "body"), initiatePaymentAttempt);

router.route("/capture-payment").post(validate(capturePaymentSchema, "body"), capturePayment);

router.route("/verify-payment").post(validate(verifyPaymentSchema, "body"), verifyPayment);

export default router;
