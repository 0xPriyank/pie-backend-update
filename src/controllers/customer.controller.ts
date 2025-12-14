import { paginationSchema, ProductResponse } from "@/schemas/product.schema";
import {
  registerUser,
  verifyUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  // updateAccountDetails,
  requestEmailOtp,
  // verifyEmailOtp,
  // resetPassword,
  requestPasswordReset,
  resetPassword,
  getProfile,
  verifyEmailOtp
} from "@/services/auth.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/ApiError";
import { getDocumentUrl } from "@/services/upload.service";
import { ApiResponse } from "@/utils/ApiResponse";

export const registerCustomer = registerUser("customer");
export const verifyCustomer = verifyUser("customer");
export const loginCustomer = loginUser("customer");
export const logoutCustomer = logoutUser("customer");
export const refreshCustomerToken = refreshAccessToken("customer");
export const changeCustomerPassword = changeCurrentPassword("customer");
export const getCustomerProfile = getCurrentUser();
export const getCustomerData = getProfile("customer");
// export const updateCustomerDetails = updateAccountDetails("customer");
export const sendCustomerOtp = requestEmailOtp("customer");

// *-------------------------- Customer password reset controllers -------------------------- *//
// export const sendCustomerResetOTP = requestEmailOtp("customer");
// export const verifyCustomerResetOTP = verifyEmailOtp("customer");;
export const verifyCustomerResetOTP = verifyEmailOtp("customer");
export const sendCustomerResetLink = requestPasswordReset("customer");
export const resetCustomerPassword = resetPassword("customer");

// *-------------------------- Customer Product controllers -------------------------- *//
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
  variants: {
    select: {
      productId: true,
      name: true
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

  return {
    ...product,
    images
  };
}

// export const customerGetProducts = asyncHandler(async (req: Request, res: Response) => {
//   const { page, limit } = paginationSchema.parse(req.query);

//   const products = await prisma.product.findMany({
//     where: { isDeleted: false },
//     select: commonProductSelect,
//     skip: (page - 1) * limit,
//     take: limit
//   });
//   if (products.length == 0 && page == 1) {
//     throw new ApiError(404, "No products found");
//   }

//   const transformedProducts = await Promise.all(products.map(transformProduct));

//   const totalProducts = await prisma.product.count({
//     where: { isDeleted: false }
//   });
//   const totalPages = Math.ceil(totalProducts / limit);
//   const pagination = {
//     currentPage: page,
//     totalPages,
//     totalProducts,
//     pageSize: limit
//   };

//   res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { products: transformedProducts, pagination },
//         "Products fetched successfully"
//       )
//     );
// });

export const customerGetProductById = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params as { productId: string };

  const product = await prisma.product.findUnique({
    where: { id: productId, isDeleted: false },
    select: commonProductSelect
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const transformedProduct = await transformProduct(product);

  res
    .status(200)
    .json(new ApiResponse(200, { product: transformedProduct }, "Product fetched successfully"));
});

export const customerGetProductsBySellerId = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params as { sellerId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { sellerId: sellerId, isDeleted: false },
    select: commonProductSelect,
    skip: (page - 1) * limit,
    take: limit
  });

  const totalProducts = await prisma.product.count({
    where: {
      sellerId: sellerId,
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

  const transformedProducts = await Promise.all(products.map(transformProduct));
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

export const customerGetProductsByCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { categories: { some: { id: { equals: categoryId } } }, isDeleted: false },
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

const customerGetAllCategoryIds = async (categoryId: string, depth = 5): Promise<string[]> => {
  if (depth === 0) return [categoryId];

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subCategories: true }
  });

  if (!category) return [];

  const childIds = await Promise.all(
    category.subCategories.map((sub) => customerGetAllCategoryIds(sub.id, depth - 1))
  );

  return [categoryId, ...childIds.flat()];
};

//This takes a particular category and check for all subcategory and category product (Going to be used in frontend).
export const customerGetProductsByAllCategoryId = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params as { categoryId: string };
    const { page, limit } = paginationSchema.parse(req.query);

    // 🔁 Get this + all subcategory IDs
    const allCategoryIds = await customerGetAllCategoryIds(categoryId);

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

export const customerGetProductsByCategorySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const { categorySlug } = req.params as { categorySlug: string };

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: { subCategories: true }
    });

    if (!category) throw new ApiError(404, "Category not found");

    const allCategoryIds = await customerGetAllCategoryIds(category.id);

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
  }
);

export const customerGetProductsByCategoryIdAndSellerId = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId, sellerId } = req.params as { categoryId: string; sellerId: string };
    const { page, limit } = paginationSchema.parse(req.query);

    const products = await prisma.product.findMany({
      where: {
        categories: {
          some: {
            id: {
              equals: categoryId
            }
          }
        },
        sellerId,
        isDeleted: false
      },
      select: commonProductSelect,
      skip: (page - 1) * limit,
      take: limit
    });

    if (page == 1 && products.length == 0) {
      throw new ApiError(404, "No products found in this category for the seller");
    }
    const transformedProducts = await Promise.all(products.map(transformProduct));

    const totalProducts = await prisma.product.count({
      where: {
        categories: {
          some: {
            id: {
              equals: categoryId
            }
          }
        },
        sellerId,
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
