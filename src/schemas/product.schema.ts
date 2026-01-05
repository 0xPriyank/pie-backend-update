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
  title: z.string({ required_error: "Product title is required" }).min(1, "Product title cannot be empty"),
  
  description: z.string().optional(),
  
  shortDescription: z.string().optional(),
  
  sku: z.string({ required_error: "SKU is required" }).trim().min(1, "SKU cannot be empty"),
  
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  
  price: z.number({ required_error: "Price is required" }).nonnegative("Price cannot be negative"),
  
  compareAtPrice: z.number().nonnegative("Compare at price cannot be negative").optional(),
  
  inventory: z.object({
    trackQuantity: z.boolean().default(true),
    quantity: z.number().int().min(0, "Quantity cannot be negative").default(0)
  }),
  
  variants: z.array(z.object({
    id: z.string().optional(), // Client-generated ID (can be ignored server-side)
    options: z.array(z.object({
      name: z.string(),
      value: z.string()
    })),
    price: z.number().nonnegative("Variant price cannot be negative"),
    quantity: z.number().int().min(0, "Variant quantity cannot be negative")
  })).optional().default([]),
  
  images: z.array(z.object({
    url: z.string().url("Invalid image URL"),
    alt: z.string().optional().default("")
  })).optional().default([]),
  
  category: z.string().optional(), // Category name or slug
  
  tags: z.array(z.string()).optional().default([]),
  
  weight: z.number().positive("Weight must be positive").optional(),
  
  dimensions: z.object({
    length: z.number().positive("Length must be positive"),
    width: z.number().positive("Width must be positive"),
    height: z.number().positive("Height must be positive")
  }).optional()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

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

  images: z.array(imageSchema),

  // ----CTP: Shopify-style product options and variants
  options: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    values: z.array(z.object({
      id: z.string(),
      value: z.string(),
      position: z.number()
    }))
  })).optional(),
  productVariants: z.array(z.object({
    id: z.string(),
    sku: z.string(),
    title: z.string().nullable(),
    price: z.number(),
    compareAtPrice: z.number().nullable(),
    costPrice: z.number().nullable(),
    inventory: z.number(),
    weight: z.number().nullable(),
    position: z.number(),
    isActive: z.boolean(),
    imageId: z.string().nullable(),
    image: z.object({
      id: z.string(),
      objectKey: z.string().nullable(),
      src: z.string().nullable()
    }).nullable(),
    optionValues: z.array(z.object({
      id: z.string(),
      value: z.string(),
      position: z.number(),
      option: z.object({
        id: z.string(),
        name: z.string()
      })
    }))
  })).optional(),

  Review: z.array(reviewSchema),
  tags: z.array(tagsSchema)
});

export type ProductResponse = z.infer<typeof productResponseSchema>;
