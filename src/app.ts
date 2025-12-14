import { env } from "@/config/env";
import { errorMiddleware } from "@/middlewares/error.middleware";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "@/config/db.config.js";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { Request, Response } from "express";
import v1 from "@/routes/v1.routes";
import "@/types/express-augmentations.js";

// ----CTP: Shopify-level routes
import productVariantRoutes from "@/routes/productVariant.routes";
import orderRoutes from "@/routes/order.routes";
import webhookRoutes from "@/routes/webhook.routes";
import invoiceRoutes from "@/routes/invoice.routes";
import shipmentRoutes from "@/routes/shipment.routes";
import csvRoutes from "@/routes/csv.routes";

const app = express();

// === Environment Setup ===
export const NODE_ENV = env.NODE_ENV;
const PORT = process.env.PORT || env.PORT || 4000;

// === Middleware Setup ===
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV !== "development",
    crossOriginEmbedderPolicy: NODE_ENV !== "development"
  })
);

const allowedOrigins = env.CORS_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow _requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: env.CORS_CREDENTIALS === true,
    exposedHeaders: env.CORS_EXPOSE_HEADERS,
    allowedHeaders: env.CORS_ALLOW_HEADERS,
    methods: env.CORS_ALLOW_METHODS,
    maxAge: env.CORS_MAX_AGE
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan("dev"));

// === Root Info Route ===
app.get("/", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(200).json({
    success: true,
    message: "Pie API Service",
    note: "Click on the 'url' values below to access the respective API versions",
    available_versions: {
      v1: {
        status: "active",
        route: "/api/v1",
        url: `${baseUrl}/api/v1`,
        documentation: `${baseUrl}/api/v1/docs`,
        description: "Version 1 of the Pie API"
      }
    },
    current_mode: NODE_ENV
  });
});

// === Health Check ===
app.get("/healthz", async (_req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).send("ok");
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).send("unhealthy");
  }
});

// === API Routes ===
app.use("/api/v1", v1);

// ----CTP: Shopify-level API routes
app.use("/api/seller", productVariantRoutes);
app.use("/api", orderRoutes);

// ----CTP: Phase 5 - Payment Webhook Routes (must be before express.json middleware)
app.use("/api/webhooks", webhookRoutes);

// ----CTP: Phase 6 - Invoice Routes
app.use("/api/invoices", invoiceRoutes);

// ----CTP: Phase 7 - Shipment Routes (Shipmozo Integration)
app.use("/api/shipments", shipmentRoutes);

// ----CTP: Phase 8 - CSV Import/Export Routes
app.use("/api/csv", csvRoutes);

// === Fallback Route ===
app.all("*", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    note: "Check the URL and try again"
  });
});

// === Error Handling Middleware ===
app.use(errorMiddleware);

// === Server Startup ===
app.listen(PORT, () => {
  const msg = NODE_ENV === "development" ? `http://localhost:${PORT}` : `PORT:${PORT}`;
  console.log(`Server is running on ${msg} in ${NODE_ENV} mode.`);
});
