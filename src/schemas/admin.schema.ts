import { z } from "zod";

export const getAllUserSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10)
});

export const loginAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
