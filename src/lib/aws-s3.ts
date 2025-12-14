import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandInput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { ServerSideEncryption } from "@aws-sdk/client-s3";
import { getContentType, getFileExtension } from "@/services/upload.service";
import { env } from "@/config/env";

// ----CTP: Initialize S3 client - only configure if credentials are provided
const s3Client = new S3Client({
  region: env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// Bucket name from environment variable
const bucketName = env.AWS_S3_BUCKET_NAME || "";

/**
 * Upload a file to AWS S3 with server-side encryption
 * @param localFilePath Path to the local file to upload
 * @returns Object key if successful, null otherwise
 */
const uploadToS3 = async (localFilePath: string): Promise<string | null> => {
  try {
    if (!localFilePath) return null;

    // Generate a unique object key
    const fileExtension = getFileExtension(localFilePath);
    const objectKey = `${uuidv4()}${fileExtension}`;

    // Read file content
    const fileContent = fs.readFileSync(localFilePath);

    // Upload to S3 with server-side encryption
    const uploadParams = {
      Bucket: bucketName,
      Key: objectKey,
      Body: fileContent,
      ContentType: getContentType(fileExtension),
      ServerSideEncryption: ServerSideEncryption.AES256
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return the object key to be stored in the database
    return objectKey;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return null;
  }
};

/**
 * Get a pre-signed URL for a document stored in S3
 * @param objectKey The S3 object key of the document
 * @returns Pre-signed URL if successful, null otherwise
 */

const getDocumentUrlS3 = async (objectKey: string): Promise<string | null> => {
  try {
    if (!objectKey) return null;

    const getObjectParams = {
      Bucket: bucketName,
      Key: objectKey
    };

    // Generate a pre-signed URL for the document
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command);
    return signedUrl;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return null;
  }
};

const deleteDocumentFromS3 = async (objectKey: string) => {
  try {
    const deleteObjectParams: DeleteObjectCommandInput = {
      Bucket: bucketName,
      Key: objectKey
    };

    const command = new DeleteObjectCommand(deleteObjectParams);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting object: ", error);
    return false;
  }
};

export { uploadToS3, getDocumentUrlS3, deleteDocumentFromS3 };
