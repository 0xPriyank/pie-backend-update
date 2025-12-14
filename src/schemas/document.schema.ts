import { z } from "zod";

export const documentKeySchema = z.object({
  key: z.string().min(1, "Key is required").max(255)
});
