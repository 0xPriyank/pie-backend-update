import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getDocumentUrl } from "@/services/upload.service.js";

/**
 * Get document directly by objectKey (for internal use)
 */
export const getDocumentByKey = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      throw new ApiError(400, "Document key is required");
    }

    // Generate pre-signed URL
    const url = await getDocumentUrl(key);

    if (!url) {
      throw new ApiError(500, "Error generating document URL");
    }

    res
      .status(200)
      .json(new ApiResponse(200, { data: { url } }, "Document retrieved successfully"));
  } catch (error) {
    console.error("Error in getDocumentByKey:", error);
    throw new ApiError(500, "Error retrieving document");
  }
});
