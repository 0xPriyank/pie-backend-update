import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import type { Request, Response, NextFunction } from "express";
import {
  createCookieOptions,
  generateAccessAndRefereshTokens,
  getModelAndInput,
  regenerateAccessToken,
  UserType
} from "./helpers";

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = env;

// 4. Authentication & Session Management
export function loginUser<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!password || !email) {
      throw new ApiError(400, "email and password is required");
    }

    const { model } = getModelAndInput(userType);

    // TODO: find a better way to do this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (model as any).findUnique({ where: { email: email, isVerified: true } });

    if (!user) {
      throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user, model);

    res
      .status(200)
      .cookie("accessToken", accessToken, createCookieOptions({ httpOnly: true }))
      .cookie("refreshToken", refreshToken, createCookieOptions({ httpOnly: true }))
      .cookie("s_flag", "true", createCookieOptions({ httpOnly: true }))
      .json(new ApiResponse(200, { accessToken, refreshToken }, "User logged In Successfully"));
  });
}

export function logoutUser<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(404, "User not signed in");
    }

    const { model } = getModelAndInput(userType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (model as any).update({ where: { id: req.user.id }, data: { refreshToken: "" } });

    res
      .status(200)
      .clearCookie("accessToken", createCookieOptions({ httpOnly: true, includeMaxAge: false }))
      .clearCookie("refreshToken", createCookieOptions({ httpOnly: true, includeMaxAge: false }))
      .clearCookie("s_flag", createCookieOptions({ httpOnly: true, includeMaxAge: false }))
      .json(new ApiResponse(200, {}, "User logged Out"));
  });
}

export function refreshAccessToken<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request");
    }

    try {
      const decodedToken = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET as string) as {
        id: string;
      };
      if (!decodedToken) {
        throw new ApiError(401, "Invalid refresh Token");
      }

      const { model } = getModelAndInput(userType);

      // TODO: find a better way to do this
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (model as any).findUnique({ where: { id: decodedToken.id } });

      if (!user) {
        throw new ApiError(401, "Invalid refresh token");
      }

      if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used");
      }

      const accessToken = await regenerateAccessToken(user);

      res
        .status(200)
        .cookie("accessToken", accessToken, createCookieOptions({ httpOnly: true }))
        .cookie("refreshToken", user.refreshToken, createCookieOptions({ httpOnly: true }))
        .cookie("s_flag", "true", createCookieOptions({ httpOnly: true }))
        .json(
          new ApiResponse(
            200,
            { accessToken, refreshToken: user.refreshToken as string },
            "Access token refreshed"
          )
        );
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
      }
    }
  });
}

export function verifyJWT<T extends UserType>(userType: T) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Unauthorized request");
      }

      const decodedToken = jwt.verify(token, ACCESS_TOKEN_SECRET as string) as jwt.JwtPayload & {
        user: { id: string; email: string };
      };

      if (userType === "seller") {
        const seller = await prisma.seller.findUnique({
          where: {
            id: decodedToken.id
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            contact: true,
            onboardingComplete: true
          }
        });

        if (!seller) {
          throw new ApiError(401, "Invalid Access Token");
        }

        req.user = {
          email: seller.email,
          id: seller.id,
          isOnboardingComplete: seller.onboardingComplete || false
        };
      } else {
        const { model } = getModelAndInput(userType);

        // TODO: find a better way to resolve, instead of "any"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await (model as any).findUnique({
          where: {
            id: decodedToken.id
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            contact: true
          }
        });
        if (!user) {
          throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(401, error?.message || "Invalid access token");
      }
    }
  });
}
