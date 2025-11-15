import httpStatus from "http-status";
import { session as requestSession } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";
import AiChatSessionService from "#services/aiChatSession";
import AiChatMessageService from "#services/aiChatMessage";
import openaiClient from "#configs/openai";
import ItineraryService from "#services/itinerary";
import AiChatSession from "#models/aiChatSession";
import User from "#models/user";
import env from "#configs/env";
import sequelize from "#configs/database";
import { Op, QueryTypes } from "sequelize";

const SYSTEM_PROMPT = `
You are DTVRL's AI travel concierge embedded inside a trip planning app.
Always return a concise but concrete day-by-day itinerary (Morning / Afternoon / Evening) with transport, lodging, food and cost tips.
If details like budget, companions, or travel style are missing, make reasonable assumptions and clearly list the assumptions instead of asking open questions.
Focus only on travel-related topics and keep responses friendly, practical, and ready to copy into an itinerary.
`;

const MAX_CONTEXT_USER_MESSAGES = 10;
const MAX_FETCHED_MESSAGES = Number(env.AI_CHAT_MAX_FETCHED_MESSAGES || 40);
const MAX_STORED_MESSAGES = Number(env.AI_CHAT_MAX_STORED_MESSAGES || 40);

const serializeMessages = (messages) =>
  messages.map((message) =>
    typeof message?.toJSON === "function" ? message.toJSON() : message,
  );

const parseOptionalDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toSafeNumber = (value, defaultValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const toSafeInteger = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const extractTripDetails = (text = "") => {
  if (!text?.trim()) return null;
  const lower = text.toLowerCase();
  const details = [];

  const daysMatch = lower.match(/(\d+)\s*-?\s*(day|days)/);
  if (daysMatch) {
    details.push(`Duration: ${daysMatch[1]} days`);
  }

  const peopleMatch = lower.match(/(\d+)\s*(people|friends|persons|travelers|members)/);
  if (peopleMatch) {
    details.push(`Group size: ${peopleMatch[1]}`);
  }

  const destinationMatch = lower.match(
    /(go|visit|trip|travel|tour|in)\s+(?:to\s+)?([a-z\s]+?)(?:[,.!?]|$)/,
  );
  if (destinationMatch) {
    const raw = destinationMatch[2]
      .split(/(?:and|&|,)/)
      .map((city) => city.trim())
      .filter(Boolean)
      .join(", ");
    if (raw) {
      details.push(`Primary destination: ${raw}`);
    }
  } else {
    const singleWord = lower.match(/(?:to|in|at)\s+([a-z]+)$/);
    if (singleWord) {
      details.push(`Primary destination: ${singleWord[1].trim()}`);
    }
  }

  return details.length ? details.join("; ") : null;
};

async function getConversationSlice(sessionId) {
  const records = await AiChatMessageService.Model.findAll({
    where: { sessionId },
    order: [["createdAt", "DESC"]],
    limit: MAX_FETCHED_MESSAGES,
  });

  const trimmed = [];
  let userCount = 0;

  for (const record of records) {
    if (record.role === "user") {
      if (userCount >= MAX_CONTEXT_USER_MESSAGES) {
        break;
      }
      userCount += 1;
    }
    trimmed.push(record);
  }

  return trimmed.reverse();
}

class AiChatController {
  static parsePagination(query) {
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 50;

    if (page < 1) page = 1;
    if (limit < 1) limit = 50;
    if (limit > 100) limit = 100;

    return { page, limit };
  }

  static buildMessagesDateFilter(query) {
    const { startDate, endDate } = query;
    const filter = {};

    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.gte] = parsed;
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!Number.isNaN(parsed.getTime())) {
        filter[Op.lte] = parsed;
      }
    }

    return Object.keys(filter).length ? filter : null;
  }

  static buildMessagesWhere(query) {
    const where = {};

    const role = String(query.role || "").trim();
    if (role && ["system", "user", "assistant"].includes(role)) {
      where.role = role;
    }

    const dateFilter = this.buildMessagesDateFilter(query);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const search = String(query.search || "").trim();
    if (search) {
      where.content = { [Op.iLike]: `%${search}%` };
    }

    return where;
  }

  static buildMessagesSort(query) {
    const requested = String(query.sortBy || "").trim();
    const sortBy = requested === "createdAt" ? "createdAt" : "createdAt";
    const sortOrder =
      String(query.sortOrder || "").toUpperCase() === "DESC"
        ? "DESC"
        : "ASC";
    return [[sortBy, sortOrder]];
  }

  static async pruneMessagesForUser(userId) {
    if (!MAX_STORED_MESSAGES || MAX_STORED_MESSAGES <= 0) {
      return;
    }

    const rows = await sequelize.query(
      `
        SELECT m.id
        FROM "AiChatMessages" AS m
        INNER JOIN "AiChatSessions" AS s ON s."id" = m."sessionId"
        WHERE s."userId" = :userId
        ORDER BY m."createdAt" DESC, m."id" DESC
        OFFSET :limit
      `,
      {
        replacements: { userId, limit: MAX_STORED_MESSAGES },
        type: QueryTypes.SELECT,
      },
    );

    if (!rows.length) {
      return;
    }

    await AiChatMessageService.Model.destroy({
      where: { id: rows.map((row) => row.id) },
    });
  }

  static async listSessions(req, res) {
    const sessionUserId = requestSession.get("userId");
    const payload = requestSession.get("payload");
    const isAdmin = Boolean(payload?.isAdmin);

    if (!isAdmin) {
      if (!sessionUserId) {
        throw new AppError({
          status: false,
          message: "Unauthorized",
          httpStatus: httpStatus.UNAUTHORIZED,
        });
      }
      req.query.userId = sessionUserId;
    }

    const requestedUserId = Number(req.query.userId);

    const customOptions = {
      where: {},
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "email", "profile"],
        },
      ],
      order: [
        ["lastInteractionAt", "DESC"],
        ["id", "DESC"],
      ],
    };

    if (!isAdmin || (!Number.isNaN(requestedUserId) && requestedUserId > 0)) {
      customOptions.where.userId =
        !Number.isNaN(requestedUserId) && requestedUserId > 0
          ? requestedUserId
          : sessionUserId;
      req.query.userId = customOptions.where.userId;
    }

    const options = AiChatSessionService.getOptions(req.query, customOptions);
    const data = await AiChatSessionService.get(null, req.query, options);
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "AI chat sessions fetched successfully",
    );
  }

  static async getAllUserMessages(req, res) {
    const { userId } = req.params;
    const parsedUserId = Number(userId);

    const sessionUserId = requestSession.get("userId");
    const payload = requestSession.get("payload");
    const isAdmin = Boolean(payload?.isAdmin);

    if (!parsedUserId && !sessionUserId) {
      throw new AppError({
        status: false,
        message: "User id is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const resolvedUserId = parsedUserId || sessionUserId;

    if (!isAdmin && Number(sessionUserId) !== Number(resolvedUserId)) {
      throw new AppError({
        status: false,
        message: "You are not allowed to view these messages",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    const { page, limit } = AiChatController.parsePagination(req.query);
    const queryOptions = {
      where: {},
      include: [
        {
          model: AiChatSession,
          attributes: ["id", "title", "userId", "createdAt", "lastInteractionAt"],
          where: { userId: resolvedUserId },
          include: [
            {
              model: User,
              attributes: ["id", "name", "username", "email", "profile"],
            },
          ],
        },
      ],
      order: [["createdAt", "ASC"]],
    };

    const { count, rows } = await AiChatMessageService.Model.findAndCountAll({
      ...queryOptions,
      distinct: true,
    });

    const result = rows.map((message) => {
      const json = message.toJSON();
      if (json.AiChatSession) {
        json.session = json.AiChatSession;
        delete json.AiChatSession;
      }
      return json;
    });

    const sortedMessages = result.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    const conversations = sortedMessages.reduce((acc, message) => {
      const sessionId = message.session?.id ?? message.sessionId;
      if (!acc.has(sessionId)) {
        acc.set(sessionId, {
          session: message.session,
          conversations: [],
        });
      }

      const entry = acc.get(sessionId);
      const latest = entry.conversations[entry.conversations.length - 1];

      if (message.role === "user") {
        entry.conversations.push({
          questionId: message.id,
          question: message.content,
          questionCreatedAt: message.createdAt,
          questionMetadata: message.metadata,
          answerId: null,
          answer: null,
          answerCreatedAt: null,
          answerMetadata: null,
        });
      } else {
        if (!latest || latest.answer) {
          entry.conversations.push({
            questionId: null,
            question: null,
            questionCreatedAt: null,
            questionMetadata: null,
            answerId: message.id,
            answer: message.content,
            answerCreatedAt: message.createdAt,
            answerMetadata: message.metadata,
          });
        } else {
          latest.answerId = message.id;
          latest.answer = message.content;
          latest.answerCreatedAt = message.createdAt;
          latest.answerMetadata = message.metadata;
        }
      }

      return acc;
    }, new Map());

    const structuredResult = Array.from(conversations.values());
    const flattened = structuredResult.flatMap(({ session, conversations: convo }) =>
      convo.map((entry) => ({
        session,
        ...entry,
      })),
    );

    flattened.sort((a, b) => {
      const aDate = new Date(a.questionCreatedAt || a.answerCreatedAt || 0);
      const bDate = new Date(b.questionCreatedAt || b.answerCreatedAt || 0);
      return aDate - bDate;
    });

    const paginationProvided = req.query.limit !== undefined;
    const limitNum = paginationProvided ? Number(limit) || 20 : flattened.length || 1;
    const pageNum = paginationProvided ? Number(page) || 1 : 1;
    const offset = (pageNum - 1) * limitNum;
    const paginatedResult = paginationProvided
      ? flattened.slice(offset, offset + limitNum)
      : flattened;

    sendResponse(
      httpStatus.OK,
      res,
      {
        result: paginatedResult,
        pagination: {
          totalItems: flattened.length,
          totalPages: limitNum
            ? Math.max(1, Math.ceil(flattened.length / limitNum))
            : flattened.length > 0
              ? 1
              : 0,
          currentPage: pageNum,
          itemsPerPage: limitNum,
        },
      },
      "AI chat messages fetched successfully",
    );
  }

  static async createSession(req, res) {
    const userId = requestSession.get("userId");
    const title = req.body?.title?.trim() || null;

    const sessionDoc = await AiChatSessionService.create({
      userId,
      title,
    });

    sendResponse(
      httpStatus.CREATED,
      res,
      sessionDoc,
      "AI chat session created successfully",
    );
  }

  static async updateSession(req, res) {
    const { sessionId } = req.params;
    const title = req.body?.title?.trim();
    if (!title) {
      throw new AppError({
        status: false,
        message: "Title is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const sessionDoc =
      await AiChatSessionService.getUserSessionById(sessionId);
    sessionDoc.updateFields({ title });
    await sessionDoc.save();

    sendResponse(
      httpStatus.OK,
      res,
      sessionDoc,
      "AI chat session updated successfully",
    );
  }

  static async getMessages(req, res) {
    const { sessionId } = req.params;
    const payload = requestSession.get("payload");
    const isAdmin = Boolean(payload?.isAdmin);
    const sessionUserId = requestSession.get("userId");

    const sessionDoc = await AiChatSessionService.getUserSessionById(
      sessionId,
      {
        userId: sessionUserId,
        allowAdmin: isAdmin,
      },
    );

    const paginationProvided = req.query.limit !== undefined;
    const { page, limit } = paginationProvided
      ? AiChatController.parsePagination(req.query)
      : { page: 1, limit: null };
    const where = AiChatController.buildMessagesWhere(req.query);
    where.sessionId = sessionDoc.id;
    const order = AiChatController.buildMessagesSort(req.query);

    const sessionWithUser = await AiChatSession.findByPk(sessionDoc.id, {
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "email", "profile"],
        },
      ],
    });

    let data;
    if (paginationProvided) {
      data = await AiChatMessageService.findWithPagination({
        where,
        page,
        limit,
        order,
      });
    } else {
      const rows = await AiChatMessageService.Model.findAll({
        where,
        order,
      });
      data = {
        result: rows,
        pagination: {
          totalItems: rows.length,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: rows.length,
        },
      };
    }

    const serialized = serializeMessages(data.result);

    sendResponse(
      httpStatus.OK,
      res,
      {
        session: sessionWithUser ?? sessionDoc,
        result: serialized,
        messages: serialized,
        pagination: data.pagination,
      },
      "AI chat messages fetched successfully",
    );
  }

  static async sendMessage(req, res) {
    const { sessionId } = req.params;
    const userMessage = req.body?.message?.trim();

    if (!userMessage) {
      throw new AppError({
        status: false,
        message: "Message is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const sessionDoc =
      await AiChatSessionService.getUserSessionById(sessionId);

    const userDoc = await AiChatMessageService.create({
      sessionId: sessionDoc.id,
      role: "user",
      content: userMessage,
    });
    await AiChatSessionService.touchSession(sessionDoc.id);
    await AiChatController.pruneMessagesForUser(sessionDoc.userId);

    const orderedHistory = (
      await getConversationSlice(sessionDoc.id)
    ).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    let completion;
    try {
      const extractedDetails = extractTripDetails(userDoc.content);
      const contextualMessages = extractedDetails
        ? [
            {
              role: "system",
              content: `User provided explicit trip details: ${extractedDetails}. Reflect these facts in your plan without changing them unless the user later updates them.`,
            },
          ]
        : [];

      completion = await openaiClient.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...contextualMessages,
          ...orderedHistory,
        ],
      });
    } catch (error) {
      console.error("OpenAI API Error:", error.message);
      throw new AppError({
        status: false,
        message: "An error occurred while contacting the AI",
        data: {
          reason: error.message,
        },
        httpStatus: httpStatus.BAD_GATEWAY,
      });
    }

    const choice = completion?.choices?.[0]?.message;

    if (!choice) {
      throw new AppError({
        status: false,
        message: "Failed to retrieve response from OpenAI",
        httpStatus: httpStatus.BAD_GATEWAY,
      });
    }

    const assistantMessage = choice.content?.trim() || "";

    const assistantDoc = await AiChatMessageService.create({
      sessionId: sessionDoc.id,
      role: "assistant",
      content: assistantMessage,
      metadata: null,
    });

    await AiChatSessionService.touchSession(sessionDoc.id);
    await AiChatController.pruneMessagesForUser(sessionDoc.userId);

    let responseMessages = serializeMessages(
      await getConversationSlice(sessionDoc.id),
    );

    const ensureMessageInHistory = (doc) => {
      if (!doc) return;
      const alreadyPresent = responseMessages.some(
        (message) => message.id === doc.id,
      );
      if (!alreadyPresent) {
        responseMessages.push(doc.toJSON());
      }
    };

    // Ensure the freshly created user/assistant turns are always reflected.
    ensureMessageInHistory(userDoc);
    ensureMessageInHistory(assistantDoc);

    responseMessages = responseMessages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    sendResponse(
      httpStatus.OK,
      res,
      {
        sessionId: sessionDoc.id,
        assistantMessage: assistantDoc.content,
        messages: serializeMessages(responseMessages),
      },
      "AI response generated successfully",
    );
  }

  static async saveMessageToItinerary(req, res) {
    const { messageId } = req.params;
    const { title, startDate, endDate, amount, peopleCount } = req.body || {};
    const userId = requestSession.get("userId");

    if (!title?.trim()) {
      throw new AppError({
        status: false,
        message: "Title is required",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    const message = await AiChatMessageService.getDoc(
      { id: messageId },
      {
        include: [
          {
            model: AiChatSession,
            attributes: ["id", "userId"],
          },
        ],
      },
    );

    if (message.role !== "assistant") {
      throw new AppError({
        status: false,
        message: "Only AI responses can be saved to itineraries",
        httpStatus: httpStatus.BAD_REQUEST,
      });
    }

    if (message.AiChatSession?.userId !== userId) {
      throw new AppError({
        status: false,
        message: "You do not have permission to save this response",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    // Prevent duplicate itinerary creation from the same message.
    const existingItinerary = await ItineraryService.getDoc(
      { aiMessageId: message.id },
      { allowNull: true },
    );

    if (existingItinerary) {
      sendResponse(
        httpStatus.OK,
        res,
        existingItinerary,
        "Itinerary already created for this AI response",
      );
      return;
    }

    const itinerary = await ItineraryService.create({
      title: title.trim(),
      userId,
      startDate: parseOptionalDate(startDate),
      endDate: parseOptionalDate(endDate),
      amount: toSafeNumber(amount, 0),
      peopleCount: Math.max(0, toSafeInteger(peopleCount, 1)),
      public: false,
      description: message.content,
      aiMessageId: message.id,
    });

    sendResponse(
      httpStatus.CREATED,
      res,
      itinerary,
      "Itinerary created from AI response",
    );
  }

  static async deleteItineraryByMessage(req, res) {
    const { messageId } = req.params;
    const userId = requestSession.get("userId");

    const itinerary = await ItineraryService.getDoc(
      { aiMessageId: messageId },
      { allowNull: true },
    );

    if (!itinerary) {
      throw new AppError({
        status: false,
        message: "No itinerary found for this AI message",
        httpStatus: httpStatus.NOT_FOUND,
      });
    }

    if (itinerary.userId !== userId) {
      throw new AppError({
        status: false,
        message: "You cannot delete this itinerary",
        httpStatus: httpStatus.FORBIDDEN,
      });
    }

    await itinerary.destroy();

    sendResponse(
      httpStatus.OK,
      res,
      { id: itinerary.id, deleted: true },
      "AI-generated itinerary deleted",
    );
  }
}

export default AiChatController;
