import { Router } from "express";
import { validate } from "@/middlewares/validation.middleware";
import { verifyJWT } from "@/modules/auth/auth";
import {
  completeGroupBuy,
  createGroupBuy,
  deleteGroupBuy,
  getGroupBuyById,
  getGroupBuys,
  getMyGroupBuys,
  joinGroupBuy,
  leaveGroupBuy
} from "@/controllers/group-buy.controller";
import {
  createGroupBuySchema,
  getGroupBuyByIdSchema,
  completeGroupBuySchema,
  getGroupBuysQuerySchema
} from "@/schemas/group-buy.schema";

const router = Router();

router
  .route("/")
  .post(verifyJWT("customer"), validate(createGroupBuySchema, "body"), createGroupBuy)
  .get(validate(getGroupBuysQuerySchema, "query"), getGroupBuys);

router.get("/my", verifyJWT("customer"), getMyGroupBuys);

router
  .route("/:id")
  .get(validate(getGroupBuyByIdSchema, "params"), getGroupBuyById)
  .delete(verifyJWT("customer"), validate(getGroupBuyByIdSchema, "params"), deleteGroupBuy);

router.post(
  "/:id/join",
  verifyJWT("customer"),
  validate(getGroupBuyByIdSchema, "params"),
  joinGroupBuy
);

router.delete(
  "/:id/leave",
  verifyJWT("customer"),
  validate(getGroupBuyByIdSchema, "params"),
  leaveGroupBuy
);

router.patch(
  "/:id/complete",
  verifyJWT("customer"),
  validate(getGroupBuyByIdSchema, "params"),
  validate(completeGroupBuySchema, "body"),
  completeGroupBuy
);

export default router;
