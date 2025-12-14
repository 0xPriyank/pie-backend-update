import { z } from "zod";
// Standard error response
export const errorSchema = z.object({
  error: z.enum(["Unauthorized", "BadRequest", "NotFound", "RateLimit", "ServerError"]),
  message: z.string()
});

// Step 1: Business Info
export const businessInfoSchema = z.object({
  businessType: z.enum(["individual", "proprietorship", "private_limited", "others"]),
  country: z.literal("india"),
  legalName: z.string().min(3)
});

// Step 2: GST Details
export const gstSchema = z
  .object({
    gstin: z
      .string()
      .trim()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN format")
      .optional()
      .or(z.literal("")),
    withoutGst: z.boolean().default(false),
    exemptionReason: z.string().trim().optional(),
    gstCertificateFileId: z.string().trim().uuid().optional(),
    panCardFileId: z.string().trim().uuid().optional(),
    gstRate: z
      .number()
      .min(0, "GST rate cannot be negative")
      .max(100, "GST rate cannot exceed 100")
      .optional()
  })
  .refine(
    (data) => {
      if (data.withoutGst) {
        return !!data.exemptionReason?.trim(); // must not be empty when withoutGst is true
      }
      return true; // no need to check exemptionReason if withoutGst is false
    },
    {
      message: "Exemption reason is required when 'withoutGst' is true.",
      path: ["exemptionReason"]
    }
  );

// Step 3: Storefront Setup
export const storefrontSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  storeDescription: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(500, "Description cannot exceed 500 characters"),
  storeLocation: z.string().min(3, "Location must be at least 3 characters"),
  storeLogo: z.string().trim().uuid().optional(),
  productCategories: z.array(z.string()).min(1, "Select at least one category"),
  isBrandOwner: z.boolean().default(false)
});

// Step 4: Shipping & Addresses
export const shippingSchema = z.object({
  shippingType: z.enum(["SELF_FULFILLED", "PLATFORM_COURIER"]),
  shippingFee: z.enum(["free", "paid"]),
  pickupAddress: z.object({
    addressLine1: z.string().min(3, "Address must be at least 3 characters"),
    addressLine2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode")
  }),
  returnAddressSameAsPickup: z.boolean(),
  returnAddress: z
    .object({
      addressLine1: z.string().min(3, "Address must be at least 3 characters"),
      addressLine2: z.string().optional(),
      city: z.string().min(2, "City is required"),
      state: z.string().min(2, "State is required"),
      pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode")
    })
    .optional()
});

// Step 5: Bank Details
export const bankSchema = z.object({
  accountName: z.string().min(3, "Account name must be at least 3 characters"),
  accountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be between 9 and 18 digits"),
  ifscCode: z.string().regex(/^[A-Za-z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  bankDocument: z.string().trim().uuid().optional()
});

// Step 6: KYC Verification
export const kycSchema = z.object({
  documentType: z.enum(["pan", "aadhaar", "driving_license", "voter_id"]),
  document: z.string().trim().uuid().min(1, "Document upload is required"),
  selfie: z.string().trim().uuid().min(1, "Selfie upload is required")
});

// Step 7: Legal Confirmation
export const legalSchema = z.object({
  tcsCompliance: z.boolean().refine((v) => v === true, {
    message: "You must agree to TCS compliance terms"
  }),
  termsOfService: z.boolean().refine((v) => v === true, {
    message: "You must agree to Terms of Service"
  })
});

// Combined for All-in-One
export const sellerOnboardingSchema = z.object({
  businessInfo: businessInfoSchema,
  gst: gstSchema,
  storefront: storefrontSchema,
  shipping: shippingSchema,
  bank: bankSchema,
  kyc: kycSchema,
  legal: legalSchema
});

// Progress Tracker
export const progressSchema = z.object({
  completed: z.array(
    z.enum(["businessInfo", "gst", "storefront", "shipping", "bank", "kyc", "legal"])
  ),
  left: z.array(z.enum(["businessInfo", "gst", "storefront", "shipping", "bank", "kyc", "legal"])),
  current: z.enum(["businessInfo", "gst", "storefront", "shipping", "bank", "kyc", "legal", "done"])
});

// GST Lookup Result
export const gstLookupInputSchema = z.object({
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN format")
});

export const ifscLookupInputSchema = z.object({
  ifscCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
});

export const gstLookupResponseSchema = z.object({
  gstin: z.string(),
  "legal-name": z.string(),
  "trade-name": z.string().optional(),
  pan: z.string(),
  "dealer-type": z.string(),
  "registration-date": z.string(),
  "entity-type": z.string(),
  business: z.string(),
  status: z.string(),
  address: z.object({
    floor: z.string().optional(),
    bno: z.string(),
    bname: z.string().optional(),
    street: z.string(),
    location: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    lt: z.string().optional(),
    lg: z.string().optional()
  })
});

// IFSC Lookup Result
export const ifscLookupResponseSchema = z.object({
  ifsc: z.string(),
  bankName: z.string(),
  branch: z.string(),
  address: z.string(),
  micr: z.string(),
  contact: z.string().optional()
});

export const ONBOARDING_STEPS = [
  "businessInfo",
  "gst",
  "storefront",
  "shipping",
  "bank",
  "kyc",
  "legal",
  "done"
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type SellerOnboardingData = z.infer<typeof sellerOnboardingSchema>;
export type OnboardingProgress = z.infer<typeof progressSchema>;
export type GstLookupResult = z.infer<typeof gstLookupResponseSchema>;
export type IfscLookupResult = z.infer<typeof ifscLookupResponseSchema>;
export type ErrorResponse = z.infer<typeof errorSchema>;
