import { Router } from "express";
import { getDocumentByKey } from "../controllers/document.controller.js";
import { verifyJWT } from "@/modules/auth/auth.js";
import { validate } from "@/middlewares/validation.middleware";
import { documentKeySchema } from "@/schemas/document.schema";

const router = Router();

router.get("/key", validate(documentKeySchema, "body"), verifyJWT("admin"), getDocumentByKey);

export default router;
