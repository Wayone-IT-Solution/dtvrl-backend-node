export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("AiChatSessions", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    title: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    lastInteractionAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex("AiChatSessions", ["userId"], {
    name: "idx_ai_chat_sessions_user_id",
  });

  await queryInterface.createTable("AiChatMessages", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AiChatSessions",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    role: {
      type: Sequelize.ENUM("system", "user", "assistant"),
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex("AiChatMessages", ["sessionId"], {
    name: "idx_ai_chat_messages_session_id",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex(
    "AiChatMessages",
    "idx_ai_chat_messages_session_id",
  );
  await queryInterface.dropTable("AiChatMessages");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_AiChatMessages_role";',
  );

  await queryInterface.removeIndex(
    "AiChatSessions",
    "idx_ai_chat_sessions_user_id",
  );
  await queryInterface.dropTable("AiChatSessions");
}
