import { session } from "#middlewares/requestSession";

export const sendResponse = async (statusCode, res, data, message) => {
  const success = statusCode >= 400 ? false : true;
  const transaction = session.get("transaction");
  transaction ? await transaction.commit() : null;

  res
    .status(statusCode)
    .json({ success, ...(message ? { message } : null), data });
};
