import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 S3-Compatible Storage Client for RCH PlumbFlow.
 * Handles secure direct-to-cloud photo and video uploads for job evidence,
 * completion packs, and homeowner enquiry attachments.
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "plumbflow";

/**
 * Generate a pre-signed PUT URL for direct client-to-R2 uploads.
 * This guarantees ultra-fast performance: heavy photos and videos (up to 50MB)
 * stream straight to Cloudflare's edge network without burdening the app server.
 */
export async function createUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return { url, key, bucket: R2_BUCKET };
}

/**
 * Generate a pre-signed GET URL for securely downloading/viewing evidence from R2.
 */
export async function createDownloadUrl(key: string, expiresIn = 86400) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Upload a raw buffer directly to R2 from a server handler.
 */
export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return await r2Client.send(command);
}

/**
 * Delete an object from R2.
 */
export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return await r2Client.send(command);
}

/**
 * List objects within a given prefix/folder in R2.
 */
export async function listR2Objects(prefix?: string, maxKeys = 100) {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  return await r2Client.send(command);
}
