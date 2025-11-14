export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Reels", {
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
    },
    videoUrl: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    thumbnailUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    caption: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    musicId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    filterId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    locationLat: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    locationLng: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    locationName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    taggedUserIds: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    visibility: {
      type: Sequelize.ENUM("public", "followers", "private"),
      allowNull: false,
      defaultValue: "public",
    },
    wasHereCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
}

export async function down(queryInterface) {
  await queryInterface.dropTable("Reels");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_Reels_visibility";',
  );
}
