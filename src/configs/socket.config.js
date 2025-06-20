import {
  Server
} from "socket.io";
import path from "path";
import {
  fileURLToPath
} from "url";
import Message from "#models/message";
import ChatGroup from "#models/chatGroup";
import ChatGroupMember from "#models/chatGroupMember";
import User from "#models/user";
import {
  server
} from "#configs/server";
import {
  session
} from "#middlewares/requestSession";
import sequelize from "#configs/database";
import ChatGroupMessage from "#models/chatGroupMessage";
import UserService from "#services/user";
// import saveFile from "#utils/upload"; // optional

// ========== In-memory tracking ==========
const userList = {}; // { userId: Set(socketId) }
const socketList = {}; // { socketId: userId }

// ========== Socket.IO setup ==========
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// ========== Helpers ==========
const addUserToList = (userId, socketId) => {
  if (!userList[userId]) userList[userId] = new Set();
  userList[userId].add(socketId);
  socketList[socketId] = userId;
};

const removeUserFromList = (socketId) => {
  const userId = socketList[socketId];
  if (userId && userList[userId]) {
    userList[userId].delete(socketId);
    if (userList[userId].size === 0) delete userList[userId];
  }
  delete socketList[socketId];
};

// ========== Socket Events ==========
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Track 1:1 users
  socket.on("addUser", (userId) => {
    addUserToList(userId, socket.id);
  });

  // Join group room
  socket.on("addUserToGroup", async ({
    userId,
    groupId
  }) => {
    if (!userId || !groupId) return;

    const isMember = await ChatGroupMember.findOne({
      where: {
        userId,
        groupId
      },
    });
    if (isMember) {
      socket.join(groupId.toString()); // join room by groupId
      console.log(`User ${userId} joined group ${groupId}`);
    }
  });

  // 1:1 private message
  socket.on("message", async (payload, file = null) => {
    session.run(async () => {
      let transaction;
      try {
        transaction = await sequelize.transaction();
        session.set("transaction", transaction);

        const {
          senderId,
          receiverId,
          text,
          uniqueId
        } = payload;
        if (!senderId || !receiverId || (!text && !file)) {
          return io.to(socket.id).emit("message", {
            status: false,
            message: "Invalid private message",
          });
        }

        let filePath = null;
        if (file) {
          filePath = await saveFile(file);
          filePath = filePath.replace("src/", "/");
        }
        const user = await User.findDocById(senderId);
        const message = await Message.create({
          senderId,
          receiverId,
          message: text || null,
          file: filePath,
        });

        const receiverSockets = userList[receiverId];
        const senderSockets = userList[senderId];

        receiverSockets?.forEach((id) =>
          socket.to(id).emit("message", {
            uniqueId,
            message,
            user
          })
        );
        senderSockets?.forEach((id) =>
          io.to(id).emit("message-sent", {
            uniqueId,
            message,
            user
          })
        );

        await transaction.commit();
      } catch (err) {
        console.error("Message error:", err);
        io.to(socket.id).emit("message", {
          status: false,
          message: "Internal error",
        });
        const trx = session.get("transaction");
        if (trx) await trx.rollback();
      }
    });
  });

  // Group message via room
  socket.on("groupMessage", async (payload, file = null) => {
    session.run(async () => {
      let transaction;
      try {
        transaction = await sequelize.transaction();
        session.set("transaction", transaction);

        const {
          senderId,
          groupId,
          text,
          uniqueId
        } = payload;
        console.log(senderId, groupId, text, uniqueId);
        if (!senderId || !groupId || (!text && !file)) {
          return io.to(socket.id).emit("groupMessage", {
            status: false,
            message: "Invalid group message",
          });
        }

        const isMember = await ChatGroupMember.findOne({
          where: {
            groupId,
            userId: senderId
          },
        });
        if (!isMember) {
          return io.to(socket.id).emit("groupMessage", {
            status: false,
            message: "Not a group member",
          });
        }

        let filePath = null;
        if (file) {
          filePath = await saveFile(file);
          filePath = filePath.replace("src/", "/");
        }

        const message = await ChatGroupMessage.create({
          senderId,
          groupId,
          text: text || null,
          file: filePath,
        });

        const user = await User.findDocById(senderId);
        // Emit to everyone in the room
        io.to(groupId?.toString()).emit("groupMessage", {
          uniqueId,
          message,
          user,
        });

        // Optionally emit to sender for confirmation
        const senderSockets = userList[senderId];
        console.log(senderSockets)
        senderSockets?.forEach((id) => {
          {
            io.to(id).emit("groupMessage-sent", {
              uniqueId,
              message,
              user
            });
            console.log(id);
          }
        });
        console.log("data");

        await transaction.commit();
      } catch (err) {
        console.error("Group message error:", err);
        const trx = session.get("transaction");
        if (trx) await trx.rollback();
      }
    });
  });

  // Typing for group via room
  socket.on("group-typing", ({
    groupId,
    senderId
  }) => {
    socket.to(groupId?.toString()).emit("group-is-typing", {
      senderId
    });
  });

  // Typing for 1:1
  socket.on("user-typing", (receiverId) => {
    const senderId = socketList[socket.id];
    const receiverSockets = userList[receiverId];
    receiverSockets?.forEach((id) => socket.to(id).emit("is-typing", senderId));
  });

  // Read receipt
  socket.on("read", async (payload) => {
    session.run(async () => {
      let transaction;
      try {
        transaction = await sequelize.transaction();
        session.set("transaction", transaction);

        const receiverId = socketList[socket.id];
        const senderId = payload;

        await Message.update({
          readByUser: true
        }, {
          where: {
            receiverId,
            senderId
          }
        });

        await transaction.commit();
      } catch (err) {
        const trx = session.get("transaction");
        if (trx) await trx.rollback();
      }
    });
  });

  socket.on("disconnect", () => {
    const userId = socketList[socket.id];
    console.log("Disconnected:", socket.id, "| User:", userId);
    removeUserFromList(socket.id);
  });
});

export default server;