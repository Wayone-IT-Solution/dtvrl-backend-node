// services/messageService.ts
import Message from "#models/message";
import User from "#models/user";
import BaseService from "#services/base";
import { Op, Sequelize } from "sequelize";
import sequelize from "#configs/database";

class MessageService extends BaseService {
  static Model = Message;

  static async getChatList(myId, queryParams = {}) {
    const { search = "", page = 1, limit = 10 } = queryParams;

    const offset = (page - 1) * limit;
    const sanitizedSearch = search.trim().toLowerCase();

    const messageQuery = `
    WITH all_messages AS (
      SELECT
        m.*,
        CASE
          WHEN m."senderId" = :myId THEN m."receiverId"
          ELSE m."senderId"
        END AS "chatUserId"
      FROM "Messages" m
      WHERE 
        (m."senderId" = :myId OR m."receiverId" = :myId)
        AND m."senderId" != m."receiverId"
    ),
    latest_messages AS (
      SELECT DISTINCT ON ("chatUserId")
        am."id",
        am."message",
        am."senderId",
        am."receiverId",
        am."readByUser",
        am."createdAt",
        am."chatUserId"
      FROM all_messages am
      ORDER BY am."chatUserId", am."createdAt" DESC
    ),
    unread_counts AS (
      SELECT
        am."chatUserId",
        COUNT(*) AS "unreadCount"
      FROM all_messages am
      WHERE
        am."receiverId" = :myId
        AND NOT am."readByUser"
      GROUP BY am."chatUserId"
    )
    SELECT
      lm.*,
      u."id" AS "chatUserId",
      u."name" AS "chatUserName",
      u."profile" AS "userProfile",
      COALESCE(uc."unreadCount", 0) AS "unreadCount"
    FROM latest_messages lm
    JOIN "Users" u ON u."id" = lm."chatUserId"
    LEFT JOIN unread_counts uc ON uc."chatUserId" = lm."chatUserId"
    WHERE (:search IS NULL OR LOWER(u."name") LIKE :searchPattern)
    ORDER BY lm."createdAt" DESC
    LIMIT :limit OFFSET :offset;
  `;

    const countQuery = `
    WITH all_messages AS (
      SELECT
        m.*,
        CASE
          WHEN m."senderId" = :myId THEN m."receiverId"
          ELSE m."senderId"
        END AS "chatUserId"
      FROM "Messages" m
      WHERE 
        (m."senderId" = :myId OR m."receiverId" = :myId)
        AND m."senderId" != m."receiverId"
    ),
    distinct_users AS (
      SELECT DISTINCT
        am."chatUserId"
      FROM all_messages am
      JOIN "Users" u ON u."id" = am."chatUserId"
      WHERE (:search IS NULL OR LOWER(u."name") LIKE :searchPattern)
    )
    SELECT COUNT(*) FROM distinct_users;
  `;

    const replacements = {
      myId,
      limit,
      offset,
      search: sanitizedSearch || null,
      searchPattern: `%${sanitizedSearch}%`,
    };

    const [messages, countResult] = await Promise.all([
      sequelize.query(messageQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    const totalItems = parseInt(countResult[0].count, 10) || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const result = messages.map((msg) => ({
      chatUser: {
        id: msg.chatUserId,
        name: msg.chatUserName,
        profile: msg.userProfile,
      },
      latestMessage: {
        id: msg.id,
        message: msg.message,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        sentByMe: msg.senderId === myId,
        readByUser: msg.readByUser,
        createdAt: msg.createdAt,
        unreadCount: parseInt(msg.unreadCount || 0, 10),
      },
    }));

    return {
      result,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  static async getMessagesBetweenUsers(myId, otherUserId, queryParams = {}) {
    if (myId === otherUserId) return null;

    const { page = 1, limit = 20 } = queryParams;
    const offset = (page - 1) * limit;

    const { count, rows } = await Message.findAndCountAll({
      where: {
        [Op.or]: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
      },
      include: [
        {
          model: User,
          as: "Sender", // ✅ Must match model alias
          attributes: ["id", "name", "username", "gender", "profile"],
        },
        {
          model: User,
          as: "Receiver", // ✅ Must match model alias
          attributes: ["id", "name", "username", "gender", "profile"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Optional: Rename keys in response for frontend simplicity
    const messages = rows.map((msg) => ({
      ...msg.toJSON(),
      // sender: msg.Sender,
      // receiver: msg.Receiver,
    }));

    return {
      success: true,
      data: {
        result: messages,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      },
    };
  }
}

export default MessageService;
