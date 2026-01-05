import { Prisma } from "@prisma/client";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { getDocumentUrl } from "@/services/upload.service";

// Common product select for consistent data structure
export const commonProductSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  name: true,
  sku: true,
  description: true,
  shortDescription: true,
  price: true,
  originalPrice: true,
  discount: true,
  inStock: true,
  stockAvailable: true,
  rating: true,
  reviewCount: true,
  details: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  seller: {
    select: {
      id: true,
      businessName: true,
      fullName: true
    }
  },
  categories: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  images: {
    select: {
      id: true,
      objectKey: true,
      alt: true,
      isMain: true,
      src: true,
      format: true
    }
  },
  color: {
    select: {
      id: true,
      name: true,
      value: true
    }
  },
  size: {
    select: {
      id: true,
      name: true,
      value: true
    }
  },
  // ----CTP: Shopify-style product options and variants
  options: {
    select: {
      id: true,
      name: true,
      position: true,
      values: {
        select: {
          id: true,
          value: true,
          position: true
        },
        orderBy: {
          position: 'asc'
        }
      }
    },
    orderBy: {
      position: 'asc'
    }
  },
  productVariants: {
    select: {
      id: true,
      sku: true,
      title: true,
      price: true,
      compareAtPrice: true,
      costPrice: true,
      inventory: true,
      weight: true,
      position: true,
      isActive: true,
      imageId: true,
      image: {
        select: {
          id: true,
          objectKey: true,
          src: true
        }
      },
      optionValues: {
        select: {
          id: true,
          value: true,
          position: true,
          option: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      position: 'asc'
    }
  },
  tags: {
    select: {
      id: true,
      name: true
    }
  }
});

export type ProductWithRelations = Prisma.ProductGetPayload<{
  select: typeof commonProductSelect;
}>;

/**
 * Transform product data to include proper image URLs
 */
export async function transformProduct(product: ProductWithRelations) {
  const BATCH_SIZE = 10; // Define a batch size for pagination
  const images = [];

  for (let i = 0; i < product.images.length; i += BATCH_SIZE) {
    const batch = product.images.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ src, ...img }) => ({
        ...img,
        url: src ? src : img.objectKey ? await getDocumentUrl(img.objectKey) : null
      }))
    );
    images.push(...batchResults);
  }

  // Transform variant images
  const productVariants = product.productVariants ? await Promise.all(
    product.productVariants.map(async (variant: any) => {
      const variantImage = variant.image ? {
        ...variant.image,
        url: variant.image.src ? variant.image.src : variant.image.objectKey ? await getDocumentUrl(variant.image.objectKey) : null
      } : null;

      return {
        ...variant,
        image: variantImage
      };
    })
  ) : [];

  return {
    ...product,
    images,
    productVariants
  };
}

/**
 * Create a new product for a seller
 */
