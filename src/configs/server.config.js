import cors from "cors";
import path from "path";
import multer from "multer";
import morgan from "morgan";
import express from "express";
import passport from "passport";
import router from "#routes/index";
import { fileURLToPath } from "url";
import { createServer } from "http";
import logger from "#configs/logger";
import httpStatus from "http-status";
import s3Client from "#configs/awsS3";
import sequelize from "#configs/database";
import { globalErrorHandler } from "#utils/error";
import requestSessionMiddleware from "#middlewares/requestSession";

const app = express();
// Ensure the database connection is established before starting the app

await sequelize.authenticate();
// await sequelize.sync({ alter: true });

export const server = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the root-level public/ directory
const publicPath = path.join(__dirname, "../..", "public");

app.use(express.static(publicPath)); // Request logging middleware

app.use(morgan(logger));
app.use(cors());

// Middleware to parse incoming JSON request bodies
app.use(multer().any());
app.use(express.json()); // Express's built-in JSON parser

// Middleware to parse URL-encoded data (like form submissions)
app.use(express.urlencoded({ extended: true })); // This will handle x-www-form-urlencoded

// Session middleware should come before routes
app.use(requestSessionMiddleware());

// Main routes
app.use("/api", router);

// 404 Handler (Path Not Found) – for undefined routes
app.use((_req, res) => {
  res
    .status(httpStatus.NOT_FOUND)
    .json({ status: false, message: "Path not found" });
});

// Global Error Handler – Catch all errors
app.use(globalErrorHandler);

export default app;
