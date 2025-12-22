import {
  addImageToProductSchema,
  CreateProductInput,
  createProductSchema,
  paginationSchema,
  productIdSchema,
  ProductResponse,
  updateProductSchema
} from "@/schemas/product.schema";
import {
  registerUser,
  verifyUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  requestEmailOtp,
  verifyEmailOtp,
  resetPassword
} from "@/services/auth.service";
import { getDocumentUrl } from "@/services/upload.service";
import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { db as prisma } from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";

export const registerSeller = registerUser("seller");
export const verifySeller = verifyUser("seller");
export const loginSeller = loginUser("seller");
export const logoutSeller = logoutUser("seller");
export const refreshSellerToken = refreshAccessToken("seller");
export const changeSellerPassword = changeCurrentPassword("seller");
export const getSellerProfile = getCurrentUser();
export const updateSellerDetails = updateAccountDetails("seller");
export const sendSellerOtp = requestEmailOtp("seller");
// *-------------------------- Seller password reset controllers -------------------------- *//
export const sendSellerResetOTP = requestEmailOtp("seller");
export const verifySellerResetOTP = verifyEmailOtp("seller");
export const resetSellerPassword = resetPassword("seller");

// *-------------------------- Seller product controllers -------------------------- *//
const commonProductSelect = Prisma.validator<Prisma.ProductSelect>()({
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
  seller: {
    select: {
      id: true,
      businessName: true
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
      src: true
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
  Review: {
    select: {
      id: true,
      author: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      createdAt: true,
      rating: true,
      content: true
    }
  },
  tags: {
    select: {
      id: true,
      name: true
    }
  }
});

async function transformProduct(product: ProductResponse) {
  const images = await Promise.all(
    product.images.map(async ({ src, ...img }) => ({
      ...img,
      url: src ? src : img.objectKey ? await getDocumentUrl(img.objectKey) : null
    }))
  );

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

export const sellerCreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    sku,
    categories,
    shortDescription,
    description,
    price,
    discount,
    colorId,
    sizeId,
    stockAvailable,
    tags
  }: CreateProductInput = createProductSchema.parse(req.body);

  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized. Authentication required to create a product.");
  }

  const user = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!user) {
    throw new ApiError(404, "Seller not Found");
  }
  if (!user.isVerified) {
    throw new ApiError(400, "Seller is not verified. Please verify to create a product");
  }

  // Create the product
  const newProduct = await prisma.product.create({
    data: {
      name,
      sku,
      categories: {
        connect: categories.map((id) => ({ id }))
      },
      shortDescription,
      description,
      price,
      discount,
      inStock: stockAvailable > 0,
      stockAvailable,
      sellerId,
      colorId,
      sizeId,
      tags: {
        connect: tags.map((name) => ({ name }))
      }
    },
    select: commonProductSelect
  });

  const transformedProduct = await transformProduct(newProduct);
  res
    .status(201)
    .json(new ApiResponse(201, { product: transformedProduct }, "Product created successfully"));
});

export const sellerAddImageToProduct = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = req.user;
  const { productId, isMain, fileId } = addImageToProductSchema.parse(req.body);

  const product = await prisma.product.findUnique({
    where: { id: productId, isDeleted: false }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  if (product.sellerId !== currentUser?.id) {
    throw new ApiError(403, "You are not authorized to add an image to this product");
  }

  const existingImage = await prisma.file.findUnique({
    where: { id: fileId, sellerId: currentUser?.id },
    select: { id: true }
  });

  if (!existingImage) {
    throw new ApiError(404, "File not found");
  }

  const image = await prisma.file.update({
    where: { id: fileId, sellerId: currentUser?.id },
    data: {
      productId,
      isMain,
      alt: isMain ? "Main Image" : "Secondary Image",
      sellerId: currentUser?.id
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

  if (!image.src) {
    image.src = await getDocumentUrl(image.objectKey!);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        image: {
          id: image.id,
          src: image.src,
          alt: image.alt,
          isMain: image.isMain
        }
      },
      "Image added to product successfully"
    )
  );
});

export const sellerGetProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);

  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const products = await prisma.product.findMany({
    where: { sellerId, isDeleted: false },
    select: commonProductSelect,
    skip: (page - 1) * limit,
    take: limit
  });
  if (products.length == 0 && page == 1) {
    throw new ApiError(404, "No products found");
  }

  const transformedProducts = await Promise.all(products.map(transformProduct));

  const totalProducts = await prisma.product.count({
    where: { isDeleted: false }
  });
  const totalPages = Math.ceil(totalProducts / limit);
  const pagination = {
    currentPage: page,
    totalPages,
    totalProducts,
    pageSize: limit
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { products: transformedProducts, pagination },
        "Products fetched successfully"
      )
    );
});

