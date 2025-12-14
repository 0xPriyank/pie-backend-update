import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { getSellerOrderPayments } from "@/controllers/sellerPayment.controller";

const router = Router();

router.route("/orders").get(verifyJWT("seller"), getSellerOrderPayments);

export default router;