export async function createProduct(
  sellerId: string,
  productData: {
    title: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    status: "draft" | "active" | "archived";
    price: number;
    compareAtPrice?: number;
    inventory: {
      trackQuantity: boolean;
      quantity: number;
    };
    variants: Array<{
      id?: string;
      options: Array<{ name: string; value: string }>;
      price: number;
      quantity: number;
    }>;
    images: Array<{ url: string; alt: string }>;
    category?: string;
    tags: string[];
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  }
) {
  // Verify seller exists and is verified
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId }
  });

  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(400, "Seller is not verified. Please verify your account to create products");
  }

  // Check if SKU already exists
  const existingProduct = await prisma.product.findUnique({
    where: { sku: productData.sku }
  });

  if (existingProduct) {
    throw new ApiError(400, `Product with SKU "${productData.sku}" already exists`);
  }

  // Find or create category
  let categoryId: string | undefined;
  if (productData.category) {
    let category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: productData.category },
          { name: productData.category }
        ],
        sellerId: null // Global category
      }
    });

    if (!category) {
      // Create category if it doesn't exist
      const slug = productData.category.toLowerCase().replace(/\s+/g, '-');
      category = await prisma.category.create({
        data: {
          name: productData.category,
          slug,
          description: `Category for ${productData.category}`
        }
      });
    }
    categoryId = category.id;
  }

  // Create or find tags
  const tagIds: string[] = [];
  for (const tagName of productData.tags) {
    let tag = await prisma.tag.findFirst({
      where: { name: tagName }
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: tagName }
      });
    }
    tagIds.push(tag.id);
  }

  // Get default color and size (or create placeholder ones)
  let defaultColor = await prisma.color.findFirst();
  if (!defaultColor) {
    defaultColor = await prisma.color.create({
      data: { name: "Default", value: "#000000" }
    });
  }

  let defaultSize = await prisma.size.findFirst();
  if (!defaultSize) {
    defaultSize = await prisma.size.create({
      data: { name: "Default", value: "OS" }
    });
  }

  // Create product
  const product = await prisma.product.create({
    data: {
      name: productData.title,
      sku: productData.sku,
      description: productData.description || "",
      shortDescription: productData.shortDescription || "",
      price: Math.round(productData.price), // Convert to integer (cents)
      compareAtPrice: productData.compareAtPrice ? Math.round(productData.compareAtPrice) : null,
      originalPrice: Math.round(productData.price),
      discount: 0,
      stockAvailable: productData.inventory.quantity,
      trackQuantity: productData.inventory.trackQuantity,
      inStock: productData.inventory.quantity > 0,
      weight: productData.weight,
      dimensions: productData.dimensions,
      status: productData.status,
      isActive: productData.status === "active",
      sellerId,
      colorId: defaultColor.id,
      sizeId: defaultSize.id,
      categories: categoryId
        ? {
            connect: [{ id: categoryId }]
          }
        : undefined,
      tags: tagIds.length > 0
        ? {
            connect: tagIds.map((id) => ({ id }))
          }
        : undefined
    }
  });

  // Extract unique option names from variants
  const optionNamesSet = new Set<string>();
  for (const variant of productData.variants) {
    for (const option of variant.options) {
      optionNamesSet.add(option.name);
    }
  }

  // Create product options
  const optionMap = new Map<string, { optionId: string; values: Map<string, string> }>();
  let position = 0;

  for (const optionName of optionNamesSet) {
    const productOption = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: optionName,
        position: position++
      }
    });

    optionMap.set(optionName, {
      optionId: productOption.id,
      values: new Map()
    });
  }

  // Create option values and variants
  let variantPosition = 0;

  for (const variantData of productData.variants) {
    // Create/get option values for this variant
    const optionValueIds: string[] = [];

    for (const option of variantData.options) {
      const optionInfo = optionMap.get(option.name);
      if (!optionInfo) continue;

      let optionValueId = optionInfo.values.get(option.value);

      if (!optionValueId) {
        const optionValue = await prisma.productOptionValue.create({
          data: {
            optionId: optionInfo.optionId,
            value: option.value,
            position: optionInfo.values.size
          }
        });
        optionValueId = optionValue.id;
        optionInfo.values.set(option.value, optionValueId);
      }

      optionValueIds.push(optionValueId);
    }

    // Generate variant title from options
    const variantTitle = variantData.options.map((opt) => opt.value).join(" / ");

    // Generate variant SKU
    const variantSku = `${productData.sku}-${variantData.options
      .map((opt) => opt.value.substring(0, 3).toUpperCase())
      .join("-")}`;

    // Create product variant
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: variantSku,
        title: variantTitle,
        price: Math.round(variantData.price),
        inventory: variantData.quantity,
        position: variantPosition++,
        optionValues: {
          connect: optionValueIds.map((id) => ({ id }))
        }
      }
    });
  }

  // Handle images (download and store them)
  for (const imageData of productData.images) {
    // For now, we'll store the URL directly
    // In production, you'd want to download and upload to your storage
    await prisma.file.create({
      data: {
        objectKey: imageData.url,
        src: imageData.url,
        alt: imageData.alt,
        mimeType: "image/jpeg",
        format: "jpg",
        productId: product.id,
        sellerId,
        isMain: false
      }
    });
  }

  // Fetch and return the created product with relations
  const createdProduct = await prisma.product.findUnique({
    where: { id: product.id },
    select: commonProductSelect
  });

  if (!createdProduct) {
    throw new ApiError(500, "Failed to create product");
  }

  return await transformProduct(createdProduct);
}

/**
 * Get all products for a specific seller with pagination
 */
export async function getSellerProducts(sellerId: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const products = await prisma.product.findMany({
    where: {
      sellerId,
      isDeleted: false
    },
    select: commonProductSelect,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" }
  });

  const totalProducts = await prisma.product.count({
    where: {
      sellerId,
      isDeleted: false
    }
  });

  const transformedProducts = await Promise.all(products.map(transformProduct));

  return {
    products: transformedProducts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      pageSize: limit
    }
  };
}

/**
 * Get a specific product by ID for a seller
 */
export async function getSellerProductById(productId: string, sellerId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId,
      isDeleted: false
    },
    select: commonProductSelect
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return await transformProduct(product);
}

/**
 * Update a product for a seller
 */
