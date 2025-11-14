import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import env from "#configs/env";
import { uploadFile } from "#configs/awsS3";
import { fileTypeFromBuffer } from "file-type";

export function buildPublicUrl(key) {
  if (!env.AWS_S3_BASE_URL) return key;
  const baseUrl = env.AWS_S3_BASE_URL.replace(/\/$/, "");
  const bucketSegment = env.AWS_S3_BUCKET ? `/${env.AWS_S3_BUCKET}` : "";
  return `${baseUrl}${bucketSegment}/${key}`;
}

export async function uploadBinaryFile({
  localPath,
  originalName,
  prefix = "uploads",
  contentType,
}) {
  if (!localPath) {
    throw new Error("localPath is required to upload to storage");
  }

  const sanitizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const fileName = `${
    sanitizedPrefix ? `${sanitizedPrefix}/` : ""
  }${Date.now()}-${randomUUID()}-${
    originalName ? path.basename(originalName) : path.basename(localPath)
  }`;

  const buffer = await fs.readFile(localPath);
  let finalContentType = contentType;

  if (!finalContentType) {
    try {
      const detected = await fileTypeFromBuffer(buffer);
      if (detected?.mime) {
        finalContentType = detected.mime;
      }
    } catch (error) {
      console.warn("Failed to detect MIME type:", error.message);
    }
  }

  if (!finalContentType) {
    finalContentType = "application/octet-stream";
  }

  await uploadFile(fileName, buffer, finalContentType);
  return buildPublicUrl(fileName);
}
