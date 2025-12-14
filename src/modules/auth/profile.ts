import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import type { Request, Response } from "express";
import { getModelAndInput, UserType } from "./helpers";
import db from "@/config/db.config";

// 6. User Profile / Account Management
export function getCurrentUser() {
  return asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    // Fetch number of cart items for this user
    const cartItemsCount = await db.cartItem.count({
      where: {
        cart: {
          is: {
            customerId: userId
          }
        }
      }
    });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: req.user, cartItemCount: cartItemsCount },
          "User fetched successfully"
        )
      );
  });
}

export function getProfile<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new ApiError(401, "Unauthorized: User not found");
    }

    const { model } = getModelAndInput(userType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        contact: {
          select: {
            id: true,
            type: true,
            number: true,
            isVerified: true
          }
        },
        referralCode: true,
        loyaltyPoints: true,
        //isVerified: true,
        //isBlocked: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new ApiError(404, "User not found in database");
    }

    res.status(200).json(new ApiResponse(200, { user }, "User fetched successfully"));
  });
}

export function updateAccountDetails<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { fullName, dateOfBirth, gender, address } = req.body;

    if (!req.user?.id) {
      throw new ApiError(404, "User not found");
    }

    const { model } = getModelAndInput(userType);

    const updateData: Record<string, unknown> = {};

    if (fullName) updateData.fullName = fullName;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "At least one field must be provided to update");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedUser = await (model as any).update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        email: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        contact: {
          select: {
            id: true,
            type: true,
            number: true,
            isVerified: true
          }
        }
      }
    });

    res.status(200).json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
  });
}
