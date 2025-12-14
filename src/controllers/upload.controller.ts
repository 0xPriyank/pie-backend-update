import { uploadService } from "@/services/upload.service";
import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { Request, Response } from "express";
import prisma from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";

export const uploadfile = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) {
    throw new ApiError(401, "Unauthorized. Please login to upload files.");
  }

  const file = req.file;
  if (!file) {
    throw new ApiError(400, "File is required. Please upload a file.");
  }

  const fileData = await uploadService(file.path);
  if (!fileData) {
    throw new ApiError(500, "Failed to upload file. Please try again.");
  }

  const newFile = await prisma.file.create({
    data: {
      objectKey: fileData.objectKey,
      mimeType: fileData.mimeType,
      format: fileData.format,
      sellerId: currentUser.id
    },
    select: {
      id: true
    }
  });

  res.status(201).json(new ApiResponse(201, { fileId: newFile.id }, "File uploaded successfully."));
});
