import UserSession from "#models/userSession";
import BaseService from "#services/base";

class UserSessionService extends BaseService {
  static PING_INTERVAL = 15; // seconds
  static SESSION_TIMEOUT = 20; // seconds (grace period)

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
      // Use lastPingAt instead of updatedAt for timeout calculation
      const lastPing = activeSession.lastPingAt || activeSession.createdAt;
      const secondsSinceLastPing = (now - new Date(lastPing)) / 1000;

      console.log(
        `User ${userId}: Last ping was ${secondsSinceLastPing.toFixed(2)} seconds ago`,
      );

      if (secondsSinceLastPing > this.SESSION_TIMEOUT) {
        // End the previous session
        console.log(`Ending stale session ${activeSession.id}`);
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

    console.log(`Started new session ${newSession.id} for user ${userId}`);

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
    if (!session) {
      throw new Error("Session not found");
    }

    const now = new Date();

    // Calculate duration since session start
    const duration = Math.floor((now - new Date(session.startedAt)) / 1000);

    await session.update({
      lastPingAt: now,
      duration: duration,
      // Don't update updatedAt here to avoid confusion
    });

    console.log(`Updated session ${sessionId}, duration: ${duration}s`);

    return {
      message: "Session updated",
      sessionId: session.id,
      action: "session_updated",
      duration: duration,
      lastPingAt: now,
    };
  }

  static async endSession(sessionId) {
    const session = await UserSession.findByPk(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();

    // Calculate final duration using lastPingAt or startedAt
    const lastActivity = session.lastPingAt || session.startedAt;
    const finalDuration = Math.floor(
      (new Date(lastActivity) - new Date(session.startedAt)) / 1000,
    );

    await session.update({
      endedAt: now,
      duration: finalDuration,
    });

    console.log(
      `Ended session ${sessionId}, final duration: ${finalDuration}s`,
    );

    return {
      message: "Session ended",
      sessionId: session.id,
      action: "session_ended",
      duration: finalDuration,
      endedAt: now,
    };
  }
}

export default UserSessionService;
