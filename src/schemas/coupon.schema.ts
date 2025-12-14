import { z } from "zod";
const CouponTypeEnum = ["PERCENTAGE", "AMOUNT"] as const;

export const baseCouponSchema = z.object({
  couponCode: z
    .string()
    .trim()
    .min(3, { message: "Coupon code must be at least 3 characters long." })
    .max(50, { message: "Coupon code cannot exceed 50 characters." })
    .transform((val) => val.toUpperCase()),

  name: z.string().min(3, { message: "Coupon name is required." }),

  isActive: z.boolean().optional().default(false),

  couponType: z.enum(CouponTypeEnum, {
    required_error: "Coupon type is required."
  }),

  value: z.coerce
    .number({ required_error: "Discount value is required." })
    .positive({ message: "Value must be a positive number." }),

  startDate: z.coerce.date(),

  validity: z.coerce.date(),

  minimumAmount: z.coerce
    .number()
    .nonnegative({ message: "Minimum amount cannot be negative." })
    .default(0),

  maximumAmount: z.coerce
    .number()
    .positive({ message: "Maximum amount must be a positive number." }),

  specificCustomerEmail: z
    .array(z.string().email({ message: "Invalid email format." }))
    .optional()
    .default([]),

  productApplicable: z
    .array(z.string().uuid({ message: "Each product ID must be a valid UUID." }))
    .optional()
    .default([]),

  couponUsageLimit: z.coerce
    .number()
    .int({ message: "Coupon usage limit must be a whole number." })
    .positive({ message: "Coupon usage limit must be greater than 0." }),

  userUsageLimit: z.coerce
    .number()
    .int({ message: "User usage limit must be a whole number." })
    .positive({ message: "User usage limit must be greater than 0." })
});

export const createCouponSchema = baseCouponSchema
  .refine(
    (data) => {
      if (data.startDate && data.validity) {
        return data.validity > data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after the start date.",
      path: ["validity"]
    }
  )
  .refine(
    (data) => {
      return data.couponUsageLimit >= data.userUsageLimit;
    },
    {
      message: "The per-user usage limit cannot exceed the total coupon usage limit.",
      path: ["userUsageLimit"]
    }
  )
  .refine(
    (data) => {
      if (data.couponType === "PERCENTAGE") {
        return data.value > 0 && data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage value must be between 1 and 100.",
      path: ["value"]
    }
  );

export const bulkImportCouponSchema = z.array(baseCouponSchema).min(1, {
  message: "Please provide at least one coupon to create."
});

export const updateCouponSchema = baseCouponSchema.partial();
export type couponInput = z.infer<typeof createCouponSchema>;
export type updateCouponInput = z.infer<typeof updateCouponSchema>;
export type bulkCouponInput = z.infer<typeof bulkImportCouponSchema>;
