/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  CreateGroupBuyInput,
  GetGroupBuysQuery,
  CompleteGroupBuyInput,
  GroupBuyResponse,
  GroupBuyListResponse
} from "@/schemas/group-buy.schema";
import { getDocumentUrl } from "@/services/upload.service";

// Common select for group buy queries
export const commonGroupBuySelect = Prisma.validator<Prisma.GroupBuySelect>()({
  id: true,
  productId: true,
  creatorId: true,
  requiredParticipants: true,
  currentParticipants: true,
  discountPercentage: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      discount: true,
      originalPrice: true,
      shortDescription: true,
      seller: {
        select: {
          id: true,
          businessName: true
        }
      },
      images: {
        select: {
          id: true,
          objectKey: true,
          alt: true,
          isMain: true
        },
        where: {
          isMain: true
        },
        take: 1
      }
    }
  },
  creator: {
    select: {
      id: true,
      fullName: true,
      email: true
    }
  },
  participants: {
    select: {
      id: true,
      userId: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    },
    orderBy: {
      joinedAt: "asc"
    }
  }
});

type GroupBuyWithRelations = Prisma.GroupBuyGetPayload<{
  select: typeof commonGroupBuySelect;
}>;

type ImageData = {
  id: string;
  objectKey: string | null;
  alt: string;
  isMain: boolean;
};

const formatGroupBuyResponse = async (
  groupBuy: GroupBuyWithRelations & { participants?: any[] }
): Promise<GroupBuyResponse> => {
  // Process images
  const processedImages = await Promise.all(
    groupBuy.product.images.map(async (image: ImageData) => ({
      ...image,
      objectKey: image.objectKey ? await getDocumentUrl(image.objectKey) : null
    }))
  );

  return {
    id: groupBuy.id,
    productId: groupBuy.productId,
    product: {
      ...groupBuy.product,
      images: processedImages
    },
    creatorId: groupBuy.creatorId,
    creator: groupBuy.creator,
    requiredParticipants: groupBuy.requiredParticipants,
    currentParticipants: groupBuy.currentParticipants,
    discountPercentage: Number(groupBuy.discountPercentage),
    status: groupBuy.status,
    expiresAt: groupBuy.expiresAt.toISOString(),
    createdAt: groupBuy.createdAt.toISOString(),
    updatedAt: groupBuy.updatedAt.toISOString(),
    participants: groupBuy.participants
  };
};

export const createGroupBuy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { productId, requiredParticipants, discountPercentage, expiresAt }: CreateGroupBuyInput =
    req.body;

  // Check if product exists and is active
  const product = await prisma.product.findFirst({
    where: {
      id: productId
      // TODO: Uncomment when product status management is implemented
      // isActive: true,
      // isDeleted: false,
      // inStock: true
    }
  });

  if (!product) {
    throw new ApiError(404, "Product not found or not available");
  }

  // Check if user already has an active group buy for this product
  const existingGroupBuy = await prisma.groupBuy.findFirst({
    where: {
      productId,
      creatorId: userId,
      status: "ACTIVE"
    }
  });

  if (existingGroupBuy) {
    throw new ApiError(409, "You already have an active group buy for this product");
  }

  // Create the group buy
  const groupBuy = await prisma.groupBuy.create({
    data: {
      productId,
      creatorId: userId,
      requiredParticipants,
      discountPercentage,
      expiresAt: new Date(expiresAt),
      currentParticipants: 1
    },
    select: {
      ...commonGroupBuySelect,
      participants: {
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      }
    }
  });

  // Add creator as first participant
  await prisma.groupBuyParticipant.create({
    data: {
      groupBuyId: groupBuy.id,
      userId
    }
  });

  const formattedGroupBuy = await formatGroupBuyResponse(groupBuy);

  res.status(201).json(new ApiResponse(201, formattedGroupBuy, "Group buy created successfully"));
});

