import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import type { CreateReturnInput, UpdateReturnStatusInput } from "@/schemas/return.schema";

/**
 * Generate unique return number
 */
async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastReturn = await prisma.return.findFirst({
    where: {
      returnNumber: {
        startsWith: `RET-${year}-`
      }
    },
    orderBy: { createdAt: "desc" }
  });

  let nextNumber = 1;
  if (lastReturn) {
    const lastNumber = parseInt(lastReturn.returnNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  return `RET-${year}-${String(nextNumber).padStart(5, "0")}`;
}

/**
 * Create a return request (Customer)
 */
export async function createReturn(customerId: string, data: CreateReturnInput) {
  // Verify sub-order exists and belongs to customer
  const subOrder = await prisma.subOrder.findFirst({
    where: {
      id: data.subOrderId,
      masterOrder: {
        customerId
      }
    },
    include: {
      items: true,
      masterOrder: true
    }
  });

  if (!subOrder) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  // Check if order is delivered (required for returns)
  if (subOrder.status !== "DELIVERED") {
    throw new ApiError(400, "Can only return delivered orders");
  }

  // Check return window (e.g., 7 days from delivery)
  const deliveryDate = subOrder.deliveredAt;
  if (!deliveryDate) {
    throw new ApiError(400, "Delivery date not found");
  }

  const returnWindowDays = 7;
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > returnWindowDays) {
    throw new ApiError(
      400,
      `Return window expired. Returns must be initiated within ${returnWindowDays} days of delivery`
    );
  }

  // Verify all items belong to this sub-order
  const itemIds = data.items.map((item) => item.subOrderItemId);
  const subOrderItems = await prisma.subOrderItem.findMany({
    where: {
      id: { in: itemIds },
      subOrderId: data.subOrderId
    }
  });

  if (subOrderItems.length !== itemIds.length) {
    throw new ApiError(400, "One or more items do not belong to this order");
  }

  // Verify quantities don't exceed ordered quantities
  for (const item of data.items) {
    const orderItem = subOrderItems.find((oi) => oi.id === item.subOrderItemId);
    if (!orderItem) {
      throw new ApiError(400, `Item ${item.subOrderItemId} not found in order`);
    }
    if (item.quantity > orderItem.quantity) {
      throw new ApiError(
        400,
        `Return quantity (${item.quantity}) exceeds ordered quantity (${orderItem.quantity})`
      );
    }
  }

  // Check if return already exists for this sub-order
  const existingReturn = await prisma.return.findFirst({
    where: {
      subOrderId: data.subOrderId,
      status: {
        notIn: ["REJECTED", "CANCELLED", "COMPLETED"]
      }
    }
  });

  if (existingReturn) {
    throw new ApiError(400, "A return request already exists for this order");
  }

  // Generate return number
  const returnNumber = await generateReturnNumber();

  // Create return with items
  const newReturn = await prisma.return.create({
    data: {
      returnNumber,
      subOrderId: data.subOrderId,
      customerId,
      reason: data.reason,
      description: data.description,
      pickupAddress: data.pickupAddress,
      status: "REQUESTED",
      items: {
        create: data.items.map((item) => ({
          subOrderItemId: item.subOrderItemId,
          quantity: item.quantity,
          refundAmount: item.refundAmount
        }))
      }
    },
    include: {
      items: {
        include: {
          subOrderItem: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      },
      subOrder: {
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              fullName: true
            }
          }
        }
      }
    }
  });

  return newReturn;
}

/**
 * Get customer returns
 */
export async function getCustomerReturns(
  customerId: string,
  status?: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const where: any = { customerId };
  if (status) {
    where.status = status;
  }

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        items: {
          include: {
            subOrderItem: {
              include: {
                product: true,
                variant: true
              }
            }
          }
        },
        subOrder: {
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
                fullName: true
              }
            }
          }
        },
        refund: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.return.count({ where })
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get seller returns (orders they sold)
 */
export async function getSellerReturns(
  sellerId: string,
  status?: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const where: any = {
    subOrder: {
      sellerId
    }
  };
  if (status) {
    where.status = status;
  }

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        items: {
          include: {
            subOrderItem: {
              include: {
                product: true,
                variant: true
              }
            }
          }
        },
        subOrder: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        refund: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.return.count({ where })
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get return by ID
 */
export async function getReturnById(returnId: string, userId: string, userType: "customer" | "seller") {
  const whereClause: any = { id: returnId };

  if (userType === "customer") {
    whereClause.customerId = userId;
  } else {
    whereClause.subOrder = { sellerId: userId };
  }

  const returnData = await prisma.return.findFirst({
    where: whereClause,
    include: {
      items: {
        include: {
          subOrderItem: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      },
      subOrder: {
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              fullName: true
            }
          }
        }
      },
      customer: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      refund: true
    }
  });

  if (!returnData) {
    throw new ApiError(404, "Return not found");
  }

  return returnData;
}

/**
 * Update return status (Seller)
 */
export async function updateReturnStatus(
  returnId: string,
  sellerId: string,
  data: UpdateReturnStatusInput
) {
  // Verify return exists and belongs to seller's order
  const returnData = await prisma.return.findFirst({
    where: {
      id: returnId,
      subOrder: {
        sellerId
      }
    },
    include: {
      subOrder: true,
      refund: true
    }
  });

  if (!returnData) {
    throw new ApiError(404, "Return not found or does not belong to your orders");
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    REQUESTED: ["APPROVED", "REJECTED"],
    APPROVED: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["IN_TRANSIT"],
    IN_TRANSIT: ["RECEIVED"],
    RECEIVED: ["INSPECTED"],
    INSPECTED: ["COMPLETED", "REJECTED"],
    REJECTED: [],
    COMPLETED: [],
    CANCELLED: []
  };

  if (!validTransitions[returnData.status]?.includes(data.status)) {
    throw new ApiError(
      400,
      `Cannot transition from ${returnData.status} to ${data.status}`
    );
  }

  // Update return
  const updateData: any = {
    status: data.status,
    updatedAt: new Date()
  };

  if (data.status === "APPROVED") {
    updateData.approvedAt = new Date();
  } else if (data.status === "REJECTED") {
    updateData.rejectedAt = new Date();
    updateData.rejectionReason = data.rejectionReason;
  } else if (data.status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  if (data.trackingNumber) {
    updateData.trackingNumber = data.trackingNumber;
  }

  const updatedReturn = await prisma.return.update({
    where: { id: returnId },
    data: updateData,
    include: {
      items: {
        include: {
          subOrderItem: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      },
      subOrder: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      refund: true
    }
  });

  // If completed, update sub-order status
  if (data.status === "COMPLETED") {
    await prisma.subOrder.update({
      where: { id: returnData.subOrderId },
      data: { status: "RETURNED" }
    });
  }

  return updatedReturn;
}

/**
 * Cancel return (Customer - only if not yet approved)
 */
export async function cancelReturn(returnId: string, customerId: string) {
  const returnData = await prisma.return.findFirst({
    where: {
      id: returnId,
      customerId
    }
  });

  if (!returnData) {
    throw new ApiError(404, "Return not found");
  }

  if (returnData.status !== "REQUESTED") {
    throw new ApiError(400, "Can only cancel returns that are in REQUESTED status");
  }

  const updatedReturn = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: "CANCELLED",
      updatedAt: new Date()
    },
    include: {
      items: {
        include: {
          subOrderItem: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      },
      subOrder: true,
      refund: true
    }
  });

  return updatedReturn;
}
