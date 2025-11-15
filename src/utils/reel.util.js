import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildPublicUrl, uploadBinaryFile } from "#utils/storage";

const REEL_PREFIX = "reels";
const THUMBNAIL_TMP_DIR = path.join(process.cwd(), "tmp", "reel-thumbnails");

async function ensureThumbnailTmpDir() {
  await fs.mkdir(THUMBNAIL_TMP_DIR, { recursive: true });
}

export async function getVideoDurationInSeconds(filePath) {
  // TODO: Replace this stub with a real ffprobe/fluent-ffmpeg duration check.
  // The idea is to call something like: ffprobe -v quiet -print_format json -show_format filePath.
  return 15;
}

export async function uploadToStorage(localPath, originalName) {
  return uploadBinaryFile({
    localPath,
    originalName,
    prefix: REEL_PREFIX,
    contentType: "video/mp4",
  });
}

export async function uploadThumbnailFile(localPath, originalName) {
  return uploadBinaryFile({
    localPath,
    originalName,
    prefix: `${REEL_PREFIX}/thumbnails`,
  });
}

export async function generateThumbnail(localPath) {
  try {
    await ensureThumbnailTmpDir();
    const tempFileName = `${Date.now()}-${randomUUID()}.jpg`;
    const tempFilePath = path.join(THUMBNAIL_TMP_DIR, tempFileName);

    await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: { r: 15, g: 23, b: 42 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="640" height="360">
              <rect x="20" y="20" width="600" height="320" rx="30" ry="30" fill="#1f2937"/>
              <polygon points="300,180 360,210 300,240" fill="#fbbf24"/>
            </svg>`,
          ),
          gravity: "center",
        },
      ])
      .jpeg({ quality: 80 })
      .toFile(tempFilePath);

    const uploadedUrl = await uploadBinaryFile({
      localPath: tempFilePath,
      originalName: "thumbnail.jpg",
      prefix: `${REEL_PREFIX}/thumbnails`,
      contentType: "image/jpeg",
    });

    await fs.unlink(tempFilePath).catch(() => {});
    return uploadedUrl;
  } catch (error) {
    console.warn("Failed to generate reel thumbnail:", error);
    const placeholderKey = `${REEL_PREFIX}/thumbnails/${Date.now()}-${randomUUID()}.jpg`;
    return buildPublicUrl(placeholderKey);
  }
}
