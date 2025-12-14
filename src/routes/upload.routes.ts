import { uploadfile } from "@/controllers/upload.controller";
import { upload } from "@/middlewares/multer.middleware";
import { verifyJWT } from "@/modules/auth/auth";
import { Router } from "express";

const router = Router();

router.use(verifyJWT("seller"));

router.post("/", upload.single("file"), uploadfile);

export default router;
