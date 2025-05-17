import cors from "cors";
import multer from "multer";
import morgan from "morgan";
import express from "express";
import router from "#routes/index";
import logger from "#configs/logger";
import httpStatus from "http-status";
import sequelize from "#configs/database";
import { globalErrorHandler } from "#utils/error";
import requestSessionMiddleware from "#middlewares/requestSession";

const server = express();

// Ensure the database connection is established before starting the server
await sequelize.authenticate();
await sequelize.sync();

// Request logging middleware
server.use(morgan(logger));

// Middleware to parse incoming JSON request bodies
server.use(multer().any());
server.use(express.json()); // Express's built-in JSON parser

// Middleware to parse URL-encoded data (like form submissions)
server.use(express.urlencoded({ extended: true })); // This will handle x-www-form-urlencoded

// Session middleware should come before routes
server.use(requestSessionMiddleware());

// Main routes
server.use("/api", router);

// 404 Handler (Path Not Found) – for undefined routes
server.use((_req, res) => {
  res
    .status(httpStatus.NOT_FOUND)
    .json({ status: false, message: "Path not found" });
});

// Global Error Handler – Catch all errors
server.use(globalErrorHandler);

export default server;
