import { z } from "zod";

export const userLoginSchema = z.object({
  name: z.string().min(1, "Name is required").max(50).optional(),
  email: z.string().email("Invalid email format").max(255),
  password: z.string().min(8, "Password must be at least 8 characters long").max(255),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  emailVerified: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  otp: z.string().optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, "Password must be at least 8 characters long").max(255),
  newPassword: z.string().min(8, "Password must be at least 8 characters long").max(255)
});

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email format").max(255)
});

export const verifyUserSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  otp: z.string().max(6).min(6)
});
