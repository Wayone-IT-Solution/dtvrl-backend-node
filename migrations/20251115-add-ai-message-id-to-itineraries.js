export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("Itineraries", "aiMessageId", {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: "AiChatMessages",
      key: "id",
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("Itineraries", "aiMessageId");
}

