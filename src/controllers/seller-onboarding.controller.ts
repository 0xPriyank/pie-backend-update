import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import db from "@/config/db.config";
import type { Request, Response } from "express";
import {
  bankSchema,
  gstSchema,
  kycSchema,
  ONBOARDING_STEPS,
  OnboardingStep,
  sellerOnboardingSchema,
  storefrontSchema
} from "@/schemas/seller-onboarding.schema";

// Step 1: Business Info
const saveBusinessInfo = asyncHandler(async (req: Request, res: Response) => {
  const { businessType, country, legalName } = req.body;
  const { email } = req.user as { email: string };

  if (!email || !businessType || !country || !legalName) {
    throw new ApiError(400, "All fields are required");
  }

  const seller = await db.seller.findUnique({ where: { email } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // Update business info
  await db.seller.update({
    where: { email },
    data: {
      businessType,
      country,
      legalName
    }
  });

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "businessInfo");

  res.status(200).json(new ApiResponse(200, {}, "Business info saved."));
});

// Step 2: GST Details
const saveGstDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.user as { id: string };
  const { gstin, withoutGst, exemptionReason, gstCertificateFileId, panCardFileId, gstRate } =
    gstSchema.parse(req.body);

  const seller = await db.seller.findUnique({ where: { id } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(
      403,
      "Seller is not verified. Please complete verification before providing GST details."
    );
  }

  // Validate GST details
  if (!withoutGst && !gstin) {
    throw new ApiError(400, "GSTIN is required unless exempt");
  }

  if (withoutGst && !exemptionReason) {
    throw new ApiError(400, "Exemption reason is required when not providing GST");
  }

  for (const fileId of [gstCertificateFileId, panCardFileId]) {
    if (fileId) {
      const file = await db.file.findUnique({
        where: { id: fileId },
        select: { id: true, sellerId: true }
      });
      if (!file || file.sellerId !== seller.id) {
        throw new ApiError(403, `Unauthorized access to file ${fileId}`);
      }
    }
  }

  const existingGST = await db.gSTInfo.findUnique({ where: { sellerId: seller.id } });

  if (existingGST) {
    await db.gSTInfo.update({
      where: { sellerId: seller.id },
      data: {
        gstin,
        withoutGst,
        exemptionReason: withoutGst ? exemptionReason : null,
        gstRate: gstRate || existingGST.gstRate,
        gstCertificateFileId,
        panCardFileId
      },
      select: {
        id: true
      }
    });
  } else {
    await db.gSTInfo.create({
      data: {
        sellerId: seller.id,
        gstin,
        withoutGst,
        exemptionReason: withoutGst ? exemptionReason : null,
        gstRate: gstRate || 0,
        gstCertificateFileId,
        panCardFileId
      },
      select: { id: true }
    });
  }

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "gst");

  res.status(200).json(new ApiResponse(200, {}, "GST details saved."));
});

