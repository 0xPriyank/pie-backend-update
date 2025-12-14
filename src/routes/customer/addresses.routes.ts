import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import {
  createShippingAddress,
  deleteShippingAddress,
  getCustomerShippingAddresses,
  updateShippingAddress,
  changeMainStatus
} from "@/controllers/shippingAddress.controller";

const router = Router();

router.use(verifyJWT("customer"));

router.route("/").post(createShippingAddress).get(getCustomerShippingAddresses);

router
  .route("/:addressId")
  .delete(deleteShippingAddress)
  .put(updateShippingAddress)
  .patch(changeMainStatus); // TODO: Consider if this should be a separate route

router.patch("/:addressId/main", changeMainStatus);

export default router;
