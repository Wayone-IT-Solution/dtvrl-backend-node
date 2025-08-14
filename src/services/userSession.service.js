import UserSession from "#models/userSession";
import BaseService from "#services/base";

class UserSessionService extends BaseService {
  static PING_INTERVAL = 15; // seconds
  static SESSION_TIMEOUT = 20; // seconds (grace period)

  // Main ping management method
  static async managePing(userId) {
    const now = new Date();

    // Get the latest active session for user
    const activeSession = await UserSession.findOne({
      where: {
        userId,
        endedAt: null, // Active session
      },
      order: [["createdAt", "DESC"]],
    });

    if (activeSession) {
      const lastPing = activeSession.updatedAt;
      const secondsSinceLastPing = (now - lastPing) / 1000;

      if (secondsSinceLastPing > this.SESSION_TIMEOUT) {
        // End the previous session
        await this.endSession(activeSession.id);

        // Start new session
        return await this.startNewSession(userId);
      } else {
        // Update existing session
        return await this.updateSessionPing(activeSession.id);
      }
    } else {
      // No active session, start new one
      return await this.startNewSession(userId);
    }
  }

  static async startNewSession(userId) {
    const sessionStart = new Date();

    const newSession = await UserSession.create({
      userId,
      duration: 0,
      startedAt: sessionStart,
      lastPingAt: sessionStart,
      endedAt: null,
    });

    return {
      message: "New session started",
      sessionId: newSession.id,
      action: "session_started",
      duration: 0,
      startedAt: sessionStart,
    };
  }

  static async updateSessionPing(sessionId) {
    const session = await UserSession.findByPk(sessionId);
    const now = new Date();

    // Calculate duration since session start
    const duration = Math.floor((now - session.startedAt) / 1000);

    await session.update({
      lastPingAt: now,
      duration,
      updatedAt: now,
    });

    return {
      message: "Session updated",
      sessionId: session.id,
      action: "session_updated",
      duration,
      lastPingAt: now,
    };
  }

  static async endSession(sessionId) {
    const session = await UserSession.findByPk(sessionId);
    const now = new Date();

    // Calculate final duration
    const finalDuration = Math.floor((now - session.startedAt) / 1000);

    await session.update({
      endedAt: now,
      duration: finalDuration,
    });

    return {
      message: "Session ended",
      sessionId: session.id,
      action: "session_ended",
      duration: finalDuration,
      endedAt: now,
    };
  }

  // Additional utility methods following your pattern
  static async get(id, query = {}) {
    if (id) {
      return await this.getUserSessionById(id);
    }

    const { page = 1, limit = 10, userId, status } = query;
    const options = {
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      where: {},
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    };

    if (userId) options.where.userId = userId;
    if (status === "active") options.where.endedAt = null;
    if (status === "ended") options.where.endedAt = { [Op.not]: null };

    return await UserSession.findAndCountAll(options);
  }

  static async getUserSessionById(id) {
    const session = await UserSession.findByPk(id);
    if (!session) {
      throw new Error("User session not found");
    }
    return session;
  }

  static async getActiveSessionsByUser(userId) {
    return await UserSession.findAll({
      where: {
        userId,
        endedAt: null,
      },
      order: [["createdAt", "DESC"]],
    });
  }

  static async getSessionsByUser(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;
    const options = {
      where: { userId },
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    };

    if (status === "active") options.where.endedAt = null;
    if (status === "ended") options.where.endedAt = { [Op.not]: null };

    return await UserSession.findAndCountAll(options);
  }

  // End all active sessions for a user (useful for logout)
  static async endAllUserSessions(userId) {
    const now = new Date();
    const activeSessions = await UserSession.findAll({
      where: {
        userId,
        endedAt: null,
      },
    });

    for (const session of activeSessions) {
      const finalDuration = Math.floor((now - session.startedAt) / 1000);
      await session.update({
        endedAt: now,
        duration: finalDuration,
      });
    }

    return {
      message: `${activeSessions.length} active sessions ended`,
      endedSessions: activeSessions.length,
    };
  }
}

export default UserSessionService;
