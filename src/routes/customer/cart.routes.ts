import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { addToCart, getCart, updateCartItem } from "@/controllers/cart.controller";

const router = Router();

// *--------------------------- Cart routes -------------------------- *//
router.use(verifyJWT("customer"));

router.route("/").post(addToCart).get(getCart);

router.route("/:cartItemId").patch(updateCartItem);

export default router;
