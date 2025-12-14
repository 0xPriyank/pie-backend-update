import { z } from "zod";
import { GroupBuyStatus } from "@prisma/client";

export const uuidParam = (name: string) =>
  z.object({
    [name]: z
      .string()
      .trim()
      .uuid({ message: `Invalid ${name}` })
  });

export const getGroupBuyByIdSchema = uuidParam("id");

// generic schema for pagination
export const paginationSchema = z.object({
  page: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val);
    if (typeof val === "number") return val;
    return undefined;
  }, z.number().int().positive("Page must be greater than 0").default(1)),
  limit: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val);
    if (typeof val === "number") return val;
    return undefined;
  }, z.number().int().positive("Limit must be greater than 0").max(50, "Limit must be less than 50").default(10))
});

export const createGroupBuySchema = z.object({
  productId: z
    .string({ required_error: "Product ID is required" })
    .trim()
    .uuid({ message: "Invalid product ID" }),

  requiredParticipants: z
    .number({ required_error: "Required participants is required" })
    .int("Required participants must be an integer")
    .min(2, "Minimum 2 participants required")
    .max(100, "Maximum 100 participants allowed"),

  discountPercentage: z
    .number({ required_error: "Discount percentage is required" })
    .min(1, "Discount must be at least 1%")
    .max(50, "Discount cannot exceed 50%"),

  expiresAt: z
    .string({ required_error: "Expiry date is required" })
    .datetime({ message: "Invalid expiry date format" })
    .refine((date) => new Date(date) > new Date(), { message: "Expiry date must be in the future" })
});

export const joinGroupBuySchema = z.object({
  groupBuyId: z
    .string({ required_error: "Group buy ID is required" })
    .trim()
    .uuid({ message: "Invalid group buy ID" })
});

export const completeGroupBuySchema = z.object({
  status: z.enum([GroupBuyStatus.SUCCESS, GroupBuyStatus.FAILED, GroupBuyStatus.EXPIRED], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status"
  })
});

export const getGroupBuysQuerySchema = z.object({
  status: z
    .enum([
      GroupBuyStatus.ACTIVE,
      GroupBuyStatus.SUCCESS,
      GroupBuyStatus.FAILED,
      GroupBuyStatus.EXPIRED
    ])
    .optional(),
  productId: z.string().uuid().optional(),
  creatorId: z.string().uuid().optional(),
  page: paginationSchema.shape.page,
  limit: paginationSchema.shape.limit
});

// Types
export type CreateGroupBuyInput = z.infer<typeof createGroupBuySchema>;
export type JoinGroupBuyInput = z.infer<typeof joinGroupBuySchema>;
export type CompleteGroupBuyInput = z.infer<typeof completeGroupBuySchema>;
export type GetGroupBuysQuery = z.infer<typeof getGroupBuysQuerySchema>;

// Response types
export interface GroupBuyResponse {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    discount: number;
    originalPrice: number;
    shortDescription: string;
    images: Array<{
      id: string;
      objectKey: string | null;
      alt: string;
      isMain: boolean;
    }>;
    seller: {
      id: string;
      businessName: string | null;
    };
  };
  creatorId: string;
  creator: {
    id: string;
    fullName: string;
    email: string;
  };
  requiredParticipants: number;
  currentParticipants: number;
  discountPercentage: number;
  status: GroupBuyStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  participants?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
    joinedAt: string;
  }>;
}

export interface GroupBuyListResponse {
  groupBuys: GroupBuyResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
