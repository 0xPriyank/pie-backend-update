import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { addToWishlist, deleteFromWishlist, getWishlist } from "@/controllers/wishlist.controller";

const router = Router();

// *--------------------------- Wishlist routes -------------------------- *//
router.use(verifyJWT("customer"));

router.route("/").post(addToWishlist).get(getWishlist);

router.route("/:productId").delete(deleteFromWishlist);

export default router;
