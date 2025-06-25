import express from "express";
import s3Client from "#configs/awsS3";
import env from "#configs/env";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import asyncHandler from "#utils/asyncHandler";
import ImageController from "#controllers/image";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router.route("/file").get(downloadFile);

router
  .route("/:id?")
  .get(asyncHandler(ImageController.get.bind(ImageController)))
  .post(asyncHandler(ImageController.create.bind(ImageController)))
  .put(asyncHandler(ImageController.update.bind(ImageController)))
  .delete(asyncHandler(ImageController.deleteDoc.bind(ImageController)));

async function downloadFile(req, res) {
  const fileKey = req.query.key;

  if (!fileKey) {
    return res.status(404).json({ status: false, message: "Invalid path" });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const { Body, ContentType, ContentLength } = await s3Client.send(command);

    // Optional: Set headers for download
    res.setHeader("Content-Type", ContentType || "application/octet-stream");
    res.setHeader("Content-Length", ContentLength || "");
    res.setHeader("Content-Disposition", `attachment; filename="${fileKey}"`);

    // Pipe the stream directly to the response
    Body.pipe(res);
  } catch (error) {
    console.error("Error sending file:", error);
    res.status(500).json({ error: "Failed to download file." });
  }
}

export default router;