export async function updateProduct(
  productId: string,
  sellerId: string,
  updateData: {
    name?: string;
    sku?: string;
    categories?: string[];
    shortDescription?: string;
    description?: string;
    price?: number;
    discount?: number;
    colorId?: string;
    sizeId?: string;
    stockAvailable?: number;
    tags?: string[];
    details?: string[];
    isActive?: boolean;
  }
) {
  // Check if product exists and belongs to seller
  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId,
      isDeleted: false
    }
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

  // Check if SKU is being changed and if new SKU already exists
  if (updateData.sku && updateData.sku !== existingProduct.sku) {
    const skuExists = await prisma.product.findUnique({
      where: { sku: updateData.sku }
    });

    if (skuExists) {
      throw new ApiError(400, "Product with this SKU already exists");
    }
  }

  // Prepare update data
  const updatePayload: Prisma.ProductUpdateInput = {};

  if (updateData.name) updatePayload.name = updateData.name;
  if (updateData.sku) updatePayload.sku = updateData.sku;
  if (updateData.shortDescription) updatePayload.shortDescription = updateData.shortDescription;
  if (updateData.description) updatePayload.description = updateData.description;
  if (updateData.price !== undefined) {
    updatePayload.price = updateData.price;
    updatePayload.originalPrice = updateData.price;
  }
  if (updateData.discount !== undefined) updatePayload.discount = updateData.discount;
  if (updateData.stockAvailable !== undefined) {
    updatePayload.stockAvailable = updateData.stockAvailable;
    updatePayload.inStock = updateData.stockAvailable > 0;
  }
  if (updateData.details) updatePayload.details = updateData.details;
  if (updateData.isActive !== undefined) updatePayload.isActive = updateData.isActive;

  // Handle color and size updates
  if (updateData.colorId) {
    updatePayload.color = { connect: { id: updateData.colorId } };
  }
  if (updateData.sizeId) {
    updatePayload.size = { connect: { id: updateData.sizeId } };
  }

  // Handle categories update
  if (updateData.categories) {
    updatePayload.categories = {
      set: updateData.categories.map((id) => ({ id }))
    };
  }

  // Handle tags update
  if (updateData.tags) {
    updatePayload.tags = {
      set: updateData.tags.map((name) => ({ name }))
    };
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updatePayload,
    select: commonProductSelect
  });

  return await transformProduct(updatedProduct);
}

/**
 * Delete a product (soft delete)
 */
export async function deleteProduct(productId: string, sellerId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId,
      isDeleted: false
    }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });

  return { message: "Product deleted successfully" };
}

/**
 * Get all category IDs including subcategories (iterative breadth-first traversal)
 */
export async function getAllCategoryIds(categoryId: string, depth = 5): Promise<string[]> {
  const result: string[] = [];
  const queue: { id: string; level: number }[] = [{ id: categoryId, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (level >= depth) continue;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { subCategories: true }
    });

    if (!category) continue;

    result.push(id);
    category.subCategories.forEach((sub) => {
      queue.push({ id: sub.id, level: level + 1 });
    });
  }

  return result;
}

/**
 * Get products by category for a seller
 */
export async function getSellerProductsByCategory(
  sellerId: string,
  categoryId: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  const products = await prisma.product.findMany({
    where: {
      sellerId,
      isDeleted: false,
      categories: {
        some: { id: categoryId }
      }
    },
    select: commonProductSelect,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" }
  });

  const totalProducts = await prisma.product.count({
    where: {
      sellerId,
      isDeleted: false,
      categories: {
        some: { id: categoryId }
      }
    }
  });

  const transformedProducts = await Promise.all(products.map(transformProduct));

  return {
    products: transformedProducts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      pageSize: limit
    }
  };
}

/**
 * Get products by category slug for a seller (includes subcategories)
 */
export async function getSellerProductsByCategorySlug(
  sellerId: string,
  categorySlug: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  // Find category by slug
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, sellerId: null },
    include: { subCategories: true }
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Get all category IDs including subcategories
  const allCategoryIds = await getAllCategoryIds(category.id);

  const products = await prisma.product.findMany({
    where: {
      sellerId,
      isDeleted: false,
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      }
    },
    select: commonProductSelect,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" }
  });

  const totalProducts = await prisma.product.count({
    where: {
      sellerId,
      isDeleted: false,
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      }
    }
  });

  const transformedProducts = await Promise.all(products.map(transformProduct));

  return {
    products: transformedProducts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      pageSize: limit
    }
  };
}

/**
 * Add image to product
 */
export async function addImageToProduct(
  productId: string,
  sellerId: string,
  fileId: string,
  isMain: boolean = false
) {
  // Check if product exists and belongs to seller
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId,
      isDeleted: false
    }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if file exists and belongs to seller
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      sellerId
    }
  });

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  // If setting as main image, unset other main images for this product
  if (isMain) {
    await prisma.file.updateMany({
      where: {
        productId,
        isMain: true
      },
      data: { isMain: false }
    });
  }

  // Update the file to link it to the product
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      productId,
      isMain,
      alt: isMain ? "Main Image" : "Secondary Image"
    },
    select: {
      id: true,
      objectKey: true,
      src: true,
      alt: true,
      isMain: true,
      format: true
    }
  });

  // Generate URL if not present
  if (!updatedFile.src && updatedFile.objectKey) {
    updatedFile.src = await getDocumentUrl(updatedFile.objectKey);
  }

  return updatedFile;
}
