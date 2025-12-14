import prisma from "@/config/db.config";
import { ApiError } from "@/utils/ApiError";
import type { ProcessRefundInput, UpdateRefundStatusInput } from "@/schemas/return.schema";

/**
 * Generate unique refund number
 */
async function generateRefundNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastRefund = await prisma.refund.findFirst({
    where: {
      refundNumber: {
        startsWith: `REF-${year}-`
      }
    },
    orderBy: { createdAt: "desc" }
  });

  let nextNumber = 1;
  if (lastRefund) {
    const lastNumber = parseInt(lastRefund.refundNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  return `REF-${year}-${String(nextNumber).padStart(5, "0")}`;
}

/**
 * Process refund for a return (Seller/Admin)
 */
export async function processRefund(sellerId: string, data: ProcessRefundInput) {
  // Verify return exists and belongs to seller
  const returnData = await prisma.return.findFirst({
    where: {
      id: data.returnId,
      subOrder: {
        sellerId
      }
    },
    include: {
      refund: true,
      items: true,
      subOrder: true
    }
  });

  if (!returnData) {
    throw new ApiError(404, "Return not found or does not belong to your orders");
  }

  // Check if return is in valid status for refund
  if (!["INSPECTED", "COMPLETED"].includes(returnData.status)) {
    throw new ApiError(400, "Return must be inspected before processing refund");
  }

  // Check if refund already exists
  if (returnData.refund) {
    throw new ApiError(400, "Refund already exists for this return");
  }

  // Calculate total refund amount from return items
  const totalRefundAmount = returnData.items.reduce(
    (sum, item) => sum + Number(item.refundAmount),
    0
  );

  // Validate refund amount doesn't exceed total
  if (data.amount > totalRefundAmount) {
    throw new ApiError(
      400,
      `Refund amount (${data.amount}) exceeds maximum refundable amount (${totalRefundAmount})`
    );
  }

  // Generate refund number
  const refundNumber = await generateRefundNumber();

  // Create refund
  const refund = await prisma.refund.create({
    data: {
      refundNumber,
      returnId: data.returnId,
      amount: data.amount,
      method: data.method,
      status: "PENDING",
      transactionId: data.transactionId
    },
    include: {
      return: {
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true
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
      }
    }
  });

  // TODO: Integrate with payment gateway for actual refund processing
  // For now, mark as initiated
  await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: "INITIATED",
      updatedAt: new Date()
    }
  });

  return refund;
}

/**
 * Update refund status
 */
export async function updateRefundStatus(
  refundId: string,
  sellerId: string,
  data: UpdateRefundStatusInput
) {
  // Verify refund exists and belongs to seller
  const refund = await prisma.refund.findFirst({
    where: {
      id: refundId,
      return: {
        subOrder: {
          sellerId
        }
      }
    },
    include: {
      return: {
        include: {
          subOrder: true
        }
      }
    }
  });

  if (!refund) {
    throw new ApiError(404, "Refund not found or does not belong to your orders");
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    PENDING: ["INITIATED", "CANCELLED"],
    INITIATED: ["PROCESSING", "FAILED", "CANCELLED"],
    PROCESSING: ["COMPLETED", "FAILED"],
    COMPLETED: [],
    FAILED: ["INITIATED"], // Allow retry
    CANCELLED: []
  };

  if (!validTransitions[refund.status]?.includes(data.status)) {
    throw new ApiError(400, `Cannot transition from ${refund.status} to ${data.status}`);
  }

  // Update refund
  const updateData: any = {
    status: data.status,
    updatedAt: new Date()
  };

  if (data.status === "COMPLETED") {
    updateData.processedAt = new Date();
  } else if (data.status === "FAILED") {
    updateData.failureReason = data.failureReason;
  }

  if (data.transactionId) {
    updateData.transactionId = data.transactionId;
  }

  const updatedRefund = await prisma.refund.update({
    where: { id: refundId },
    data: updateData,
    include: {
      return: {
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true
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
          items: {
            include: {
              subOrderItem: {
                include: {
                  product: true,
                  variant: true
                }
              }
            }
          }
        }
      }
    }
  });

  return updatedRefund;
}

/**
 * Get refund by ID
 */
export async function getRefundById(refundId: string, userId: string, userType: "customer" | "seller") {
  const whereClause: any = { id: refundId };

  if (userType === "customer") {
    whereClause.return = { customerId: userId };
  } else {
    whereClause.return = { subOrder: { sellerId: userId } };
  }

  const refund = await prisma.refund.findFirst({
    where: whereClause,
    include: {
      return: {
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true
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
          items: {
            include: {
              subOrderItem: {
                include: {
                  product: true,
                  variant: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!refund) {
    throw new ApiError(404, "Refund not found");
  }

  return refund;
}

/**
 * Get all refunds for seller
 */
export async function getSellerRefunds(
  sellerId: string,
  status?: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const where: any = {
    return: {
      subOrder: {
        sellerId
      }
    }
  };

  if (status) {
    where.status = status;
  }

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        return: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            subOrder: true,
            items: {
              include: {
                subOrderItem: {
                  include: {
                    product: true,
                    variant: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.refund.count({ where })
  ]);

  return {
    refunds,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