// Step 3: Storefront Setup
const saveStorefrontDetails = asyncHandler(async (req: Request, res: Response) => {
  const { storeName, storeDescription, storeLocation, productCategories, isBrandOwner, storeLogo } =
    storefrontSchema.parse(req.body);

  const { id } = req.user as { id: string };

  if (!id) {
    throw new ApiError(400, "Seller ID is required");
  }

  const seller = await db.seller.findUnique({ where: { id } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  if (storeLogo) {
    const file = await db.file.findUnique({
      where: { id: storeLogo },
      select: { id: true, sellerId: true }
    });

    if (!file) {
      throw new ApiError(404, "Store logo not found");
    }
    if (file.sellerId !== seller.id) {
      throw new ApiError(403, "Unauthorized access to store logo");
    }
  }

  // Update seller info
  await db.storefrontInfo.upsert({
    where: { sellerId: seller.id },
    update: {
      storeName,
      storeDescription,
      storeLocation,
      productCategories,
      isBrandOwner,
      storeLogoId: storeLogo || null
    },
    create: {
      storeName,
      storeDescription,
      storeLocation,
      productCategories,
      isBrandOwner,
      seller: {
        connect: {
          id: seller.id
        }
      },
      ...(storeLogo && {
        storeLogo: {
          connect: { id: storeLogo }
        }
      })
    }
  });

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "storefront");

  res.status(200).json(new ApiResponse(200, {}, "Storefront configured."));
});

// Step 4: Shipping & Addresses
const saveShippingDetails = asyncHandler(async (req: Request, res: Response) => {
  const { shippingType, shippingFee, pickupAddress, returnAddressSameAsPickup, returnAddress } =
    req.body;
  const { email } = req.user as { email: string };

  if (!email || !shippingType || !shippingFee || !pickupAddress) {
    throw new ApiError(400, "Required fields are missing");
  }

  const seller = await db.seller.findUnique({ where: { email }, include: { contact: true } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // Update shipping preferences
  await db.seller.update({
    where: { id: seller.id },
    data: {
      shippingType,
      shippingFee
    }
  });

  // Create pickup address
  await db.sellerShippingAddress.create({
    data: {
      type: "PICKUP",
      addressLine1: pickupAddress.addressLine1,
      addressLine2: pickupAddress.addressLine2 || null,
      city: pickupAddress.city,
      state: pickupAddress.state,
      country: "India",
      pincode: pickupAddress.pincode,
      fullName: seller.fullName,
      contact: seller.contact?.number || "",
      seller: { connect: { id: seller.id } }
    }
  });

  // Create return address if different from pickup
  if (!returnAddressSameAsPickup && returnAddress) {
    await db.sellerShippingAddress.create({
      data: {
        type: "RETURN",
        addressLine1: returnAddress.addressLine1,
        addressLine2: returnAddress.addressLine2 || null,
        city: returnAddress.city,
        state: returnAddress.state,
        country: "India",
        pincode: returnAddress.pincode,
        fullName: seller.fullName,
        contact: seller.contact?.number || "",
        seller: { connect: { id: seller.id } }
      }
    });
  } else if (returnAddressSameAsPickup) {
    // Copy pickup address as return address
    await db.sellerShippingAddress.create({
      data: {
        type: "RETURN",
        addressLine1: pickupAddress.addressLine1,
        addressLine2: pickupAddress.addressLine2 || null,
        city: pickupAddress.city,
        state: pickupAddress.state,
        country: "India",
        pincode: pickupAddress.pincode,
        fullName: seller.fullName,
        contact: seller.contact?.number || "",
        seller: { connect: { id: seller.id } }
      }
    });
  }

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "shipping");

  res.status(200).json(new ApiResponse(200, {}, "Shipping info saved."));
});

// Step 5: Bank Details
const saveBankDetails = asyncHandler(async (req: Request, res: Response) => {
  const { accountName, accountNumber, ifscCode, bankDocument } = bankSchema.parse(req.body);
  const { id } = req.user as { id: string };

  const seller = await db.seller.findUnique({ where: { id } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // Upload bank document if provided
  if (bankDocument) {
    const file = await db.file.findUnique({
      where: { id: bankDocument },
      select: { id: true, sellerId: true }
    });
    if (!file) {
      throw new ApiError(404, "Bank document not found");
    }
    if (file.sellerId !== seller.id) {
      throw new ApiError(403, "Unauthorized access to bank document");
    }
  }

  // Check if bank details already exist
  const existingBankDetails = await db.bankDetails.findUnique({
    where: { sellerId: seller.id }
  });

  if (existingBankDetails) {
    // Update existing bank details
    await db.bankDetails.update({
      where: { sellerId: seller.id },
      data: {
        accountName,
        accountNumber,
        ifscCode,
        seller: { connect: { id: seller.id } },
        ...(bankDocument && { documentFile: { connect: { id: bankDocument } } })
      }
    });
  } else {
    // Create new bank details
    await db.bankDetails.create({
      data: {
        accountName,
        accountNumber,
        ifscCode,

        seller: { connect: { id: seller.id } },
        ...(bankDocument && { documentFile: { connect: { id: bankDocument } } })
      }
    });
  }

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "bank");

  res.status(200).json(new ApiResponse(200, {}, "Bank details saved."));
});

// Step 6: KYC Verification
const saveKycDetails = asyncHandler(async (req: Request, res: Response) => {
  const { documentType, document, selfie } = kycSchema.parse(req.body);
  const { id } = req.user as { id: string };

  const seller = await db.seller.findUnique({ where: { id } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // check if document and selfie belong to the seller
  if (document) {
    const docFile = await db.file.findUnique({
      where: { id: document },
      select: { id: true, sellerId: true }
    });
    if (!docFile) {
      throw new ApiError(404, "KYC document not found");
    }
    if (docFile.sellerId !== seller.id) {
      throw new ApiError(403, "Unauthorized access to KYC document");
    }
  }

  if (selfie) {
    const selfieFile = await db.file.findUnique({
      where: { id: selfie },
      select: { id: true, sellerId: true }
    });
    if (!selfieFile) {
      throw new ApiError(404, "Selfie not found");
    }
    if (selfieFile.sellerId !== seller.id) {
      throw new ApiError(403, "Unauthorized access to selfie");
    }
  }

  await db.kYCInfo.upsert({
    where: { sellerId: seller.id },
    update: {
      kycDocumentType: documentType,
      kycDone: true,
      // if document and selfie are provided, connect them
      ...(document && { kycDocument: { connect: { id: document } } }),
      ...(selfie && { kycSelfie: { connect: { id: selfie } } })
    },
    create: {
      kycDocumentType: documentType,
      kycDone: true,
      seller: { connect: { id: seller.id } },
      // if document and selfie are provided, connect them
      ...(document && { kycDocument: { connect: { id: document } } }),
      ...(selfie && { kycSelfie: { connect: { id: selfie } } })
    }
  });

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "kyc");

  res.status(200).json(new ApiResponse(200, {}, "KYC submitted."));
});

// Step 7: Legal Confirmation
const saveLegalConfirmation = asyncHandler(async (req: Request, res: Response) => {
  const { tcsCompliance, termsOfService } = req.body;
  const { id } = req.user as { id: string };

  if (!tcsCompliance || !termsOfService) {
    throw new ApiError(400, "You must agree to all terms");
  }

  const seller = await db.seller.findUnique({ where: { id } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // Update legal agreements
  await db.seller.update({
    where: { id: seller.id },
    data: {
      tcsCompliance,
      termsOfService,
      legalAgreementDate: new Date()
    }
  });

  // Track onboarding progress
  await updateOnboardingProgress(seller.id, "legal");

  res.status(200).json(new ApiResponse(200, {}, "Legal terms accepted."));
});

// Step 8: Complete Onboarding (All-in-One)
const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const { businessInfo, gst, storefront, shipping, bank, kyc, legal } =
    sellerOnboardingSchema.parse(req.body);
  const { email } = req.user as { email: string };

  const seller = await db.seller.findUnique({ where: { email }, include: { contact: true } });
  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  if (!seller.isVerified) {
    throw new ApiError(403, "Seller is not verified");
  }

  // Process each section
  // This is a simplified version - in a real implementation, you'd validate and process each section

  // Create addresses
  await db.sellerShippingAddress.upsert({
    where: {
      sellerId_type: {
        sellerId: seller.id,
        type: "PICKUP"
      }
    },
    update: {
      type: "PICKUP",
      addressLine1: shipping.pickupAddress.addressLine1,
      addressLine2: shipping.pickupAddress.addressLine2 || null,
      city: shipping.pickupAddress.city,
      state: shipping.pickupAddress.state,
      pincode: shipping.pickupAddress.pincode,
      country: "India",
      fullName: seller.fullName,
      contact: seller.contact?.number || "",
      seller: { connect: { id: seller.id } }
    },
    create: {
      type: "PICKUP",
      addressLine1: shipping.pickupAddress.addressLine1,
      addressLine2: shipping.pickupAddress.addressLine2 || null,
      city: shipping.pickupAddress.city,
      state: shipping.pickupAddress.state,
      pincode: shipping.pickupAddress.pincode,
      country: "India",
      fullName: seller.fullName,
      contact: seller.contact?.number || "",
      seller: { connect: { id: seller.id } }
    }
  });

  const returnAddress = shipping.returnAddressSameAsPickup
    ? shipping.pickupAddress
    : shipping.returnAddress;

  if (returnAddress) {
    await db.sellerShippingAddress.upsert({
      where: {
        sellerId_type: {
          sellerId: seller.id,
          type: "RETURN"
        }
      },
      update: {
        type: "RETURN",
        addressLine1: returnAddress.addressLine1,
        addressLine2: returnAddress.addressLine2 || null,
        city: returnAddress.city,
        state: returnAddress.state,
        pincode: returnAddress.pincode,
        country: "India",
        fullName: seller.fullName,
        contact: seller.contact?.number || "",
        seller: { connect: { id: seller.id } }
      },
      create: {
        type: "RETURN",
        addressLine1: returnAddress.addressLine1,
        addressLine2: returnAddress.addressLine2 || null,
        city: returnAddress.city,
        state: returnAddress.state,
        pincode: returnAddress.pincode,
        country: "India",
        fullName: seller.fullName,
        contact: seller.contact?.number || "",
        seller: { connect: { id: seller.id } }
      }
    });
  }

  // Create/update bank details
  await db.bankDetails.upsert({
    where: { sellerId: seller.id },
    update: {
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      seller: { connect: { id: seller.id } },
      // If bank document is provided, connect it
      ...(bank.bankDocument && {
        documentFile: {
          connect: { id: bank.bankDocument }
        }
      })
    },
    create: {
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      seller: { connect: { id: seller.id } },
      // If bank document is provided, connect it
      ...(bank.bankDocument && {
        documentFile: {
          connect: { id: bank.bankDocument }
        }
      })
    }
  });

  // Set all steps as completed
  await db.sellerOnboardingProgress.update({
    where: { sellerId: seller.id },
    data: {
      progressStep: [
        "businessInfo",
        "gst",
        "storefront",
        "shipping",
        "bank",
        "kyc",
        "legal",
        "done"
      ],
      completed: true
    }
  });

  // Update seller with all information
  await db.seller.update({
    where: { id: seller.id },
    data: {
      // Business info
      businessType: businessInfo.businessType,
      country: businessInfo.country,
      legalName: businessInfo.legalName,

      // GST details
      GSTInfo: {
        upsert: {
          update: {
            gstin: gst.gstin,
            withoutGst: gst.withoutGst,
            exemptionReason: gst.withoutGst ? gst.exemptionReason : null,
            gstRate: gst.gstRate,
            // If GST certificate file is provided, connect it
            ...(gst.gstCertificateFileId && {
              gstCertificateFile: {
                connect: { id: gst.gstCertificateFileId }
              }
            }),
            // If PAN card file is provided, connect it
            ...(gst.panCardFileId && {
              panCardFile: {
                connect: { id: gst.panCardFileId }
              }
            })
          },
          create: {
            gstin: gst.gstin,
            withoutGst: gst.withoutGst,
            exemptionReason: gst.withoutGst ? gst.exemptionReason : null,
            gstRate: gst.gstRate,
            // If GST certificate file is provided, connect it
            ...(gst.gstCertificateFileId && {
              gstCertificateFile: {
                connect: { id: gst.gstCertificateFileId }
              }
            }),
            // If PAN card file is provided, connect it
            ...(gst.panCardFileId && {
              panCardFile: {
                connect: { id: gst.panCardFileId }
              }
            })
          }
        }
      },

      // Storefront
      storefrontInfo: {
        upsert: {
          update: {
            storeName: storefront.storeName,
            storeDescription: storefront.storeDescription,
            storeLocation: storefront.storeLocation,
            productCategories: storefront.productCategories,
            isBrandOwner: storefront.isBrandOwner,
            // If store logo is provided, connect it
            ...(storefront.storeLogo && {
              storeLogo: {
                connect: { id: storefront.storeLogo }
              }
            })
          },
          create: {
            storeName: storefront.storeName,
            storeDescription: storefront.storeDescription,
            storeLocation: storefront.storeLocation,
            productCategories: storefront.productCategories,
            isBrandOwner: storefront.isBrandOwner,

            // If store logo is provided, connect it
            ...(storefront.storeLogo && {
              storeLogo: {
                connect: { id: storefront.storeLogo }
              }
            })
          }
        }
      },

      // Shipping
      shippingType: shipping.shippingType,
      shippingFee: shipping.shippingFee,

      // KYC
      KYCInfo: {
        upsert: {
          update: {
            kycDocumentType: kyc.documentType,
            kycDone: true,
            // If KYC document is provided, connect it
            ...(kyc.document && {
              kycDocument: {
                connect: { id: kyc.document }
              }
            }),
            // If selfie is provided, connect it
            ...(kyc.selfie && {
              kycSelfie: {
                connect: { id: kyc.selfie }
              }
            })
          },
          create: {
            kycDocumentType: kyc.documentType,
            kycDone: true,
            // If KYC document is provided, connect it
            ...(kyc.document && {
              kycDocument: {
                connect: { id: kyc.document }
              }
            }),
            // If selfie is provided, connect it
            ...(kyc.selfie && {
              kycSelfie: {
                connect: { id: kyc.selfie }
              }
            })
          }
        }
      },

      // Legal
      tcsCompliance: legal.tcsCompliance,
      termsOfService: legal.termsOfService,
      legalAgreementDate: new Date(),

      // Mark onboarding as complete
      onboardingComplete: true,
      onboardingCompletedAt: new Date()
    }
  });

  res.status(200).json(new ApiResponse(200, {}, "Onboarding complete."));
});

// Step 9: Get Onboarding Progress
const getOnboardingProgress = asyncHandler(async (req: Request, res: Response) => {
  const { id: sellerId } = req.user as { id: string };

  const seller = await db.seller.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      email: true,
      fullName: true,
      businessType: true,
      businessName: true,
      legalName: true,
      country: true,
      shippingType: true,
      shippingFee: true,
      tcsCompliance: true,
      termsOfService: true
    }
  });
  if (!seller) throw new ApiError(404, "Seller not found");

  const allSteps = [...ONBOARDING_STEPS];
  if (allSteps.length === 0) throw new ApiError(500, "ONBOARDING_STEPS is empty");

  let progress = await db.sellerOnboardingProgress.findUnique({
    where: { sellerId }
  });

  if (!progress) {
    progress = await db.sellerOnboardingProgress.create({
      data: {
        sellerId,
        progressStep: [],
        completed: false
      }
    });
  }

  const completedSteps = progress.progressStep;
  const leftSteps = allSteps.filter((step) => !completedSteps.includes(step));

  const currentStep =
    completedSteps.length === 0
      ? allSteps[0]
      : leftSteps.length > 0
        ? leftSteps[0]
        : allSteps[allSteps.length - 1];

  res.status(200).json(
    new ApiResponse(200, {
      seller,
      completed: completedSteps,
      left: leftSteps,
      current: currentStep
    })
  );
});

// Step 10: GSTIN Lookup
const lookupGstin = asyncHandler(async (req: Request, res: Response) => {
  const { gstin } = req.params;

  if (!gstin || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    throw new ApiError(400, "Invalid GSTIN format");
  }

  try {
    // TODO:
    // This would be a real API call in production
    // For demo purposes, we're returning mock data
    const gstData = {
      gstin: gstin,
      "legal-name": "SAMPLE COMPANY PVT LTD",
      "trade-name": "SAMPLE COMPANY",
      pan: gstin.substring(2, 12),
      "dealer-type": "Regular",
      "registration-date": "01/01/2020",
      "entity-type": "Private Limited Company",
      business: "Office / Sale Office",
      status: "Active",
      address: {
        floor: "3rd Floor",
        bno: "123",
        bname: "Business Tower",
        street: "Main Street",
        location: "Business District",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        lt: "19.0760",
        lg: "72.8777"
      }
    };

    res.status(200).json(new ApiResponse(200, gstData));
  } catch (error) {
    console.error("GSTIN lookup failed:", error);
    throw new ApiError(404, "GSTIN not found or service unavailable");
  }
});

// Step 11: IFSC Code Lookup
const lookupIfsc = asyncHandler(async (req: Request, res: Response) => {
  const { ifscCode } = req.params;

  if (!ifscCode || !/^[A-Za-z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    throw new ApiError(400, "Invalid IFSC code format");
  }

  try {
    // This would be a real API call in production
    // For demo purposes, we're returning mock data
    const ifscData = {
      ifsc: ifscCode,
      bankName: "HDFC BANK",
      branch: "ANDHERI",
      address: "HDFC BANK LTD, SHOP NO 1,2,3, MANEK PLAZA, ANDHERI, MUMBAI - 400093",
      micr: "400240002",
      contact: "+91-22-28516000"
    };

    res.status(200).json(new ApiResponse(200, ifscData));
  } catch (error) {
    console.error("IFSC lookup failed:", error);
    throw new ApiError(404, "IFSC code not found or service unavailable");
  }
});

// Helper function to update onboarding progress
const updateOnboardingProgress = async (sellerId: string, completedStep: OnboardingStep) => {
  const progress = await db.sellerOnboardingProgress.findUnique({
    where: { sellerId }
  });

  // Define the step order
  const lastStep = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];

  if (progress) {
    // Update existing progress
    const completedSteps = [...progress.progressStep];
    if (!completedSteps.includes(completedStep)) {
      completedSteps.push(completedStep);
    }

    await db.sellerOnboardingProgress.update({
      where: { sellerId },
      data: {
        progressStep: completedSteps,
        completed: completedStep === lastStep
      }
    });
  } else {
    // Create new progress record
    await db.sellerOnboardingProgress.create({
      data: {
        sellerId,
        progressStep: [completedStep],
        completed: completedStep === lastStep
      }
    });
  }
};

export {
  saveBusinessInfo,
  saveGstDetails,
  saveStorefrontDetails,
  saveShippingDetails,
  saveBankDetails,
  saveKycDetails,
  saveKycDetails as saveKYCDocument,
  saveLegalConfirmation,
  completeOnboarding,
  getOnboardingProgress,
  lookupGstin,
  lookupIfsc
};