export const sellerGetProductById = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = productIdSchema.parse(req.params);

  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized.");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, isDeleted: false },
    select: commonProductSelect
  });

  if (!product || product.seller.id !== sellerId) {
    throw new ApiError(404, "Product not found");
  }

  const transformedProduct = await transformProduct(product);

  res
    .status(200)
    .json(new ApiResponse(200, { product: transformedProduct }, "Product fetched successfully"));
});

export const sellerDeleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params as { productId: string };
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  if (product.sellerId !== sellerId) {
    throw new ApiError(403, "You are not authorized to delete this product");
  }

  await prisma.product.update({
    where: { id: productId, sellerId: sellerId, isDeleted: false },
    data: { isDeleted: true }
  });

  res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"));
});

export const sellerUpdateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params as { productId: string };
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: productId, isDeleted: false }
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }
  if (existingProduct.sellerId !== sellerId) {
    throw new ApiError(403, "You are not authorized to update this product");
  }
  const newProductData = updateProductSchema.parse(req.body);

  // NOTE: The below method doesn't work for nested queries
  // const newProductData: Prisma.ProductUpdateInput = {};

  // for (const key in req.body) {
  //   if (key !== undefined && key.trim() !== "") {
  //     newProductData[key as keyof Prisma.ProductUpdateInput] = req.body[key];
  //   }
  // }

  // if (Object.keys(newProductData).length === 0) {
  //   throw new ApiError(400, "No valid fields provided for update");
  // }

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name: newProductData.name,
      sku: newProductData.sku,
      shortDescription: newProductData.shortDescription,
      description: newProductData.description,
      price: newProductData.price,
      discount: newProductData.price,
      inStock: newProductData.inStock,
      stockAvailable: newProductData.stockAvailable,
      ...(newProductData.colorId && {
        color: {
          connect: { id: newProductData.colorId }
        }
      }),
      ...(newProductData.sizeId && { size: { connect: { id: newProductData.sizeId } } }),
      ...(newProductData.categories && {
        categories: { set: newProductData.categories.map((id) => ({ id })) }
      }),
      ...(newProductData.tags && {
        tags: {
          connect: newProductData.tags.map((name) => ({ name }))
        }
      })
    },
    select: commonProductSelect
  });

  const transformedProduct = await transformProduct(product);
  res
    .status(200)
    .json(new ApiResponse(200, { product: transformedProduct }, "Product updated successfully"));
});

export const sellerGetProductsByCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const products = await prisma.product.findMany({
    where: { categories: { some: { id: { equals: categoryId } } }, sellerId, isDeleted: false },
    select: commonProductSelect,
    skip: (page - 1) * limit,
    take: limit
  });

  if (page == 1 && products.length == 0) {
    throw new ApiError(404, "No products found in this category");
  }

  const transformedProducts = await Promise.all(products.map(transformProduct));

  const totalProducts = await prisma.product.count({
    where: { categories: { some: { id: { equals: categoryId } } }, isDeleted: false }
  });

  const totalPages = Math.ceil(totalProducts / limit);
  const pagination = {
    currentPage: page,
    totalPages,
    totalProducts,
    pageSize: limit
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { products: transformedProducts, pagination },
        "Products fetched successfully"
      )
    );
});

