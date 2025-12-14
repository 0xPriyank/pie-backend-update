import { Request, Response } from "express";
import { db } from "../config/db.config";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { z } from "zod";

const AddressTypeEnum = z.enum(["HOME", "WORK", "BILLING", "SHIPPING"]);

const createAddressSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(1, "Full name cannot be empty"),
  contact: z.string({ required_error: "Contact is required" }).min(1, "Contact cannot be empty"),
  type: AddressTypeEnum,
  street: z.string({ required_error: "Street is required" }).min(1, "Street cannot be empty"),
  city: z.string({ required_error: "City is required" }).min(1, "City cannot be empty"),
  state: z.string({ required_error: "State is required" }).min(1, "State cannot be empty"),
  country: z.string({ required_error: "Country is required" }).min(1, "Country cannot be empty"),
  pincode: z.string({ required_error: "Pincode is required" }).min(1, "Pincode cannot be empty"),
  isMain: z.boolean({ required_error: "isMain flag is required" })
});

const updateAddressSchema = createAddressSchema.partial();

export const createShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const validationResult = createAddressSchema.safeParse(req.body);

  if (!validationResult.success) {
    throw new ApiError(
      400,
      "Invalid address data provided",
      validationResult.error.errors as never
    );
  }

  const { fullName, contact, type, street, city, state, country, pincode, isMain } =
    validationResult.data;

  try {
    const newAddress = await db.shippingAddress.create({
      data: {
        fullName,
        contact,
        type,
        street,
        city,
        state,
        country,
        pincode,
        customer: {
          connect: { id: customerId }
        },
        isMain
      }
    });

    res.status(200).json({
      message: "Address created successfully",
      address: newAddress
    });
  } catch (error) {
    throw new ApiError(500, "Failed to create shipping address", error as never);
  }
});

export const getCustomerShippingAddresses = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const addresses = await db.shippingAddress.findMany({
      where: {
        customerId: customerId
      },
      orderBy: {
        isMain: "desc"
      }
    });

    res.status(200).json({
      message: "Addresses retrieved successfully",
      addresses: addresses
    });
  } catch (error) {
    throw new ApiError(500, "Failed to retrieve shipping addresses", error as never);
  }
});

export const deleteShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { addressId } = req.params;
  if (!addressId) {
    throw new ApiError(400, "Address ID is required");
  }

  try {
    const addressToDelete = await db.shippingAddress.findFirst({
      where: {
        id: addressId,
        customerId: customerId
      }
    });

    if (!addressToDelete) {
      throw new ApiError(404, "Address not found or you do not have permission to delete it.");
    }

    if (addressToDelete.isMain) {
      const nextAddress = await db.shippingAddress.findFirst({
        where: {
          customerId: customerId,
          id: { not: addressId }
        }
      });
      if (nextAddress) {
        await db.shippingAddress.update({
          where: { id: nextAddress.id },
          data: { isMain: true }
        });
      }
    }

    await db.shippingAddress.delete({
      where: {
        id: addressId
      }
    });

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    throw new ApiError(500, "Failed to delete address", error as never);
  }
});

export const updateShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { addressId } = req.params;
  if (!addressId) {
    throw new ApiError(400, "Address ID is required in parameters");
  }

  const validationResult = updateAddressSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ApiError(
      400,
      "Invalid address data provided",
      validationResult.error.errors as never
    );
  }

  const updateData = validationResult.data;
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No update data provided");
  }

  try {
    const existingAddress = await db.shippingAddress.findFirst({
      where: {
        id: addressId,
        customerId: customerId
      }
    });

    if (!existingAddress) {
      throw new ApiError(404, "Address not found or you do not have permission to update it.");
    }

    let updatedAddress;

    if (updateData.isMain === true) {
      updatedAddress = await db.$transaction(async (prisma) => {
        await prisma.shippingAddress.updateMany({
          where: {
            customerId: customerId,
            id: { not: addressId }
          },
          data: {
            isMain: false
          }
        });

        const newMainAddress = await prisma.shippingAddress.update({
          where: {
            id: addressId
          },
          data: updateData
        });

        return newMainAddress;
      });
    } else {
      updatedAddress = await db.shippingAddress.update({
        where: {
          id: addressId
        },
        data: updateData
      });
    }

    res.status(200).json({
      message: "Address updated successfully",
      address: updatedAddress
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to update shipping address", error as never);
  }
});

export const changeMainStatus = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) throw new ApiError(401, "Unauthorized request");

  const { addressId } = req.params;
  if (!addressId) throw new ApiError(400, "Address ID is required");

  const userAddress = await db.shippingAddress.findFirst({
    where: { id: addressId, customerId }
  });
  if (!userAddress) throw new ApiError(404, "Address not found");

  await db.shippingAddress.updateMany({
    where: { customerId },
    data: { isMain: false }
  });

  const updatedAddress = await db.shippingAddress.update({
    where: { id: addressId },
    data: { isMain: true }
  });

  res.status(200).json({
    message: "Main address updated",
    updatedAddress
  });
});
