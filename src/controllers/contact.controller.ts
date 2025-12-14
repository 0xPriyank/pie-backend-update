import { Request, Response } from "express";
import { db } from "../config/db.config";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ContactType, Prisma } from "@prisma/client";

export const getCustomerContact = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;

  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        contact: true
      }
    });

    if (!customer) {
      throw new ApiError(404, "Customer not found");
    }

    res.status(200).json({ contact: customer.contact });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch contact", error as never);
  }
});

export const getSellerContact = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;

  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const sellerContact = await db.seller.findUnique({
      where: { id: sellerId },
      select: {
        contact: true
      }
    });

    if (!sellerContact) {
      throw new ApiError(404, "Seller not found");
    }

    res.status(200).json({ contact: sellerContact.contact });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch contact", error as never);
  }
});

export const updateCustomerContact = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  const { contactNumber } = req.body;
  if (!contactNumber) {
    throw new ApiError(400, "Contact is required");
  }
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const customer = await db.customerContact.update({
      where: {
        customerId: customerId
      },
      data: {
        number: contactNumber
      }
    });
    res.status(200).json({ contact: customer });
  } catch (error) {
    throw new ApiError(500, "Failed to update contact", error as never);
  }
});

export const updateSellerContact = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  const { contactNumber } = req.body;
  if (!contactNumber) {
    throw new ApiError(400, "Contact is required");
  }
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const seller = await db.sellerContact.update({
      where: {
        sellerId: sellerId
      },
      data: {
        number: contactNumber
      }
    });
    res.status(200).json({ contact: seller });
  } catch (error) {
    throw new ApiError(500, "Failed to update contact", error as never);
  }
});

export const deleteCustomerContact = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const contact = await db.customerContact.delete({
      where: {
        customerId: customerId
      }
    });

    res.status(200).json({ contact: contact });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new ApiError(404, "No contact information found to delete.", error as never);
    } else {
      throw new ApiError(500, "Failed to delete contact", error as never);
    }
  }
});

export const deleteSellerContact = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const contact = await db.sellerContact.delete({
      where: {
        sellerId: sellerId
      }
    });

    res.status(200).json({ contact: contact });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new ApiError(404, "No contact information found to delete.", error as never);
    } else {
      throw new ApiError(500, "Failed to delete contact", error as never);
    }
  }
});

export const postCustomerContact = asyncHandler(async (req: Request, res: Response) => {
  const { contactNumber } = req.body;
  if (!contactNumber) {
    throw new ApiError(400, "All address fields are required");
  }
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const createContact = await db.customerContact.create({
      data: {
        number: contactNumber,
        customerId: customerId,
        isVerified: false,
        type: ContactType.MOBILE
      }
    });
    res.status(200).json({ contact: createContact });
  } catch (error) {
    throw new ApiError(500, "Failed to create contact", error as never);
  }
});

export const postSellerContact = asyncHandler(async (req: Request, res: Response) => {
  const { contactNumber } = req.body;
  if (!contactNumber) {
    throw new ApiError(400, "All address fields are required");
  }
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const createContact = await db.sellerContact.create({
      data: {
        number: contactNumber,
        sellerId: sellerId,
        isVerified: false,
        type: ContactType.MOBILE
      }
    });
    res.status(200).json({ contact: createContact });
  } catch (error) {
    throw new ApiError(500, "Failed to create contact", error as never);
  }
});

export const verifyCustomerContactNumber = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }
  const { contactNumber } = req.params;
  if (!contactNumber) {
    throw new ApiError(400, "Contact Number is required");
  }
  const contact = await db.customerContact.findFirst({
    where: {
      number: contactNumber,
      customerId: customerId
    }
  });
  if (!contact) {
    throw new ApiError(404, "Contact Number not found");
  }
  if (contact.isVerified) {
    throw new ApiError(400, "Contact Number already verified");
  }

  await db.customerContact.update({
    where: {
      id: contact.id
    },
    data: {
      isVerified: true
    }
  });
  res.status(200).json({ success: true, message: "Contact Number Verified" });
});

export const verifySellerContactNumber = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }
  const { contactNumber } = req.params;
  if (!contactNumber) {
    throw new ApiError(400, "Contact Number is required");
  }
  const contact = await db.sellerContact.findFirst({
    where: {
      number: contactNumber,
      sellerId: sellerId
    }
  });
  if (!contact) {
    throw new ApiError(
      404,
      "Contact Number not found or does not belong to the authenticated seller"
    );
  }
  if (contact.isVerified) {
    throw new ApiError(400, "Contact Number already verified");
  }

  await db.sellerContact.update({
    where: {
      id: contact.id
    },
    data: {
      isVerified: true
    }
  });
  res.status(200).json({ success: true, message: "Contact Number Verified" });
});
