import { env } from "@/config/env";
import { getFileExtension } from "@/services/upload.service";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME!,
  api_key: env.CLOUDINARY_API_KEY!,
  api_secret: env.CLOUDINARY_API_SECRET!
});

/**
 * Upload a file to Cloudinary
 * @param localFilePath Path to the local file to upload
 * @returns Public URL of the uploaded file if successful, null otherwise
 */
export const uploadToCloudinary = async (localFilePath: string): Promise<string | null> => {
  try {
    if (!localFilePath) return null;
    const folderName = `${env.CLOUDINARY_FOLDER_NAME}`;
    const format = getFileExtension(localFilePath);
    console.log(
      "Uploading to Cloudinary:",
      localFilePath,
      "Folder:",
      folderName,
      "Format:",
      format
    );
    const resourceType = getResourceFromFormat(format);
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
      folder: folderName,
      format
    });
    console.log("Upload result:", result);
    return result.public_id;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    return null;
  }
};

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";
const getResourceFromFormat = (format?: string): CloudinaryResourceType => {
  if (!format) return "raw"; // default fallback

  const normalizedFormat = format.toLowerCase();

  const imageFormats = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
  const rawFormats = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"]);
  const videoFormats = new Set(["mp4", "mov", "avi", "webm"]);

  if (imageFormats.has(normalizedFormat)) return "image";
  if (rawFormats.has(normalizedFormat)) return "raw";
  if (videoFormats.has(normalizedFormat)) return "video";

  return "raw";
};

export const getDocumentUrlCloudinary = (publicId: string, format?: string): string => {
  if (!publicId) return "";
  console.log("Generating Cloudinary URL for publicId:", publicId, "Format:", format);
  const resource_type = getResourceFromFormat(format);
  return cloudinary.url(publicId, {
    resource_type: resource_type,
    secure: true,
    format: format || "auto",
    analytics: false,
    folder: env.CLOUDINARY_FOLDER_NAME || ""
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto"
    });
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
  }
};
