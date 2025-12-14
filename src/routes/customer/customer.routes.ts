import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";
import {
  changePasswordSchema,
  sendOtpSchema,
  userLoginSchema,
  verifyUserSchema
} from "@/schemas/customer.schema";
import {
  registerCustomer,
  verifyCustomer,
  loginCustomer,
  logoutCustomer,
  changeCustomerPassword,
  getCustomerProfile,
  refreshCustomerToken,
  sendCustomerOtp,
  customerGetProductsBySellerId,
  getCustomerData,
  sendCustomerResetLink,
  resetCustomerPassword
} from "@/controllers/customer.controller";
import { resetPasswordSchema, userSchema } from "@/schemas/base-user.schema";
import { paginationSchema, sellerIdSchema } from "@/schemas/product.schema";

import { applyCoupon } from "@/controllers/couponUsage.controller";
import checkoutRoutes from "./checkout.routes";
import contactRoutes from "./contact.routes";
import addressesRoutes from "./addresses.routes";
import productRoutes from "../product.routes";
import wishlistRoutes from "./wishlist.routes";
import cartRoutes from "./cart.routes";
import returnRoutes from "./return.routes";

const router = Router();

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************

router.route("/register").post(validate(userSchema, "body"), registerCustomer);
router.route("/verify").post(validate(verifyUserSchema, "body"), verifyCustomer);
router.route("/login").post(validate(userLoginSchema, "body"), loginCustomer);
router.route("/logout").post(verifyJWT("customer"), logoutCustomer);
router.post("/sendotp", validate(sendOtpSchema, "body"), sendCustomerOtp);
router.post("/send-reset-link", validate(sendOtpSchema, "body"), sendCustomerResetLink);
router.route("/reset-password").post(validate(resetPasswordSchema, "body"), resetCustomerPassword);

// *--------------------------- Customer password reset routes -------------------------- *//
router.route("/refresh-token").post(refreshCustomerToken);
router
  .route("/change-password")
  .post(verifyJWT("customer"), validate(changePasswordSchema, "body"), changeCustomerPassword);
router.route("/current-user").get(verifyJWT("customer"), getCustomerProfile);
router.route("/profile").get(verifyJWT("customer"), getCustomerData);

router
  .route("/seller/:sellerId/product")
  .get(
    validate(paginationSchema, "query"),
    validate(sellerIdSchema, "params"),
    customerGetProductsBySellerId
  );

router.use("/addresses", addressesRoutes);
router.use("/cart", cartRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/contact", contactRoutes);
router.use("/product", productRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/returns", returnRoutes);

router.route("/couponApply").post(verifyJWT("customer"), applyCoupon);

export default router;
