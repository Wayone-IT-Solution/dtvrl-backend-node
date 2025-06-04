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
 */
export const globalErrorHandler = async (error, req, res, next) => {
  const transaction = await session.get("transaction");
  if (transaction) await transaction.rollback();

  console.log(error);

  // Handle validation errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      status: false,
      message: "Validation Error",
      errors: error.errors.map((err) => ({
        field: err.path,
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
        field: error.fields?.[0] || error.index || "unknown",
        detail: error.original?.detail || "Invalid foreign key reference",
      },
    });
  }

  // Handle unique constraint errors
  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({
      status: false,
      message: `${error.errors[0]?.path || "Field"} already exists`,
      errors: error.errors.map((err) => ({
        field: err.path,
        message: err.message,
      })),
    });
  }

  // Handle other Sequelize database errors
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

  // Handle known HTTP errors
  if (error.httpStatus && error.message) {
    return res.status(error.httpStatus).json({
      status: false,
      message: error.message,
    });
  }

  // For string errors passed via `next("some error")`
  if (typeof error === "string") return next(error);

  // Default fallback
  return res.status(500).json({
    status: false,
    message: "Internal Server Error",
    details: env.NODE_ENV === "development" ? error.message : undefined,
  });
};
