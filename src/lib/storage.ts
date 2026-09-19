import { createServerFn } from "@tanstack/react-start";
import { createUploadUrl, createDownloadUrl, listR2Objects } from "@/server/r2";

export interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  folder?: "photos" | "enquiries" | "videos" | "documents";
}

/**
 * Server function to generate a secure pre-signed upload URL for Cloudflare R2.
 */
export const getR2UploadUrl = createServerFn({ method: "POST" })
  .validator((data: PresignedUploadRequest) => data)
  .handler(async ({ data }) => {
    const ext = data.filename.split(".").pop() || "bin";
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const folder = data.folder || "photos";
    const key = `${folder}/${uniqueId}.${ext}`;

    return await createUploadUrl(key, data.contentType);
  });

/**
 * Server function to generate a secure pre-signed download URL for viewing/downloading from R2.
 */
export const getR2DownloadUrl = createServerFn({ method: "POST" })
  .validator((key: string) => key)
  .handler(async ({ data: key }) => {
    return await createDownloadUrl(key);
  });

/**
 * Server function to list evidence objects in Cloudflare R2.
 */
export const getR2ObjectList = createServerFn({ method: "POST" })
  .validator((prefix?: string) => prefix)
  .handler(async ({ data: prefix }) => {
    const result = await listR2Objects(prefix);
    return (
      result.Contents?.map((item) => ({
        key: item.Key ?? "",
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? "",
      })) ?? []
    );
  });

/**
 * Client helper: Takes a browser File, gets a presigned URL from the server,
 * and uploads directly to Cloudflare R2 with progress tracking.
 */
export async function uploadFileToR2(
  file: File,
  folder: "photos" | "enquiries" | "videos" | "documents" = "photos",
  onProgress?: (percent: number) => void,
): Promise<{ key: string; filename: string; size: number; contentType: string }> {
  const { url, key } = await getR2UploadUrl({
    data: {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
    },
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload to R2 failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error uploading file to Cloudflare R2"));
    xhr.send(file);
  });

  return {
    key,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  };
}
