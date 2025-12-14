import db from "@/config/db.config";
import { env } from "@/config/env";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { ApiError } from "@/utils/ApiError";

const { NODE_ENV } = env;

export type UserType = "customer" | "seller" | "admin";

type CookieOptionsInput = {
  httpOnly?: boolean;
  includeMaxAge?: boolean;
};

// 1. Utility / Core Helpers
export function createCookieOptions({
  httpOnly = true,
  includeMaxAge = true
}: CookieOptionsInput = {}) {
  const baseOptions = {
    secure: httpOnly && NODE_ENV === "production",
    sameSite: "none" as const,
    path: "/",
    ...(includeMaxAge && { maxAge: 24 * 60 * 60 * 1000 }),
    httpOnly
  };

  return baseOptions;
}

export function getModelAndInput(userType: UserType) {
  switch (userType) {
    case "customer":
      return {
        model: db.customer
      };
    case "seller":
      return {
        model: db.seller
      };
    case "admin":
      return {
        model: db.admin
      };
    default:
      throw new Error(`Invalid user type: ${userType}`);
  }
}

// TODO: find a better way to resolve, instead of "any"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateAccessAndRefereshTokens = async (user: any, model: any) => {
  try {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // TODO: find a better way to resolve, instead of "any"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (model as any).update({
      where: {
        id: user.id
      },
      data: {
        refreshToken: refreshToken
      }
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error occured while generating Access and Refresh token : ", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// TODO: find a better way to resolve, instead of "any"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const regenerateAccessToken = async (user: any) => {
  try {
    const accessToken = generateAccessToken(user);
    return accessToken;
  } catch (error) {
    console.error("Error while generating Access Token : ", error);
    throw new ApiError(500, "Something went wrong while generating access token");
  }
};
