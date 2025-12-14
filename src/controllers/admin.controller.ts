import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import prisma from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  requestEmailOtp,
  verifyEmailOtp,
  resetPassword,
  verifyUser,
  registerUser
} from "@/services/auth.service";
import { Prisma } from "@prisma/client";
import { paginationSchema, productIdSchema, ProductResponse } from "@/schemas/product.schema";
import { getDocumentUrl } from "@/services/upload.service";

// *-------------------------- Admin authentication controllers -------------------------- *//
export const registerAdmin = registerUser("admin");
export const verifyAdmin = verifyUser("admin");
export const loginAdmin = loginUser("admin");
export const logoutAdmin = logoutUser("admin");
export const refreshAdminToken = refreshAccessToken("admin");
export const changeAdminPassword = changeCurrentPassword("admin");
export const getAdminProfile = getCurrentUser();
export const updateAdminDetails = updateAccountDetails("admin");
export const sendAdminOtp = requestEmailOtp("admin");

// *-------------------------- Admin password reset controllers -------------------------- *//
export const sendAdminResetOTP = requestEmailOtp("admin");
export const verifyAdminResetOTP = verifyEmailOtp("admin");
export const resetAdminPassword = resetPassword("admin");

export const getAllCustomers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.body as { page?: number; limit?: number };
    console.log("Page:", page, "Limit:", limit);

    if (page < 1 || limit < 1) {
      throw new ApiError(400, "Page and limit must be greater than 0");
    }

    const skip = (page - 1) * limit;
    const totalCustomers = await prisma.customer.count();
    const customers = await prisma.customer.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        gender: true,
        dateOfBirth: true,
        isVerified: true,
        role: true,
        address: true,
        contact: {
          select: {
            id: true,
            type: true,
            number: true,
            isVerified: true
          }
        },
        ShippingAddress: {
          select: {
            id: true,
            contact: true,
            city: true,
            state: true,
            country: true,
            pincode: true,
            street: true
          }
        },
        referralCode: true,
        loyaltyPoints: true,
        refreshToken: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        Wishlist: {
          select: {
            product: true
          }
        },
        Cart: {
          select: {
            items: true
          }
        }
      }
    });

    if (!customers || customers.length === 0) {
      throw new ApiError(404, "No customers found");
    }

    const totalPages = Math.ceil(totalCustomers / limit);

    const response = new ApiResponse(
      200,
      {
        data: {
          customers,
          pagination: {
            currentPage: page,
            totalPages,
            totalRecords: totalCustomers,
            pageSize: limit
          }
        }
      },
      "Customers fetched successfully"
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error occurred:", error);

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, {}, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, {}, "An unexpected error occurred"));
    }
  }
});

export const getAllSellers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.body as { page?: number; limit?: number };
    console.log("Page:", page, "Limit:", limit);

    if (page < 1 || limit < 1) {
      throw new ApiError(400, "Page and limit must be greater than 0");
    }

    const skip = (page - 1) * limit;
    const totalSellers = await prisma.seller.count();
    const sellers = await prisma.seller.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isVerified: true,
        refreshToken: true,
        contact: {
          select: {
            id: true,
            type: true,
            number: true,
            isVerified: true
          }
        },
        businessName: true,
        businessType: true,
        rating: true,
        GSTInfo: {
          select: {
            gstin: true
          }
        },
        followers: true,
        storefrontInfo: {
          select: {
            storeName: true,
            shopImage: {
              select: {
                src: true,
                objectKey: true,
                format: true
              }
            }
          }
        },
        sellerAddress: {
          select: {
            id: true,
            contact: true,
            city: true,
            state: true,
            country: true,
            pincode: true,
            street: true
          }
        },
        createdAt: true,
        updatedAt: true,
        Promotion: {
          select: {
            id: true,
            code: true,
            description: true,
            discount: true,
            isPercentage: true,
            startDate: true,
            endDate: true,
            active: true,
            seller: true,
            createdBy: true,
            adminId: true,
            products: true
          }
        },
        Products: {
          select: {
            id: true,
            name: true,
            sku: true,
            details: true
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            tax: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            totalPrice: true,
            options: true,
            productName: true,
            productSKU: true,
            reservedStock: true,
            Orders: true,
            ordersId: true
          }
        }
      }
    });

    if (!sellers || sellers.length === 0) {
      throw new ApiError(404, "No customers found");
    }

    const totalPages = Math.ceil(totalSellers / limit);

    const response = new ApiResponse(
      200,
      {
        data: {
          sellers,
          pagination: {
            currentPage: page,
            totalPages,
            totalRecords: totalSellers,
            pageSize: limit
          }
        }
      },
      "Customers fetched successfully"
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error occurred:", error);

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, {}, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, {}, "An unexpected error occurred"));
    }
  }
});

