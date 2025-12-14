/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import otpGenerator from "otp-generator";
import { env } from "@/config/env";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import mailSender from "@/utils/mailSender";
import { verifyOtpSchema } from "@/schemas/base-user.schema";
import emailVerificationTemplate from "@/mail/templates/emailVerificationTemplate";
import passwordResetTemplate from "@/mail/templates/passwordResetTemplate";
import { getModelAndInput, UserType } from "./helpers";
import type { Request, Response } from "express";

const { OTP_ATTEMPTS, OTP_EXPIRY, OTP_LENGTH } = env;
const OTP_EXPIRY_MS = OTP_EXPIRY * 60 * 1000;

// ---------------------------
// Utility Functions
// ---------------------------

const generateOtp = (length: number) =>
  otpGenerator.generate(length, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });

const createResetToken = async () => {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(rawToken, 10);
  return { rawToken, hashedToken };
};

// ---------------------------
// Email Helpers
// ---------------------------

async function deliverVerificationEmail(email: string, otp: string) {
  try {
    await mailSender(email, "Email Verification", emailVerificationTemplate(otp));
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new ApiError(500, "Failed to send verification email");
  }
}

async function deliverPasswordResetEmail(email: string, link: string) {
  try {
    await mailSender(email, "Password Reset Request", passwordResetTemplate(link));
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new ApiError(500, "Failed to send password reset email");
  }
}

// ---------------------------
// Core OTP Logic
// ---------------------------

export const createOtpForEmail = async (email: string) => {
  const otp = generateOtp(OTP_LENGTH);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  const existingOtp = await prisma.otp.findUnique({ where: { email } });
  const attempts = (existingOtp?.attempts || 0) + 1;

  if (attempts > OTP_ATTEMPTS) {
    throw new ApiError(400, "OTP attempt limit exceeded");
  }

  await prisma.otp.upsert({
    where: { email },
    update: {
      otp,
      expiresAt,
      attempts,
      verified: false,
      resetToken: null,
      resetExpires: null
    },
    create: {
      email,
      otp,
      expiresAt,
      attempts,   
      createdAt: now
    }
  });

  // CTP: Commented out email sending for Render deployment (emails don't work on Render)
  // await deliverVerificationEmail(email, otp);
  
  // CTP: Return OTP instead of sending email for Render deployment
  return otp;
};

// ---------------------------
// Route Handlers
// ---------------------------

export function requestPasswordReset<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "Email is required");

    const { model } = getModelAndInput(userType);
    const user = await (model as any).findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    const { rawToken, hashedToken } = await createResetToken();
    const resetExpires = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.otp.upsert({
      where: { email },
      update: {
        resetToken: hashedToken,
        resetExpires,
        verified: true,
        attempts: { increment: 1 }
      },
      create: {
        email,
        otp: "",
        resetToken: hashedToken,
        resetExpires,
        verified: true,
        attempts: 1,
        createdAt: new Date(),
        expiresAt: new Date()
      }
    });

    const resetLink = `https://woohl.vercel.app/forgot-password?token=${rawToken}&email=${encodeURIComponent(
      email
    )}`;

    // CTP: Commented out email sending for Render deployment (emails don't work on Render)
    // await deliverPasswordResetEmail(email, resetLink);

    // CTP: Return reset link in response for Render deployment
    res.json(new ApiResponse(200, { link: resetLink }, "Password reset link generated: " + resetLink));
  });
}

export function requestEmailOtp<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "Email is required");

    const { model } = getModelAndInput(userType);
    const user = await (model as any).findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    // CTP: Original email sending logic (commented for Render deployment)
    // await createOtpForEmail(email);
    // res.json(new ApiResponse(200, {}, "OTP sent successfully"));

    // CTP: Return OTP in response for Render deployment (email sending doesn't work)
    const otp = await createOtpForEmail(email);
    res.json(new ApiResponse(200, { otp }, "OTP generated successfully. Use this OTP: " + otp));
  });
}

export function verifyEmailOtp<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const { model } = getModelAndInput(userType);

    const user = await (model as any).findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    const otpRecord = await prisma.otp.findUnique({ where: { email } });
    if (!otpRecord) throw new ApiError(400, "No OTP found. Please generate one first.");

    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw new ApiError(400, "OTP expired. Please request a new one.");
    }

    if (otp !== otpRecord.otp) {
      throw new ApiError(400, "Invalid OTP");
    }

    const { rawToken, hashedToken } = await createResetToken();
    const resetExpires = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: {
        resetToken: hashedToken,
        resetExpires,
        verified: true
      }
    });

    res.json(new ApiResponse(200, { resetToken: rawToken }, "OTP verified successfully"));
  });
}


