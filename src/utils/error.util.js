import env from "#configs/env";
import {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  ConnectionError,
  ForeignKeyConstraintError,
} from "sequelize";
import { session } from "#middlewares/requestSession";

export const globalErrorHandler = async (error, req, res, next) => {
  const transaction = await session.get("transaction");
  if (transaction) await transaction.rollback();

  console.log(error);

  // Validation error
  if (error instanceof ValidationError) {
    const messages = error.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join(", ");
    return res.status(400).json({
      status: false,
      message: `Validation Error: ${messages}`,
    });
  }

  // Foreign key error (e.g., referencing an ID that doesn't exist)
  if (error instanceof ForeignKeyConstraintError) {
    const field = Array.isArray(error.fields)
      ? error.fields[0]
      : Object.keys(error.fields || {})[0] || "related ID";
    return res.status(400).json({
      status: false,
      message: `The provided ${field} does not exist.`,
    });
  }

  // Unique constraint error
  if (error instanceof UniqueConstraintError) {
    const field = error.errors?.[0]?.path || "Field";
    return res.status(409).json({
      status: false,
      message: `${field} already exists.`,
    });
  }

  // Database error
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      status: false,
      message: `Database Error: ${error.message}`,
    });
  }

  // Connection error
  if (error instanceof ConnectionError) {
    return res.status(503).json({
      status: false,
      message: `Database Connection Error: ${error.message}`,
    });
  }

  // Custom HTTP error
  if (error.httpStatus && error.message) {
    return res.status(error.httpStatus).json({
      status: false,
      message: error.message,
    });
  }

  // Plain string error
  if (typeof error === "string") {
    return res.status(500).json({
      status: false,
      message: error,
    });
  }

  // Unknown fallback error
  return res.status(500).json({
    status: false,
    message:
      env.NODE_ENV === "development"
        ? `Internal Server Error: ${error.message}`
        : "Internal Server Error",
  });
};
