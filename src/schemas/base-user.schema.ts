import { env } from "@/config/env";
import { z } from "zod";

export const emailOnlySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters long")
});

export const userSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(50),
  email: z.string().email("Invalid email format").max(255),
  password: z.string().min(8, "Password must be at least 8 characters long").max(255),
  role: z.enum(["CUSTOMER", "SELLER", "ADMIN"]).optional(),
  isVerified: z.boolean().optional(),
  refreshToken: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters long")
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters long"),
  otp: z
    .string()
    .trim()
    .length(6, `OTP must be exactly ${env.OTP_LENGTH || "6"} characters long`)
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters long"),
  newPassword: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .max(255, "Password must be at most 255 characters long"),
  resetToken: z.string().trim().min(1, "Reset token is required")
});

export type UserInput = z.infer<typeof userSchema>;
