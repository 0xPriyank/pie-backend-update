import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env"
});

// Transform comma-separated strings into string[]
const csvToArray = z
  .string()
  .trim()
  .transform((val) => val.split(",").map((s) => s.trim()));

const durationRegex = /^\d+(s|m|h|d|w)$/; // e.g. 15m, 1h, 7d

// Schema for .env variables
const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .optional()
    .transform((val) => Number(val) || 4000),

  // CORS
  CORS_ORIGIN: csvToArray,
  CORS_CREDENTIALS: z
    .string()
    .trim()
    .transform((val) => val === "true"),
  CORS_EXPOSE_HEADERS: csvToArray,
  CORS_ALLOW_HEADERS: csvToArray,
  CORS_ALLOW_METHODS: csvToArray,
  CORS_MAX_AGE: z.string().trim().default("600").transform(Number),

  // Environment
  NODE_ENV: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => val === "development" || val === "production", {
      message: "NODE_ENV must be either 'development' or 'production'"
    })
    .default("development"),

  // Auth
  ACCESS_TOKEN_SECRET: z.string().trim().min(1, "ACCESS_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRY: z
    .string()
    .trim()
    .regex(durationRegex, "ACCESS_TOKEN_EXPIRY must be a duration like 1h, 15m, 7d")
    .default("1h"),

  REFRESH_TOKEN_SECRET: z.string().trim().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRY: z
    .string()
    .trim()
    .regex(durationRegex, "REFRESH_TOKEN_EXPIRY must be a duration like 1h, 15m, 7d")
    .default("15d"),

  // Database
  DATABASE_URL: z.string().trim().url({ message: "DATABASE_URL must be a valid URL" }),
  DIRECT_URL: z.string().trim().url().optional(),

  // OTP
  OTP_EXPIRY: z.string().trim().default("5").transform(Number),
  OTP_ATTEMPTS: z.string().trim().regex(/^\d+$/, "OTP_ATTEMPTS must be a number").transform(Number),
  OTP_LENGTH: z
    .string()
    .trim()
    .regex(/^\d+$/, "OTP_LENGTH must be a number")
    .optional()
    .transform((v) => parseInt(v || "6")),

  // Mail
  MAIL_USER: z.string().trim().min(1, "MAIL_USER is required"),
  MAIL_PASS: z.string().trim().min(1, "MAIL_PASS is required"),

  // Razorpay
  RAZORPAY_KEY: z.string().trim().min(1, "RAZORPAY_KEY is required"),
  RAZORPAY_SECRET: z.string().trim().min(1, "RAZORPAY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),

  // Cashfree
  CASHFREE_APP_ID: z.string().trim().optional(),
  CASHFREE_SECRET_KEY: z.string().trim().optional(),
  CASHFREE_WEBHOOK_SECRET: z.string().trim().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().trim().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().trim().min(1, "CLOUDINARY_API_SECRET is required"),
  CLOUDINARY_FOLDER_NAME: z.string().trim().min(1, "CLOUDINARY_FOLDER_NAME is required"),

  // ----CTP: AWS - Optional for S3 uploads
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
  AWS_REGION: z.string().trim().optional(),
  AWS_S3_BUCKET_NAME: z.string().trim().optional(),

  // ----CTP: Daakit - Optional for shipping integration
  DAAKIT_USERNAME: z.string().trim().optional(),
  DAAKIT_PASSWORD: z.string().trim().optional(),

  // ----CTP: Shipmozo - Phase 7 shipping integration
  SHIPMOZO_API_KEY: z.string().trim().optional(),
  SHIPMOZO_API_SECRET: z.string().trim().optional(),
  SHIPMOZO_BASE_URL: z.string().trim().url().optional(),
  SHIPMOZO_WEBHOOK_SECRET: z.string().trim().optional(),
  SHIPMOZO_DEFAULT_COURIER: z.string().trim().optional(),
  SHIPMOZO_PICKUP_ENABLED: z.string().trim().optional(),
  SHIPMOZO_COMPANY_NAME: z.string().trim().optional(),
  SHIPMOZO_PICKUP_NAME: z.string().trim().optional(),
  SHIPMOZO_PICKUP_PHONE: z.string().trim().optional(),
  SHIPMOZO_PICKUP_ADDRESS: z.string().trim().optional(),
  SHIPMOZO_PICKUP_CITY: z.string().trim().optional(),
  SHIPMOZO_PICKUP_STATE: z.string().trim().optional(),
  SHIPMOZO_PICKUP_PINCODE: z.string().trim().optional()
});

function getErrorMessage(entry: unknown): string[] {
  if (typeof entry === "object" && entry !== null && "_errors" in entry) {
    const errors = (entry as { _errors: string[] })._errors;
    return Array.isArray(errors) ? errors : [];
  }
  return [];
}

// Validate
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const formattedErrors = Object.entries(parsed.error.format())
    .filter(([key]) => key !== "_errors")
    .map(([key, value]) => {
      const errorMessages = getErrorMessage(value);
      return `${key}: ${errorMessages.join(", ")}`;
    })
    .join("\n");
  console.error("Invalid environment variables:\n", formattedErrors);
  throw new Error("Invalid or missing environment variables.");
}

export const env = parsed.data;