export const getGroupBuys = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query;
  const {
    status,
    productId,
    creatorId,
    page = 1,
    limit = 10
  } = query as Partial<GetGroupBuysQuery>;

  const where: Prisma.GroupBuyWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (productId) {
    where.productId = productId;
  }

  if (creatorId) {
    where.creatorId = creatorId;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [groupBuys, total] = await Promise.all([
    prisma.groupBuy.findMany({
      where,
      select: commonGroupBuySelect,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: Number(limit)
    }),
    prisma.groupBuy.count({ where })
  ]);

  const formattedGroupBuys = await Promise.all(
    groupBuys.map((groupBuy) => formatGroupBuyResponse(groupBuy))
  );

  const totalPages = Math.ceil(total / Number(limit));

  const response: GroupBuyListResponse = {
    groupBuys: formattedGroupBuys,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    }
  };

  res.status(200).json(new ApiResponse(200, response, "Group buys retrieved successfully"));
});

export const getGroupBuyById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    select: {
      ...commonGroupBuySelect,
      participants: {
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          joinedAt: "asc"
        }
      }
    }
  });

  if (!groupBuy) {
    throw new ApiError(404, "Group buy not found");
  }

  const formattedGroupBuy = await formatGroupBuyResponse(groupBuy);

  res.status(200).json(new ApiResponse(200, formattedGroupBuy, "Group buy retrieved successfully"));
});

export const joinGroupBuy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.params;

  // Check if group buy exists and is active
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    include: {
      participants: true
    }
  });

  if (!groupBuy) {
    throw new ApiError(404, "Group buy not found");
  }

  if (groupBuy.status !== "ACTIVE") {
    throw new ApiError(400, "Group buy is not active");
  }

  if (new Date() > groupBuy.expiresAt) {
    // Mark as expired if time has passed
    await prisma.groupBuy.update({
      where: { id },
      data: { status: "EXPIRED" }
    });
    throw new ApiError(400, "Group buy has expired");
  }

  if (groupBuy.currentParticipants >= groupBuy.requiredParticipants) {
    throw new ApiError(400, "Group buy is already full");
  }

  // Check if user already joined
  const existingParticipant = groupBuy.participants.find((p) => p.userId === userId);
  if (existingParticipant) {
    throw new ApiError(409, "You have already joined this group buy");
  }

  // Add user as participant and update count
  await prisma.$transaction([
    prisma.groupBuyParticipant.create({
      data: {
        groupBuyId: id,
        userId
      }
    }),
    prisma.groupBuy.update({
      where: { id },
      data: {
        currentParticipants: {
          increment: 1
        }
      }
    })
  ]);

  // Check if group buy should be marked as successful
  const updatedGroupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    select: { currentParticipants: true, requiredParticipants: true }
  });

  if (
    updatedGroupBuy &&
    updatedGroupBuy.currentParticipants >= updatedGroupBuy.requiredParticipants
  ) {
    await prisma.groupBuy.update({
      where: { id },
      data: { status: "SUCCESS" }
    });
  }

  // Get updated group buy data
  const finalGroupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    select: {
      ...commonGroupBuySelect,
      participants: {
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          joinedAt: "asc"
        }
      }
    }
  });

  const formattedGroupBuy = await formatGroupBuyResponse(finalGroupBuy!);

  res.status(200).json(new ApiResponse(200, formattedGroupBuy, "Successfully joined group buy"));
});

export const leaveGroupBuy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const { id } = req.params;

  // Check if group buy exists
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    include: {
      participants: true
    }
  });

  if (!groupBuy) {
    throw new ApiError(404, "Group buy not found");
  }

  if (groupBuy.status !== "ACTIVE") {
    throw new ApiError(400, "Cannot leave a group buy that is not active");
  }

  // Check if user is a participant
  const existingParticipant = groupBuy.participants.find((p) => p.userId === userId);
  if (!existingParticipant) {
    throw new ApiError(409, "You are not a participant of this group buy");
  }

  // Prevent creator from leaving
  if (groupBuy.creatorId === userId) {
    throw new ApiError(400, "Creator cannot leave their own group buy");
  }

  // Remove user as participant and update count
  await prisma.$transaction([
    prisma.groupBuyParticipant.deleteMany({
      where: {
        groupBuyId: id,
        userId
      }
    }),
    prisma.groupBuy.update({
      where: { id },
      data: {
        currentParticipants: {
          decrement: 1
        }
      }
    })
  ]);

  // Get updated group buy data
  const updatedGroupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    select: {
      ...commonGroupBuySelect,
      participants: {
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          joinedAt: "asc"
        }
      }
    }
  });

  const formattedGroupBuy = await formatGroupBuyResponse(updatedGroupBuy!);

  res.status(200).json(new ApiResponse(200, formattedGroupBuy, "Successfully left group buy"));
});

