import { session } from "#middlewares/requestSession";

export const sendResponse = async (statusCode, res, data, message) => {
  const success = statusCode < 400;
  
  const transaction = await session.get("transaction");

  if (transaction) {
    try {
      if (success) {
        await transaction.commit();
      } else {
        await transaction.rollback();
      }
    } catch (err) {
      console.error("Transaction commit/rollback error in sendResponse:", err);

      // If commit/rollback itself fails, send a generic 500 if nothing sent yet
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Internal Server Error",
        });
      }
      return;
    }
  }

  if (!res.headersSent) {
    return res.status(statusCode).json({
      success,
      ...(message ? { message } : {}),
      data,
    });
  }
};

// old code 
// export const sendResponse = async (statusCode, res, data, message) => {
//   const success = statusCode >= 400 ? false : true;
//   const transaction = session.get("transaction");
//   transaction ? await transaction.commit() : null;

//   res
//     .status(statusCode)
//     .json({ success, ...(message ? { message } : null), data });
// };
