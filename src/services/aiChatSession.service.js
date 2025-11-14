import BaseService from "#services/base";
import AiChatSession from "#models/aiChatSession";
import { session } from "#middlewares/requestSession";
import httpStatus from "http-status";
import AppError from "#utils/appError";

class AiChatSessionService extends BaseService {
  static Model = AiChatSession;

  static async getUserSessionById(id, { userId = session.get("userId") } = {}) {
    const doc = await this.Model.findDocById(id);

    if (doc.userId !== userId) {
      throw new AppError({
        status: false,
        message: "You do not have access to this AI chat session",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    return doc;
  }

  static async touchSession(id) {
    await this.Model.update(
      { lastInteractionAt: new Date() },
      { where: { id } },
    );
  }
}

export default AiChatSessionService;
