import httpStatus from "http-status";
import { session as requestSession } from "#middlewares/requestSession";
import { sendResponse } from "#utils/response";
import AppError from "#utils/appError";
import AiChatSessionService from "#services/aiChatSession";
import AiChatMessageService from "#services/aiChatMessage";
import openaiClient from "#configs/openai";
import ItineraryService from "#services/itinerary";
import AiChatSession from "#models/aiChatSession";

const SYSTEM_PROMPT = `
You are DTVRL's AI travel concierge embedded inside a trip planning app.
Always return a concise but concrete day-by-day itinerary (Morning / Afternoon / Evening) with transport, lodging, food and cost tips.
If details like budget, companions, or travel style are missing, make reasonable assumptions and clearly list the assumptions instead of asking open questions.
Focus only on travel-related topics and keep responses friendly, practical, and ready to copy into an itinerary.
`;

const MAX_USER_MESSAGES = 10;
const MAX_FETCHED_MESSAGES = 40;

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
      if (userCount >= MAX_USER_MESSAGES) {
        break;
      }
      userCount += 1;
    }
    trimmed.push(record);
  }

  return trimmed.reverse();
}

class AiChatController {
  static async listSessions(req, res) {
    const userId = requestSession.get("userId");
    req.query.userId = userId;

    const customOptions = {
      where: {
        userId,
      },
      order: [
        ["lastInteractionAt", "DESC"],
        ["id", "DESC"],
      ],
    };

    const options = AiChatSessionService.getOptions(req.query, customOptions);
    const data = await AiChatSessionService.get(null, req.query, options);
    sendResponse(
      httpStatus.OK,
      res,
      data,
      "AI chat sessions fetched successfully",
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
    const limit = Number.parseInt(req.query.limit ?? "50", 10);
    const sessionDoc =
      await AiChatSessionService.getUserSessionById(sessionId);

    const messages = await getConversationSlice(sessionDoc.id);
    const limitedMessages =
      Number.isNaN(limit) || limit <= 0
        ? messages
        : messages.slice(-limit);

    sendResponse(
      httpStatus.OK,
      res,
      {
        session: sessionDoc,
        messages: serializeMessages(limitedMessages),
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
