import BaseService from "#services/base";
import UserSession from "#models/userSession";
import { session } from "#middlewares/requestSession";

class UserSessionService extends BaseService {
  static PING_INTERVAL = 15; // seconds
  static SESSION_TIMEOUT = 20; // seconds (grace period)

  static async managePing(userId) {
    const transaction = session.get("transaction");
    const now = new Date();

    // Get the latest active session for user
    const activeSession = await UserSession.findOne({
      where: { userId, endedAt: null },
      order: [["createdAt", "DESC"]],
      transaction,
    });

    let result;

    if (activeSession) {
      // Attach the transaction to the instance for later use
      activeSession.set("transaction", transaction);

      const lastPing = activeSession.lastPingAt || activeSession.createdAt;
      const secondsSinceLastPing = (now - new Date(lastPing)) / 1000;

      console.log(
        `User ${userId}: Last ping was ${secondsSinceLastPing.toFixed(
          2,
        )} seconds ago`,
      );

      if (secondsSinceLastPing > this.SESSION_TIMEOUT) {
        console.log(`Ending stale session ${activeSession.id}`);
        await this.endSession(activeSession.id);

        result = await this.startNewSession(userId, transaction);
      } else {
        result = await this.updateSessionPing(activeSession.id);
      }
    } else {
      result = await this.startNewSession(userId, transaction);
    }

    return result;
  }

  static async startNewSession(userId, transaction) {
    const sessionStart = new Date();

    const newSession = await UserSession.create(
      {
        userId,
        duration: 0,
        startedAt: sessionStart,
        lastPingAt: sessionStart,
        endedAt: null,
      },
      { transaction },
    );

    // Store transaction inside instance for later updates
    newSession.set("transaction", transaction);

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
    if (!session) throw new Error("Session not found");

    const transaction = session.get("transaction");

    const now = new Date();
    const duration = Math.floor((now - new Date(session.startedAt)) / 1000);

    await session.update({ lastPingAt: now, duration }, { transaction });

    console.log(`Updated session ${sessionId}, duration: ${duration}s`);

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
    if (!session) return null;

    const transaction = session.get("transaction");
    const now = new Date();

    const lastActivity = session.lastPingAt || session.startedAt;
    const finalDuration = Math.floor(
      (new Date(lastActivity) - new Date(session.startedAt)) / 1000,
    );

    await session.update(
      { endedAt: now, duration: finalDuration },
      { transaction },
    );

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