const sellerGetAllCategoryIds = async (categoryId: string, depth = 5): Promise<string[]> => {
  if (depth === 0) return [categoryId];

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subCategories: true }
  });

  if (!category) return [];

  const childIds = await Promise.all(
    category.subCategories.map((sub) => sellerGetAllCategoryIds(sub.id, depth - 1))
  );

  return [categoryId, ...childIds.flat()];
};

export const sellerGetProductsByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { categorySlug } = req.params as { categorySlug: string };

  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, sellerId: null },
    include: { subCategories: true }
  });

  if (!category) throw new ApiError(404, "Category not found");

  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const allCategoryIds = await sellerGetAllCategoryIds(category.id);

  const products = await prisma.product.findMany({
    where: {
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      },
      isDeleted: false,
      sellerId
    },
    select: commonProductSelect,
    skip: (page - 1) * limit,
    take: limit
  });

  const totalProducts = await prisma.product.count({
    where: {
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      },
      isDeleted: false
    }
  });

  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products: await Promise.all(products.map(transformProduct)),
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          pageSize: limit
        }
      },
      "Products fetched successfully"
    )
  );
});

//This takes a particular category and check for all subcategory and category product (Going to be used in frontend).
export const sellerGetProductsByAllCategoryId = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params as { categoryId: string };
    const { page, limit } = paginationSchema.parse(req.query);

    const allCategoryIds = await sellerGetAllCategoryIds(categoryId);

    const products = await prisma.product.findMany({
      where: {
        categories: {
          some: {
            id: { in: allCategoryIds }
          }
        },
        isDeleted: false
      },
      select: commonProductSelect,
      skip: (page - 1) * limit,
      take: limit
    });

    if (page === 1 && products.length === 0) {
      throw new ApiError(404, "No products found in this category");
    }

    const transformedProducts = await Promise.all(products.map(transformProduct));

    const totalProducts = await prisma.product.count({
      where: {
        categories: {
          some: {
            id: { in: allCategoryIds }
          }
        },
        isDeleted: false
      }
    });

    const totalPages = Math.ceil(totalProducts / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalProducts,
      pageSize: limit
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { products: transformedProducts, pagination },
          "Products fetched successfully"
        )
      );
  }
);
// basic seller info endpoint
export const getBasicSellerInfo = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    throw new ApiError(400, "Missing seller ID");
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: {
      fullName: true,
      rating: true,
      sellerAddress: {
        select: {
          street: true,
          city: true,
          state: true,
          country: true,
          pincode: true
        }
      },
      storefrontInfo: {
        select: { storeDescription: true }
      },
      File: {
        select: {
          src: true // Image URL
        },
        where: {
          isMain: true // Optional: if you only want the main image
        },
        take: 1 // Take only one image if multiple
      },
      Products: {
        select: {
          Review: {
            select: {
              authorId: true
            }
          }
        }
      }
    }
  });

  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  const allReviews = seller.Products.flatMap((p) => p.Review);
  const uniqueCustomerCount = new Set(allReviews.map((r) => r.authorId)).size;

  const address = seller.sellerAddress
    ? `${seller.sellerAddress.street}, ${seller.sellerAddress.city}, ${seller.sellerAddress.state}, ${seller.sellerAddress.country} - ${seller.sellerAddress.pincode}`
    : "";

  const imageUrl = seller.File.length > 0 ? seller.File[0].src : "";

  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: seller.fullName,
        bio: seller.storefrontInfo?.storeDescription || "",
        rating: seller.rating ?? 0,
        numberOfCustomersRated: uniqueCustomerCount,
        location: address,
        image: imageUrl
      },
      "Seller info fetched successfully"
    )
  );
});

// fetching the product names of a seller
export const getSellerProductNames = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    throw new ApiError(400, "Missing seller ID");
  }

  const products = await prisma.product.findMany({
    where: {
      sellerId,
      isDeleted: false,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      rating: true,
      reviewCount: true,
      stockAvailable: true
    }
  });

  res
    .status(200)
    .json(new ApiResponse(200, products, "Seller's product names fetched successfully"));
});
