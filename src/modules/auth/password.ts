import bcrypt from "bcryptjs";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { resetPasswordSchema } from "@/schemas/base-user.schema";
import type { Request, Response } from "express";
import { getModelAndInput, UserType } from "./helpers";

// 5. Password Management
export function changeCurrentPassword<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if ([oldPassword, newPassword].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "old and new Passwords are required");
    }

    const { model } = getModelAndInput(userType);

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).findUnique({ where: { id: req.user?.id } });

    if (!user) {
      throw new ApiError(400, "User not found");
    }

    const isPasswordCorrect = await bcrypt.compare(oldPassword, user?.password);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (model as any).update({ where: { id: user.id }, data: { password: newHashedPassword } });

    res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
  });
}

export function resetPassword<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email, newPassword, resetToken } = resetPasswordSchema.parse(req.body);

    const { model } = getModelAndInput(userType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    const otpRecord = await prisma.otp.findUnique({ where: { email } });
    if (!otpRecord || !otpRecord.resetToken || !otpRecord.resetExpires) {
      throw new ApiError(400, "Reset token not set or OTP entry missing");
    }

    if (new Date() > new Date(otpRecord.resetExpires)) {
      throw new ApiError(400, "Reset token expired");
    }

    const isTokenValid = await bcrypt.compare(resetToken, otpRecord.resetToken);
    if (!isTokenValid) {
      throw new ApiError(400, "Invalid reset token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (model as any).update({
      where: { email },
      data: { password: hashedPassword, isVerified: true }
    });

    await prisma.otp.delete({ where: { email } });

    res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
  });
}
