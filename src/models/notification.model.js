import User from "#models/user";
import BaseModel from "#models/base";
import { DataTypes } from "sequelize";

class Notification extends BaseModel {}

Notification.initialize(
  {
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },

    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: User.primaryKeyAttribute,
      },
    },

    type: {
      type: DataTypes.ENUM(
        // Post-related notifications
        "POST_LIKE",
        "POST_COMMENT",
        "POST_SHARE",
        "POST_CREATED",

        // Itinerary-related notifications
        "ITINERARY_LIKE",
        "ITINERARY_COMMENT",
        "ITINERARY_RECOMMEND",

        // Location Review notifications
        "REVIEW_LIKE",
        "REVIEW_COMMENT",

        // Memory-related notifications
        "MEMORY_CREATED",
        "MEMORY_LIKE",
        "MEMORY_COMMENT",

        // Social interactions
        "FOLLOW",
      ),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("UNREAD", "READ", "DISMISSED"),
      defaultValue: "UNREAD",
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },

    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        fields: ["recipientId", "status"],
      },
      {
        fields: ["recipientId", "createdAt"],
      },
      {
        fields: ["type", "createdAt"],
      },
      {
        fields: ["type", "entityId"],
      },
    ],
  },
);

export default Notification;
