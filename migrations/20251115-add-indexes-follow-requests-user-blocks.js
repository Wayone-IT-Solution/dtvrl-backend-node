export async function up(queryInterface) {
  await queryInterface.addIndex("FollowRequests", {
    fields: ["targetId", "status", "createdAt"],
    name: "FollowRequests_target_status_createdAt_idx",
  });

  await queryInterface.addIndex("FollowRequests", {
    fields: ["requesterId", "createdAt"],
    name: "FollowRequests_requester_createdAt_idx",
  });

  await queryInterface.addIndex("UserBlocks", {
    fields: ["blockerId", "createdAt"],
    name: "UserBlocks_blocker_createdAt_idx",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex(
    "FollowRequests",
    "FollowRequests_target_status_createdAt_idx",
  );
  await queryInterface.removeIndex(
    "FollowRequests",
    "FollowRequests_requester_createdAt_idx",
  );
  await queryInterface.removeIndex(
    "UserBlocks",
    "UserBlocks_blocker_createdAt_idx",
  );
}

