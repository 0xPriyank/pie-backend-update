import { env } from "@/config/env";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

export const isPasswordCorrect = async (
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(inputPassword, hashedPassword);
};

export const generateAccessToken = (user: { id: string; email: string }): string => {
  const payload = {
    id: user.id,
    email: user.email
  };

  const options: SignOptions = {
    expiresIn: (env.ACCESS_TOKEN_EXPIRY ?? "1h") as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET as string, options);
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: (env.REFRESH_TOKEN_EXPIRY ?? "15d") as SignOptions["expiresIn"]
  });
};