export const searchCustomers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const customers = await prisma.customer.findMany({
    where: {
      email: email // Use the dynamically built `whereConditions` array
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
      isVerified: true,
      role: true,
      address: true,
      contact: {
        select: {
          id: true,
          number: true
        }
      },
      referralCode: true,
      loyaltyPoints: true,
      refreshToken: true,
      isBlocked: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!customers.length) {
    throw new ApiError(404, "No customers found");
  }

  res.status(200).json(new ApiResponse(200, { data: customers }, "Customer fetched successfully"));
});

export const searchSellers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const sellers = await prisma.seller.findMany({
    where: {
      email: email
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isVerified: true,
      refreshToken: true,
      contact: {
        select: {
          id: true,
          type: true,
          number: true,
          isVerified: true
        }
      },
      businessName: true,
      businessType: true,
      rating: true,
      GSTInfo: {
        select: {
          gstin: true
        }
      },
      followers: true,
      storefrontInfo: {
        select: {
          storeName: true,
          shopImage: {
            select: {
              src: true,
              objectKey: true,
              format: true
            }
          }
        }
      },
      sellerAddress: {
        select: {
          id: true,
          contact: true,
          city: true,
          state: true,
          country: true,
          pincode: true,
          street: true
        }
      },
      createdAt: true,
      updatedAt: true,
      Promotion: {
        select: {
          id: true,
          code: true,
          description: true,
          discount: true,
          isPercentage: true,
          startDate: true,
          endDate: true,
          active: true,
          seller: true,
          createdBy: true,
          adminId: true,
          products: true
        }
      },
      Products: {
        select: {
          id: true,
          name: true,
          sku: true,
          details: true
        }
      },
      orderItems: {
        select: {
          id: true,
          productId: true,
          tax: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          totalPrice: true,
          options: true,
          productName: true,
          productSKU: true,
          reservedStock: true,
          Orders: true,
          ordersId: true
        }
      }
    }
  });

  if (!sellers.length) {
    throw new ApiError(404, "No Sellers found");
  }

  res.status(200).json(new ApiResponse(200, { data: sellers }, "Seller fetched successfully"));
});

export const deleteSeller = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string };

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  // Find the first matching seller
  const seller = await prisma.seller.findFirst({
    where: {
      email: email
    },
    select: {
      id: true
    }
  });

  if (!seller) {
    throw new ApiError(404, "No seller found to delete");
  }

  // Delete the seller
  await prisma.seller.delete({
    where: { id: seller.id }
  });

  res.status(200).json(new ApiResponse(200, {}, "Seller deleted successfully"));
});

// *------------------------- Admin Product Controllers ---------------------------------- *//
export const adminCommonProductSelect = Prisma.validator<Prisma.ProductSelect>()({
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
  ModerationFlag: {
    select: {
      id: true,
      adminId: true,
      reviewedBy: true,
      reason: true
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

export const adminGetProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: adminCommonProductSelect,
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

export const adminGetProductById = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = productIdSchema.parse(req.params);

  const product = await prisma.product.findUnique({
    where: { id: productId, isDeleted: false },
    select: adminCommonProductSelect
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const transformedProduct = await transformProduct(product);

  res
    .status(200)
    .json(new ApiResponse(200, { product: transformedProduct }, "Product fetched successfully"));
});

export const adminGetProductsBySellerId = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params as { sellerId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { sellerId: sellerId, isDeleted: false },
    select: adminCommonProductSelect,
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

export const adminGetProductsByCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { categories: { some: { id: { equals: categoryId } } }, isDeleted: false },
    select: adminCommonProductSelect,
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

const adminGetAllCategoryIds = async (categoryId: string, depth = 5): Promise<string[]> => {
  if (depth === 0) return [categoryId];

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subCategories: true }
  });

  if (!category) return [];

  const childIds = await Promise.all(
    category.subCategories.map((sub) => adminGetAllCategoryIds(sub.id, depth - 1))
  );

  return [categoryId, ...childIds.flat()];
};

//This takes a particular category and check for all subcategory and category product (Going to be used in frontend).
export const adminGetProductsByAllCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  // 🔁 Get this + all subcategory IDs
  const allCategoryIds = await adminGetAllCategoryIds(categoryId);

  const products = await prisma.product.findMany({
    where: {
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      },
      isDeleted: false
    },
    select: adminCommonProductSelect,
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
});

export const adminGetProductsByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { categorySlug } = req.params as { categorySlug: string };

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: { subCategories: true }
  });

  if (!category) throw new ApiError(404, "Category not found");

  const allCategoryIds = await adminGetAllCategoryIds(category.id);

  const products = await prisma.product.findMany({
    where: {
      categories: {
        some: {
          id: { in: allCategoryIds }
        }
      },
      isDeleted: false
    },
    select: adminCommonProductSelect,
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

export const adminGetProductsByCategoryIdAndSellerId = asyncHandler(
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
      select: adminCommonProductSelect,
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
