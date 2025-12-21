import { Router } from "express";
import { env } from "@/config/env";
import db from "@/config/db.config";
import adminRoutes from "./admin/admin.routes";
import customerRoutes from "./customer/customer.routes";
import documentRoutes from "./document.routes";
import paymentRoutes from "./customer/payment.routes";
import productRoutes from "./product.routes";
import sellerPaymentRoutes from "./sellerPayment.routes";
import sellerRoutes from "./seller/seller.routes";
import uploadRoutes from "./upload.routes";
import categoryRoutes from "./category.routes";
import groupBuyRoutes from "./group-buy.routes";
import daakitRoutes from "./logistics/shipping.routes";
import productVariantRoutes from "./productVariant.routes";
import orderRoutes from "./order.routes";
import invoiceRoutes from "./invoice.routes";
import shipmentRoutes from "./shipment.routes";
import csvRoutes from "./csv.routes";

const router = Router();

// Base route for API v1
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to API v1",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${req.protocol}://${req.get("host")}/api/v1/healthz`,
      documentation: `${req.protocol}://${req.get("host")}/api/v1/docs`
    }
  });
});

router.get("/healthz", async (_req, res) => {
  const start = Date.now();
  let dbStatus = "connected";
  let dbLatency = null;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = "unreachable";
  }

  const latencyMs = Date.now() - start;

  const response = {
    status: dbStatus === "connected" ? "ok" : "degraded",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: dbStatus
    },
    latencyMs,
    components: {
      database: {
        latencyMs: dbLatency,
        status: dbStatus
      }
    }
  };

  res.status(dbStatus === "connected" ? 200 : 503).json(response);
});

router.get("/docs", (_req, res) => {
  res.redirect("https://developer.woohl.com");
});

router.use("/customer", customerRoutes);
router.use("/seller", sellerRoutes);
router.use("/payment", paymentRoutes);
router.use("/seller-payment", sellerPaymentRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productRoutes);
router.use("/document", documentRoutes);
router.use("/upload-file", uploadRoutes);
router.use("/category", categoryRoutes);
router.use("/group-buys", groupBuyRoutes);
router.use("/logistics", daakitRoutes);
router.use("/seller", productVariantRoutes);
router.use("/", orderRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/shipments", shipmentRoutes);
router.use("/csv", csvRoutes);

export default router;
