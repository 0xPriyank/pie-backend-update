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
    name: string;
    sku: string;
    categories: string[];
    shortDescription: string;
    description: string;
    price: number;
    discount?: number;
    colorId: string;
    sizeId: string;
    stockAvailable: number;
    tags?: string[];
    details?: string[];
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
    throw new ApiError(
      400,
      `Product with SKU "${productData.sku}" already exists. Please use a unique SKU (e.g., change the number)`
    );
  }

  // Verify that categories exist
  const categories = await prisma.category.findMany({
    where: { id: { in: productData.categories } }
  });

  if (categories.length !== productData.categories.length) {
    throw new ApiError(
      400,
      `One or more categories not found. Please check category IDs in Prisma Studio`
    );
  }

  // Verify color exists
  const color = await prisma.color.findUnique({
    where: { id: productData.colorId }
  });

  if (!color) {
    throw new ApiError(400, `Color ID "${productData.colorId}" not found. Please create colors in Prisma Studio first`);
  }

  // Verify size exists
  const size = await prisma.size.findUnique({
    where: { id: productData.sizeId }
  });

  if (!size) {
    throw new ApiError(400, `Size ID "${productData.sizeId}" not found. Please create sizes in Prisma Studio first`);
  }

  // Auto-create tags if they don't exist
  if (productData.tags && productData.tags.length > 0) {
    await Promise.all(
      productData.tags.map((tagName) =>
        prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {}
        })
      )
    );
  }

  // Create the product
  try {
    const newProduct = await prisma.product.create({
      data: {
        name: productData.name,
        sku: productData.sku,
        categories: {
          connect: productData.categories.map((id) => ({ id }))
        },
        shortDescription: productData.shortDescription,
        description: productData.description,
        price: productData.price,
        discount: productData.discount || 0,
        originalPrice: productData.price,
        inStock: productData.stockAvailable > 0,
        stockAvailable: productData.stockAvailable,
        sellerId,
        colorId: productData.colorId,
        sizeId: productData.sizeId,
        details: productData.details || [],
        tags: productData.tags
          ? {
              connect: productData.tags.map((name) => ({ name }))
            }
          : undefined
      },
      select: commonProductSelect
    });

    return await transformProduct(newProduct);
  } catch (error: any) {
    // Handle Prisma-specific errors
    if (error.code === "P2002") {
      throw new ApiError(400, `Product with SKU "${productData.sku}" already exists. Use a unique SKU`);
    }
    if (error.code === "P2025") {
      throw new ApiError(400, "One or more related records (category, color, size, tag) not found");
    }
    throw new ApiError(500, `Failed to create product: ${error.message}`);
  }
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
