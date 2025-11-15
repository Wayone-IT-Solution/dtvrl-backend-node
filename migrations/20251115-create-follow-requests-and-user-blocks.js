export async function up(queryInterface, Sequelize) {
  // FollowRequests table
  await queryInterface.createTable("FollowRequests", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    requesterId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    targetId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: Sequelize.ENUM("pending", "accepted", "rejected"),
      allowNull: false,
      defaultValue: "pending",
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

  await queryInterface.addIndex("FollowRequests", {
    fields: ["requesterId", "targetId"],
    unique: true,
    name: "FollowRequests_requester_target_unique",
  });

  // UserBlocks table
  await queryInterface.createTable("UserBlocks", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    blockerId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    blockedId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
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

  await queryInterface.addIndex("UserBlocks", {
    fields: ["blockerId", "blockedId"],
    unique: true,
    name: "UserBlocks_blocker_blocked_unique",
  });
}

export async function down(queryInterface) {
  // Drop UserBlocks
  await queryInterface.removeIndex(
    "UserBlocks",
    "UserBlocks_blocker_blocked_unique",
  );
  await queryInterface.dropTable("UserBlocks");

  // Drop FollowRequests
  await queryInterface.removeIndex(
    "FollowRequests",
    "FollowRequests_requester_target_unique",
  );
  await queryInterface.dropTable("FollowRequests");

  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_FollowRequests_status";',
  );
}

