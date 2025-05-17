import env from "#configs/env";
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  ConnectionError,
  ForeignKeyConstraintError,
} from "sequelize";
import { session } from "#middlewares/requestSession";

/**
 * Global error handler function that logs errors and handles different types of Sequelize errors.
 *
 * @param {Error} error - The error object to be handled
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @return {Object} - The response object with appropriate error handling
 */
export const globalErrorHandler = async (error, req, res, next) => {
  const transaction = await session.get("transaction");
  transaction ? await transaction.rollback() : null;

  // Handle validation errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      status: false,
      message: "Validation Error",
      errors: error.errors.map((err) => ({
        field: err.path, // Field name
        message: err.message,
      })),
    });
  }

  // Handle foreign key errors
  if (error instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      status: false,
      message: "Foreign Key Constraint Error",
      errors: {
        field: error.fields[0], // Field name causing the error
        message: `${error.fields[0]} is invalid or doesn't exist`,
      },
    });
  }

  // Handle unique constraint errors
  if (error instanceof UniqueConstraintError) {
    const field = error.errors[0]?.path; // Extract field name from the error

    return res.status(409).json({
      status: false,
      message: `${field} already exists`, // Dynamic message with field
      errors: error.errors.map((err) => ({
        field: err.path, // Field name
        message: err.message,
      })),
    });
  }

  // Handle other Sequelize errors (e.g., DatabaseError)
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      status: false,
      message: "Database error occurred",
      details: error.message,
    });
  }

  // Handle connection errors
  if (error instanceof ConnectionError) {
    return res.status(503).json({
      status: false,
      message: "Database connection error",
      details: error.message,
    });
  }

  // Handle other known errors (e.g., custom HTTP errors)
  if (error.httpStatus && error.message) {
    return res
      .status(error.httpStatus)
      .json({ status: false, message: error.message });
  }

  // For unknown errors, send a generic message
  if (typeof error === "string") next(error);

  // Handle generic errors
  return res.status(500).json({
    status: false,
    message: "Internal Server Error",
    details: env.NODE_ENV === "development" ? error.message : undefined, // Expose details only in development
  });
};
