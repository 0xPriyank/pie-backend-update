import { Router } from "express";
import {
  getAllCustomers,
  getAllSellers,
  searchCustomers,
  searchSellers,
  deleteSeller,
  loginAdmin,
  logoutAdmin,
  refreshAdminToken,
  changeAdminPassword,
  getAdminProfile,
  sendAdminResetOTP,
  resetAdminPassword,
  registerAdmin,
  verifyAdmin,
  verifyAdminResetOTP,
  sendAdminOtp,
  adminGetProducts,
  adminGetProductsByCategoryIdAndSellerId,
  adminGetProductsByCategoryId,
  adminGetProductsByCategorySlug,
  adminGetProductsByAllCategoryId,
  adminGetProductById,
  adminGetProductsBySellerId
} from "@/controllers/admin.controller";
import {
  blockCustomer,
  blockSeller,
  unblockCustomer,
  unblockSeller
} from "@/controllers/blockUser.controller";
import { validate } from "@/middlewares/validation.middleware";
import { getAllUserSchema, loginAdminSchema } from "@/schemas/admin.schema"; // adjust path as needed
import { verifyJWT } from "@/modules/auth/auth";
import {
  emailOnlySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  userSchema,
  verifyOtpSchema
} from "@/schemas/base-user.schema";
import {
  categoryIdSchema,
  categorySlugSchema,
  getProductsByCategoryIdAndSellerIdSchema,
  paginationSchema,
  productIdSchema,
  sellerIdSchema
} from "@/schemas/product.schema";

const router = Router();

// admin auth routes
router.route("/register").post(validate(userSchema, "body"), registerAdmin);
router.route("/verify").post(validate(verifyOtpSchema, "body"), verifyAdmin);
router.route("/login").post(validate(loginAdminSchema, "body"), loginAdmin);
router.route("/logout").post(verifyJWT("admin"), logoutAdmin);
router.route("/refresh").post(verifyJWT("admin"), refreshAdminToken);
router.route("/change-password").post(verifyJWT("admin"), changeAdminPassword);
router.route("/profile").get(verifyJWT("admin"), getAdminProfile);
router.route("/sendotp").post(validate(emailOnlySchema, "body"), sendAdminOtp);
router.route("/current-user").get(verifyJWT("admin"), getAdminProfile);
router
  .route("/customers")
  .get(verifyJWT("admin"), validate(getAllUserSchema, "body"), getAllCustomers);
router.route("/sellers").get(verifyJWT("admin"), validate(getAllUserSchema, "body"), getAllSellers);
router
  .route("/customer/unblock")
  .patch(verifyJWT("admin"), validate(emailOnlySchema, "body"), unblockCustomer);
router
  .route("/seller/unblock")
  .patch(verifyJWT("admin"), validate(emailOnlySchema, "body"), unblockSeller);
router
  .route("/customer/block")
  .patch(verifyJWT("admin"), validate(emailOnlySchema, "body"), blockCustomer);
router
  .route("/seller/block")
  .patch(verifyJWT("admin"), validate(emailOnlySchema, "body"), blockSeller);
router
  .route("/customer/search")
  .get(verifyJWT("admin"), validate(emailOnlySchema, "body"), searchCustomers);
router
  .route("/seller/search")
  .get(verifyJWT("admin"), validate(emailOnlySchema, "body"), searchSellers);
router
  .route("/seller/delete")
  .delete(verifyJWT("admin"), validate(emailOnlySchema, "body"), deleteSeller);

//* -------------------------- Admin password reset routes -------------------------- *//
router.route("/send-reset-otp").post(validate(forgotPasswordSchema, "body"), sendAdminResetOTP);
router.route("/verify-reset-otp").post(validate(verifyOtpSchema, "body"), verifyAdminResetOTP);
router.route("/reset-password").post(validate(resetPasswordSchema, "body"), resetAdminPassword);

//* ---------------------------- Admin Product routes ----------------------------- *//
router
  .route("/product/all")
  .get(verifyJWT("admin"), validate(paginationSchema, "query"), adminGetProducts);
router
  .route("/product/category/:categoryId/seller/:sellerId")
  .get(
    verifyJWT("admin"),
    validate(paginationSchema, "query"),
    validate(getProductsByCategoryIdAndSellerIdSchema, "params"),
    adminGetProductsByCategoryIdAndSellerId
  );
router
  .route("/product/category/:categoryId")
  .get(
    verifyJWT("admin"),
    validate(categoryIdSchema, "params"),
    validate(paginationSchema, "query"),
    adminGetProductsByCategoryId
  );
router
  .route("/product/categorybyslug/:categorySlug")
  .get(
    verifyJWT("admin"),
    validate(categorySlugSchema, "params"),
    validate(paginationSchema, "query"),
    adminGetProductsByCategorySlug
  );
router
  .route("/product/allcategory/:categoryId")
  .get(verifyJWT("admin"), validate(categoryIdSchema, "params"), adminGetProductsByAllCategoryId);
router
  .route("/product/:productId")
  .get(verifyJWT("admin"), validate(productIdSchema, "params"), adminGetProductById);
router
  .route("/seller/:sellerId/product")
  .get(
    verifyJWT("admin"),
    validate(paginationSchema, "query"),
    validate(sellerIdSchema, "params"),
    adminGetProductsBySellerId
  );

export default router;
