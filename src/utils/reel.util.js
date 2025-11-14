import { randomUUID } from "node:crypto";
import { buildPublicUrl, uploadBinaryFile } from "#utils/storage";

const REEL_PREFIX = "reels";

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

export async function generateThumbnail(localPath) {
  // TODO: Generate a real thumbnail using ffmpeg/sharp. Returning a simulated URL for now.
  const thumbnailKey = `${REEL_PREFIX}/thumbnails/${Date.now()}-${randomUUID()}.jpg`;
  return buildPublicUrl(thumbnailKey);
}
