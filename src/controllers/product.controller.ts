import { Request, Response } from "express";
import {
  addImageToProductSchema,
  CreateProductInput,
  createProductSchema,
  paginationSchema,
  ProductResponse,
  updateProductSchema
} from "@/schemas/product.schema";

import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { Prisma } from "@prisma/client";
import { getDocumentUrl } from "@/services/upload.service";

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
  // ----CTP: Shopify-style product variants with options
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

export async function transformProduct(product: ProductResponse) {
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
// Create a new product and image
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
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
    .json(new ApiResponse(201, { data: transformedProduct }, "Product created successfully"));
});

export const addImageToProduct = asyncHandler(async (req: Request, res: Response) => {
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
  // const image = await uploadImage(file, productId, isMain);

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
        data: {
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

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
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
        { data: { products: transformedProducts, pagination } },
        "Products fetched successfully"
      )
    );
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { productId: id } = req.params as { productId: string };

  const product = await prisma.product.findUnique({
    where: { id, isDeleted: false },
    select: commonProductSelect
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const transformedProduct = await transformProduct(product);

  res.status(200).json(new ApiResponse(200, transformedProduct, "Product fetched successfully"));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
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
        category: { set: newProductData.categories.map((id) => ({ id })) }
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
    .json(new ApiResponse(200, { data: transformedProduct }, "Product updated successfully"));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
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

export const getProductsBySellerId = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params as { sellerId: string };

  const products = await prisma.product.findMany({
    where: { sellerId: sellerId, isDeleted: false },
    select: commonProductSelect
  });
  const transformedProducts = await Promise.all(products.map(transformProduct));
  res
    .status(200)
    .json(new ApiResponse(200, { data: transformedProducts }, "Products fetched successfully"));
});

export const getProductsByCategoryId = asyncHandler(async (req: Request, res: Response) => {
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
        { data: { products: transformedProducts, pagination } },
        "Products fetched successfully"
      )
    );
});

export const getAllCategoryIds = async (categoryId: string, depth = 5): Promise<string[]> => {
  if (depth === 0) return [categoryId];

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subCategories: true }
  });

  if (!category) return [];

  const childIds = await Promise.all(
    category.subCategories.map((sub) => getAllCategoryIds(sub.id, depth - 1))
  );

  return [categoryId, ...childIds.flat()];
};

//This actually takes a perticular category and check for all subcategory and category product (Going to be used in frontend).
export const getProductsByAllCategoryId = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params as { categoryId: string };
  const { page, limit } = paginationSchema.parse(req.query);

  // 🔁 Get this + all subcategory IDs
  const allCategoryIds = await getAllCategoryIds(categoryId);

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
        { data: { products: transformedProducts, pagination } },
        "Products fetched successfully"
      )
    );
});

export const getProductsByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { categorySlug } = req.params as { categorySlug: string };

  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, sellerId: null },
    include: { subCategories: true }
  });

  if (!category) throw new ApiError(404, "Category not found");

  const allCategoryIds = await getAllCategoryIds(category.id);

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
        data: {
          products: await Promise.all(products.map(transformProduct)),
          pagination: {
            currentPage: page,
            totalPages,
            totalProducts,
            pageSize: limit
          }
        }
      },
      "Products fetched successfully"
    )
  );
});

export const getProductsByCategoryIdAndSellerId = asyncHandler(
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
          { data: { products: transformedProducts, pagination } },
          "Products fetched successfully"
        )
      );
  }
);

export const getProductsByCategoryIdAndSellerIdAndInStock = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const sellerId = req.user?.id;
    if (!sellerId) {
      throw new ApiError(401, "Unauthorized");
    }
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
        inStock: true,
        isDeleted: false
      }
    });
    res.status(200).json(new ApiResponse(200, { data: products }, "Products fetched successfully"));
  }
);
