import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import env from "#configs/env"; // Assuming your env file is in the same directory

// Initialize the S3 client for MinIO or AWS
const s3Client = new S3Client({
  region: env.AWS_S3_REGION,
  credentials: {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY,
  },
  endpoint: env.AWS_S3_BASE_URL, // For MinIO, set this to your MinIO server URL (e.g., http://localhost:9000). For AWS, comment out this line.
  forcePathStyle: true, // Required for MinIO compatibility
  // To use with AWS S3 instead of MinIO, comment out the endpoint and forcePathStyle lines
});

// Function to upload a file to S3/MinIO
export const uploadFile = async (fileKey, fileBuffer, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return fileKey;
  } catch (error) {
    throw error;
  }
};

// Function to retrieve a file from S3/MinIO
export const getFile = async (fileKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: fileKey,
    });

    const { Body } = await s3Client.send(command);
    return Body;
  } catch (error) {
    throw error;
  }
};

// Function to delete a file from S3/MinIO
export const deleteFile = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: fileKey,
    });

    await s3Client.send(command);
    return fileKey;
  } catch (error) {
    throw error;
  }
};

export default s3Client;
