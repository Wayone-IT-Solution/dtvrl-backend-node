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

  await queryInterface.addConstraint("Itineraries", {
    fields: ["aiMessageId"],
    type: "unique",
    name: "unique_itinerary_ai_message_id",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    "Itineraries",
    "unique_itinerary_ai_message_id",
  );
  await queryInterface.removeColumn("Itineraries", "aiMessageId");
}
