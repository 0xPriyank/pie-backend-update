import { z } from "zod";

export const uuidParam = (name: string) =>
  z.object({
    [name]: z
      .string()
      .trim()
      .uuid({ message: `Invalid ${name}` })
  });

export const getProductByIdSchema = uuidParam("productId");
export const sellerIdSchema = uuidParam("sellerId");
export const categoryIdSchema = uuidParam("categoryId");
export const productIdSchema = uuidParam("productId");

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

export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .min(1, "Product name cannot be empty"),

  sku: z.string({ required_error: "sku is required" }).trim().min(1, "sku canot be empty"),

  categories: z.array(z.string().trim().uuid()),

  shortDescription: z.string().trim().min(1, "Short description cannot be empty"),

  description: z.string().trim().min(1, "description cannot be empty"),

  price: z
    .number({ required_error: "Price is required" })
    .nonnegative("Price cannot be negative")
    .refine((val) => val > 0, { message: "Price must be greater than 0" }),

  discount: z
    .number({ required_error: "Discount is required" })
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot be more than 100"),

  stockAvailable: z
    .number({ required_error: "Stock available is required" })
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative"),

  colorId: z.string({ required_error: "Color Id is required" }).uuid(),

  sizeId: z.string({ required_error: "Size Id is required" }).uuid(),
  tags: z.array(z.string())
});

export const addImageToProductSchema = z.object({
  productId: z.string().uuid(),
  isMain: z
    .string()
    .trim()
    .refine((val) => ["true", "false"].includes(val.toLowerCase()), {
      message: "isMain Must be 'true' or 'false'"
    })
    .transform((val) => val.toLowerCase() === "true"),
  fileId: z.string().uuid()
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").optional(),
  sku: z.string().trim().min(1, "sku cannot be empty").optional(),
  shortDescription: z.string().trim().min(1, "Short description is required").optional(),
  description: z.string().trim().min(1, "Product description is required").optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  stockAvailable: z.number().positive("Stock available must be a positive number").optional(),
  inStock: z.boolean().optional(),
  discount: z
    .number()
    .nonnegative("Discount must be 0 or more")
    .max(100, "Discount cannot be more than 100")
    .optional(),
  colorId: z.string().uuid("Invalid color ID").optional(),
  sizeId: z.string().uuid("Invalid size ID").optional(),
  categories: z.array(z.string().uuid("Invalid category ID")).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const getProductsByCategoryIdAndSellerIdSchema = z.object({
  categoryId: categoryIdSchema.shape.categoryId,
  sellerId: sellerIdSchema.shape.sellerId
});

export const categorySlugSchema = z.object({
  categorySlug: z.string().min(1, "Category slug is required")
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string()
});

const sellerSchema = z.object({
  id: z.string(),
  businessName: z.string().nullable()
});

const colorSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string()
});

const sizeSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string()
});

const variantSchema = z.object({
  name: z.string(),
  productId: z.string()
});

const imageSchema = z.object({
  id: z.string(),
  objectKey: z.string().nullable(),
  isMain: z.boolean(),
  alt: z.string(),
  src: z.string().url().nullable()
});

const authorSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  email: z.string().optional()
});

const reviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  createdAt: z.date(),
  content: z.string(),
  author: authorSchema
});

const tagsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1)
});

export const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  details: z.array(z.string()),
  shortDescription: z.string(),
  description: z.string(),
  price: z.number(),
  discount: z.number(),
  originalPrice: z.number(),
  inStock: z.boolean(),
  stockAvailable: z.number(),
  rating: z.number(),
  reviewCount: z.number(),

  categories: z.array(categorySchema),
  seller: sellerSchema,
  color: colorSchema,
  size: sizeSchema,

  variants: z.array(variantSchema),
  images: z.array(imageSchema),

  Review: z.array(reviewSchema),
  tags: z.array(tagsSchema)
});

export type ProductResponse = z.infer<typeof productResponseSchema>;
