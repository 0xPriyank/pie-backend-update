import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import {
  deleteCustomerContact,
  getCustomerContact,
  postCustomerContact,
  updateCustomerContact,
  verifyCustomerContactNumber
} from "@/controllers/contact.controller";

const router = Router();

router.use(verifyJWT("customer"));

router
  .route("/")
  .get(getCustomerContact)
  .post(postCustomerContact)
  .put(updateCustomerContact)
  .delete(deleteCustomerContact);

router.route("/verify/:contactNumber").put(verifyCustomerContactNumber);

export default router;