export const completeGroupBuy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.params;
  const { status }: CompleteGroupBuyInput = req.body;

  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id },
    include: {
      creator: true
    }
  });

  if (!groupBuy) {
    throw new ApiError(404, "Group buy not found");
  }

  // Only creator or admin can complete group buy
  if (groupBuy.creatorId !== userId) {
    // You might want to add admin check here
    throw new ApiError(403, "Only the creator can complete this group buy");
  }

  if (groupBuy.status !== "ACTIVE") {
    throw new ApiError(400, "Group buy is not active");
  }

  // Update group buy status
  const updatedGroupBuy = await prisma.groupBuy.update({
    where: { id },
    data: { status },
    select: {
      ...commonGroupBuySelect,
      participants: {
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          joinedAt: "asc"
        }
      }
    }
  });

  const formattedGroupBuy = await formatGroupBuyResponse(updatedGroupBuy);

  res.status(200).json(new ApiResponse(200, formattedGroupBuy, "Group buy completed successfully"));
});

export const getMyGroupBuys = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const query = req.query;
  const { page = 1, limit = 10 } = query as { page?: string; limit?: string };
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get group buys created by user
  const [createdGroupBuys, createdTotal] = await Promise.all([
    prisma.groupBuy.findMany({
      where: { creatorId: userId },
      select: commonGroupBuySelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum
    }),
    prisma.groupBuy.count({ where: { creatorId: userId } })
  ]);

  // Get group buys user participated in
  const [participatedGroupBuys, participatedTotal] = await Promise.all([
    prisma.groupBuy.findMany({
      where: {
        participants: {
          some: { userId }
        },
        creatorId: { not: userId } // Exclude ones they created
      },
      select: commonGroupBuySelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum
    }),
    prisma.groupBuy.count({
      where: {
        participants: {
          some: { userId }
        },
        creatorId: { not: userId }
      }
    })
  ]);

  const [formattedCreated, formattedParticipated] = await Promise.all([
    Promise.all(createdGroupBuys.map((gb) => formatGroupBuyResponse(gb))),
    Promise.all(participatedGroupBuys.map((gb) => formatGroupBuyResponse(gb)))
  ]);

  const response = {
    created: {
      groupBuys: formattedCreated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: createdTotal,
        totalPages: Math.ceil(createdTotal / limitNum),
        hasNext: pageNum < Math.ceil(createdTotal / limitNum),
        hasPrev: pageNum > 1
      }
    },
    participated: {
      groupBuys: formattedParticipated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: participatedTotal,
        totalPages: Math.ceil(participatedTotal / limitNum),
        hasNext: pageNum < Math.ceil(participatedTotal / limitNum),
        hasPrev: pageNum > 1
      }
    }
  };

  res.status(200).json(new ApiResponse(200, response, "User group buys retrieved successfully"));
});

export const deleteGroupBuy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const { id } = req.params;

  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id }
  });

  if (!groupBuy) {
    throw new ApiError(404, "Group buy not found");
  }

  if (groupBuy.creatorId !== userId) {
    throw new ApiError(403, "Only the creator can delete this group buy");
  }

  if (groupBuy.status !== "ACTIVE") {
    throw new ApiError(400, "Only active group buys can be deleted");
  }

  await prisma.$transaction([
    prisma.groupBuyParticipant.deleteMany({
      where: { groupBuyId: id }
    }),
    prisma.groupBuy.delete({
      where: { id }
    })
  ]);

  res.status(200).json(new ApiResponse(200, {}, "Group buy deleted successfully"));
});
