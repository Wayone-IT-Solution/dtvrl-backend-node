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
  // Sequelize Validation Error
  if (error instanceof ValidationError) {
    const messages = error.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join(", ");
    return res.status(400).json({
      status: false,
      message: `Validation Error: ${messages}`,
    });
  }

  // Sequelize Foreign Key Constraint Error
  if (error instanceof ForeignKeyConstraintError) {
    try {
      let field = null;
      let value = null;

      // Extract field and value from `error.fields`
      if (error.fields && typeof error.fields === "object") {
        field = Object.keys(error.fields)[0];
        value = error.fields[field];
      }

      // Fallback: Try to extract field from error.index or error.constraint
      if (!field && typeof error.index === "string") {
        const match = error.index.match(/_(\w+)_fkey/);
        if (match) field = match[1];
      }

      if (!field && typeof error.constraint === "string") {
        const match = error.constraint.match(/(\w+)_fkey/);
        if (match) field = match[1];
      }

      if (!field) throw new Error("Could not determine foreign key field.");

      // Convert field name (e.g., userId → User)
      let entityName = field.endsWith("Id") ? field.slice(0, -2) : field;
      entityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

      return res.status(400).json({
        status: false,
        message: `${entityName} not found${value ? ` (ID: ${value})` : ""}.`,
        field,
      });
    } catch (e) {
      return res.status(400).json({
        status: false,
        message: "Referenced entity does not exist.",
      });
    }
  }

  // Sequelize Unique Constraint Error
  if (error instanceof UniqueConstraintError) {
    const field = error.errors?.[0]?.path || "Field";
    return res.status(409).json({
      status: false,
      message: `${field} already exists.`,
      field,
    });
  }

  // Sequelize General Database Error
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      status: false,
      message: `Database Error: ${error.message}`,
    });
  }

  // Sequelize Connection Error
  if (error instanceof ConnectionError) {
    return res.status(503).json({
      status: false,
      message: `Database Connection Error: ${error.message}`,
    });
  }

  // Custom HTTP error with status
  if (error.httpStatus && error.message) {
    return res.status(error.httpStatus).json({
      status: false,
      message: error.message,
      ...(error.data ? { data: error.data } : {}),
    });
  }

  // Plain string error
  if (typeof error === "string") {
    return res.status(500).json({
      status: false,
      message: error,
    });
  }

  // Fallback unknown error
  return res.status(500).json({
    status: false,
    message:
      env.NODE_ENV === "development"
        ? `Internal Server Error: ${error.message}`
        : "Internal Server Error",
  });
};
