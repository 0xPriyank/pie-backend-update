import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";

import { changePasswordSchema, userLoginSchema } from "@/schemas/seller.schema";

import { sendOtpSchema, verifyUserSchema } from "@/schemas/customer.schema";
import { getBasicSellerInfo } from "@/controllers/seller.controller";
import { getSellerProductNames } from "@/controllers/seller.controller";

import {
  registerSeller,
  verifySeller,
  loginSeller,
  logoutSeller,
  refreshSellerToken,
  changeSellerPassword,
  getSellerProfile,
  updateSellerDetails,
  sendSellerOtp,
  sendSellerResetOTP,
  verifySellerResetOTP,
  resetSellerPassword
} from "@/controllers/seller.controller";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  userSchema,
  verifyOtpSchema
} from "@/schemas/base-user.schema";
import onboardingRouter from "./onboarding.routes";
import productRouter from "./product.routes";
import orderRouter from "./order.routes";
import returnRouter from "./return.routes";
import {
  getSellerContact,
  postSellerContact,
  updateSellerContact,
  verifySellerContactNumber,
  deleteSellerContact
} from "@/controllers/contact.controller";

import {
  createCoupon,
  getSellerCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  couponAnalytics,
  bulkCouponCreate
} from "@/controllers/seller/coupon.controller";

const router = Router();

//* -------------------------- Seller authentication routes -------------------------- *//
router.route("/register").post(validate(userSchema, "body"), registerSeller);
router.route("/verify").post(validate(verifyUserSchema, "body"), verifySeller);
router.route("/login").post(validate(userLoginSchema, "body"), loginSeller);
router.post("/sendotp", validate(sendOtpSchema, "body"), sendSellerOtp);
router.route("/logout").post(verifyJWT("seller"), logoutSeller);

//* -------------------------- Seller password reset routes -------------------------- *//
router.route("/send-reset-otp").post(validate(forgotPasswordSchema, "body"), sendSellerResetOTP);
router.route("/send-reset-link").post(validate(forgotPasswordSchema, "body"), sendSellerResetOTP);
router.route("/verify-reset-otp").post(validate(verifyOtpSchema, "body"), verifySellerResetOTP);
router.route("/reset-password").post(validate(resetPasswordSchema, "body"), resetSellerPassword);

//* -------------------------- Seller account routes ------------------------- *//
router
  .route("/change-password")
  .post(verifyJWT("seller"), validate(changePasswordSchema, "body"), changeSellerPassword);
router.route("/refresh-token").post(refreshSellerToken);
router.route("/current-user").get(verifyJWT("seller"), getSellerProfile);
router.route("/update-account").patch(verifyJWT("seller"), updateSellerDetails);
router.use("/onboarding", onboardingRouter);

//* -------------------------- Seller product and order routes -------------------------- *//
router.use("/product", productRouter);
router.use("/order", orderRouter);
router.use("/", returnRouter); // Returns and refunds routes

// basic seller info route
router.get("/:sellerId/basic-info", getBasicSellerInfo);

// seller product names route
router.get("/:sellerId/products", getSellerProductNames);

// seller contact routes
router.use(verifyJWT("seller"));
router
  .route("/contact")
  .get(getSellerContact)
  .post(postSellerContact)
  .put(updateSellerContact)
  .delete(deleteSellerContact);
router.route("/contact/verify/:contactNumber").post(verifySellerContactNumber);

// seller coupon routes
router.route("/coupon").post(createCoupon).get(getSellerCoupons);
router.route("/coupon/:couponId").get(getCoupon).put(updateCoupon).delete(deleteCoupon);
router.route("/coupon/analytic/:couponId").get(couponAnalytics);
router.route("/coupon/bulkCreate").post(bulkCouponCreate);

// basic seller info route (duplicate removed if necessary)
router.get("/:sellerId/basic-info", getBasicSellerInfo);

// TODO: implment add categories to product route

export default router;
