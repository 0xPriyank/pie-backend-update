import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";
import {
  saveBusinessInfo,
  saveGstDetails,
  saveStorefrontDetails,
  saveShippingDetails,
  saveBankDetails,
  saveKYCDocument,
  saveLegalConfirmation,
  getOnboardingProgress,
  lookupGstin,
  lookupIfsc,
  completeOnboarding
} from "@/controllers/seller-onboarding.controller";

import {
  businessInfoSchema,
  gstSchema,
  storefrontSchema,
  shippingSchema,
  bankSchema,
  kycSchema,
  legalSchema,
  gstLookupInputSchema,
  ifscLookupInputSchema,
  sellerOnboardingSchema
} from "@/schemas/seller-onboarding.schema";

const router = Router();

// All onboarding routes require authentication
router.use(verifyJWT("seller"));

// Step 1: Business Info
router.put("/business-info", validate(businessInfoSchema, "body"), saveBusinessInfo);

// Step 2: GST Details
router.put("/gst-details", validate(gstSchema, "body"), saveGstDetails);

// Step 3: Storefront Setup
router.put("/storefront", validate(storefrontSchema, "body"), saveStorefrontDetails);

// Step 4: Shipping & Addresses
router.put("/shipping", validate(shippingSchema, "body"), saveShippingDetails);

// Step 5: Bank Details
router.put("/bank-details", validate(bankSchema, "body"), saveBankDetails);

// Step 6: KYC Verification
router.put("/kyc-details", validate(kycSchema), saveKYCDocument);

// Step 7: Legal Confirmation
router.put("/legal-confirmation", validate(legalSchema, "body"), saveLegalConfirmation);

// Get Onboarding Progress
router.get("/progress", getOnboardingProgress);

// GSTIN Lookup
router.get("/lookup/gst/:gstin", validate(gstLookupInputSchema, "params"), lookupGstin);

// IFSC Code Lookup
router.get("/lookup/ifsc/:ifscCode", validate(ifscLookupInputSchema, "params"), lookupIfsc);

// Complete Onboarding
router.post("/complete", validate(sellerOnboardingSchema, "body"), completeOnboarding);

export default router;
