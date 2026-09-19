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
export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: process.env["R2_ENDPOINT"] || "",
    credentials: {
      accessKeyId: process.env["R2_ACCESS_KEY_ID"] || "",
      secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"] || "",
    },
  });
}

export function getR2Bucket(): string {
  return process.env["R2_BUCKET_NAME"] || "plumbflow";
}

export const r2Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    const client = getR2Client();
    const val = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

export const R2_BUCKET = process.env["R2_BUCKET_NAME"] || "plumbflow";

/**
 * Generate a pre-signed PUT URL for direct client-to-R2 uploads.
 * This guarantees ultra-fast performance: heavy photos and videos (up to 50MB)
 * stream straight to Cloudflare's edge network without burdening the app server.
 */
export async function createUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const bucket = getR2Bucket();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, key, bucket };
}

/**
 * Generate a pre-signed GET URL for securely downloading/viewing evidence from R2.
 */
export async function createDownloadUrl(key: string, expiresIn = 86400) {
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
  });
  return await getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Upload a raw buffer directly to R2 from a server handler.
 */
export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
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
    Bucket: getR2Bucket(),
    Key: key,
  });
  return await r2Client.send(command);
}

/**
 * List objects within a given prefix/folder in R2.
 */
export async function listR2Objects(prefix?: string, maxKeys = 100) {
  const command = new ListObjectsV2Command({
    Bucket: getR2Bucket(),
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  return await r2Client.send(command);
}
