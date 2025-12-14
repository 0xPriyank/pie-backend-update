import prisma from "@/config/db.config";
import { GroupBuyStatus } from "@prisma/client";

/**
 * Service to handle group buy expiry checks
 * This should be called periodically (e.g., via a cron job)
 */
export const checkExpiredGroupBuys = async () => {
  const now = new Date();

  try {
    // Find all active group buys that have expired
    const expiredGroupBuys = await prisma.groupBuy.findMany({
      where: {
        status: GroupBuyStatus.ACTIVE,
        expiresAt: {
          lt: now
        }
      },
      select: {
        id: true,
        currentParticipants: true,
        requiredParticipants: true,
        expiresAt: true
      }
    });

    if (expiredGroupBuys.length === 0) {
      console.log("No expired group buys found");
      return { updated: 0, expired: [] };
    }

    // Update expired group buys
    const updatePromises = expiredGroupBuys.map(async (groupBuy) => {
      // Determine status based on whether requirement was met
      const newStatus =
        groupBuy.currentParticipants >= groupBuy.requiredParticipants
          ? GroupBuyStatus.SUCCESS
          : GroupBuyStatus.EXPIRED;

      return prisma.groupBuy.update({
        where: { id: groupBuy.id },
        data: { status: newStatus },
        select: {
          id: true,
          status: true,
          currentParticipants: true,
          requiredParticipants: true
        }
      });
    });

    const updatedGroupBuys = await Promise.all(updatePromises);

    console.log(`Updated ${updatedGroupBuys.length} expired group buys`);

    return {
      updated: updatedGroupBuys.length,
      expired: updatedGroupBuys
    };
  } catch (error) {
    console.error("Error checking expired group buys:", error);
    throw error;
  }
};

/**
 * Get group buy statistics
 */
export const getGroupBuyStats = async () => {
  try {
    const stats = await prisma.groupBuy.groupBy({
      by: ["status"],
      _count: {
        status: true
      }
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      },
      {} as Record<GroupBuyStatus, number>
    );
  } catch (error) {
    console.error("Error getting group buy stats:", error);
    throw error;
  }
};

/**
 * Get trending products in group buys
 */
export const getTrendingGroupBuyProducts = async (limit = 10) => {
  try {
    const trending = await prisma.groupBuy.groupBy({
      by: ["productId"],
      where: {
        status: {
          in: [GroupBuyStatus.ACTIVE, GroupBuyStatus.SUCCESS]
        }
      },
      _count: {
        productId: true
      },
      _sum: {
        currentParticipants: true
      },
      orderBy: {
        _count: {
          productId: "desc"
        }
      },
      take: limit
    });

    // Get product details for trending products
    const productIds = trending.map((t) => t.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        shortDescription: true,
        images: {
          where: { isMain: true },
          take: 1,
          select: {
            id: true,
            objectKey: true,
            alt: true
          }
        }
      }
    });

    // Combine trending data with product details
    return trending.map((trend) => {
      const product = products.find((p) => p.id === trend.productId);
      return {
        productId: trend.productId,
        groupBuyCount: trend._count.productId,
        totalParticipants: trend._sum.currentParticipants || 0,
        product
      };
    });
  } catch (error) {
    console.error("Error getting trending group buy products:", error);
    throw error;
  }
};

/**
 * Clean up very old expired group buys (optional - for data management)
 */
export const cleanupOldGroupBuys = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.groupBuy.deleteMany({
      where: {
        status: {
          in: [GroupBuyStatus.EXPIRED, GroupBuyStatus.FAILED]
        },
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`Cleaned up ${result.count} old group buys`);
    return result.count;
  } catch (error) {
    console.error("Error cleaning up old group buys:", error);
    throw error;
  }
};
