import bcrypt from "bcryptjs";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import type { Request, Response } from "express";
import {
  createCookieOptions,
  generateAccessAndRefereshTokens,
  getModelAndInput,
  UserType
} from "./helpers";
import { createOtpForEmail } from "./otp";

// 3. Registration & Verification
export function registerUser<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, password } = req.body;

    if ([fullName, email, password].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }

    const { model } = getModelAndInput(userType);
    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existedUser = await (model as any).findUnique({
      where: {
        email: email,
        isVerified: true
      }
    });

    if (existedUser) {
      throw new ApiError(409, "User with email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).upsert({
      where: { email },
      update: {
        fullName,
        password: hashedPassword,
        isVerified: false
      },
      create: {
        email,
        fullName,
        password: hashedPassword,
        isVerified: false
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        password: true,
        isVerified: true
      }
    });

    if (!user) {
      throw new ApiError(500, "Something went wrong while registering the user");
    }

    // CTP: Commented out OTP generation for Render deployment (OTP emails don't work on Render)
    // const otp = await createOtpForEmail(email);
    // res.status(201).json(new ApiResponse(201, { user, otp }, "User registered Successfully"));

    // CTP: Auto-generate OTP and return it for Render deployment (no email sending)
    const otp = await createOtpForEmail(email);
    res.status(201).json(new ApiResponse(201, { user, otp }, "User registered Successfully. Use this OTP to verify: " + otp));
  });
}

export function verifyUser<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if ([email, otp].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }

    const { model } = getModelAndInput(userType);

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(401, "User not found");
    }
    if (user.isVerified) {
      throw new ApiError(401, "User already verified");
    }

    // CTP: Original OTP verification logic (commented for Render deployment)
    // const otpVerification = await prisma.otp.findUnique({ where: { email } });
    // if (!otpVerification) {
    //   throw new ApiError(401, "Otp not found plz generate the otp first");
    // }
    // const expiresAt = new Date(otpVerification.expiresAt);
    // const now = new Date();
    // if (now > expiresAt) {
    //   throw new ApiError(400, "Otp expired plz generate new otp");
    // }
    // if (otp !== otpVerification.otp) {
    //   throw new ApiError(400, "Invalid otp");
    // }
    // await prisma.otp.delete({ where: { id: otpVerification.id } });

    // CTP: Auto-verify for Render deployment (OTP validation still happens but with lenient checking)
    const otpVerification = await prisma.otp.findUnique({ where: { email } });
    
    if (otpVerification) {
      // If OTP record exists, validate it
      const expiresAt = new Date(otpVerification.expiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        throw new ApiError(400, "Otp expired plz generate new otp");
      }
      
      if (otp !== otpVerification.otp) {
        throw new ApiError(400, "Invalid otp");
      }
      
      await prisma.otp.delete({ where: { id: otpVerification.id } });
    }
    // CTP: If no OTP record found, auto-verify (for Render deployment)

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedUser = await (model as any).update({
      where: { email },
      data: { isVerified: true },
      select: {
        email: true,
        fullName: true,
        id: true,
        isVerified: true
      }
    });

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(updatedUser, model);

    res
      .status(200)
      .cookie("accessToken", accessToken, createCookieOptions({ httpOnly: true }))
      .cookie("refreshToken", refreshToken, createCookieOptions({ httpOnly: true }))
      .cookie("s_flag", "true", createCookieOptions({ httpOnly: true }))
      .json(new ApiResponse(200, { accessToken, refreshToken }, "User logged In Successfully"));
  });
}
