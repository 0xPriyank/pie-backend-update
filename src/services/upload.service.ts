import { uploadToCloudinary, getDocumentUrlCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import fs from "node:fs";
import path from "node:path";

type uploadServiceResponse = {
  objectKey: string;
  mimeType: string;
  format: string;
};

/**
 * Upload a file to cloud (Cloudinary)
 * @param localFilePath Path to the local file to upload
 * @returns Object key if successful, null otherwise
 */

const uploadService = async (localFilePath: string): Promise<uploadServiceResponse | null> => {
  try {
    if (!localFilePath) return null;
    const objectKey = await uploadToCloudinary(localFilePath);
    if (!objectKey) {
      throw new Error("Failed to upload file to Cloudinary");
    }
    const response = {
      objectKey,
      mimeType: getContentType(getFileExtension(localFilePath)),
      format: getFileExtension(localFilePath)
    };
    return response;
  } catch (error) {
    console.error("Error uploading file to cloud:", error);
    return null;
  } finally {
    // Ensure the local file is deleted regardless of success or failure
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }
};

const getDocumentUrl = (objectKey: string, format?: string): string => {
  if (!objectKey) return "";
  const url = getDocumentUrlCloudinary(objectKey, format);
  if (url) return url;
  return "";
};

const deleteFromCloud = async (objectKey: string) => {
  try {
    if (!objectKey) return;

    await deleteFromCloudinary(objectKey);
    return true;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
};

const getContentType = (extension: string): string => {
  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    txt: "text/plain"
  };

  return contentTypes[extension.toLowerCase()] || "application/octet-stream";
};

const getFileExtension = (localFilePath: string): string => {
  return path.extname(localFilePath).slice(1);
};

export { uploadService, getDocumentUrl, deleteFromCloud, getContentType, getFileExtension };
