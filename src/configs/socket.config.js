import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import Message from "#models/message";
// import saveFile from "#utils/upload";
import { server } from "#configs/server";
import { session } from "#middlewares/requestSession";
import sequelize from "#configs/database";

// const app = express();
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// const server = createServer(app);

const userList = {};
const socketList = {};

// Get user by userId
const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

const addUserToList = (userId, socketId) => {
  if (!userList[userId]) {
    userList[userId] = new Set();
  }
  userList[userId].add(socketId);
  socketList[socketId] = userId;
};

const removeUserFromList = (socketId) => {
  const userId = socketList[socketId];

  if (userId && userList[userId]) {
    userList[userId].delete(socketId);

    if (userList[userId].size === 0) {
      delete userList[userId];
    }
  }

  delete socketList[socketId];
};

io.on("connection", (socket) => {
  console.log("User connected", socket.id);
  socket.on("message", async (payload, file = null) => {
    session.run(async () => {
      const transaction = await sequelize.transaction();
      session.set("transaction", transaction);
      try {
        if (typeof payload !== "object") {
          return;
        }
        let { senderId, receiverId, text, uniqueId } = payload;
        console.log(senderId, receiverId, text);
        if (!senderId || !receiverId) {
          return io.to(socket.id).emit("message", {
            status: false,
            message: "Both senderId and receiverId are required",
          });
        }
        if (!text && !file) {
          return io.to(socket.id).emit("message", {
            status: false,
            message: "Please send a valid text or file",
          });
        }
        let filePath = null;
        if (file) {
          text = null;
          filePath = await saveFile(file);
          filePath = filePath.replace("src/", "/");
        }

        const message = await Message.create({
          senderId,
          receiverId,
          message: text,
          file: filePath,
        });

        const receiverSocketId = userList[receiverId];
        const senderSocketId = userList[senderId];

        socket.to(receiverSocketId).emit("message", { uniqueId, message });
        io.to(senderSocketId).emit("message-sent", { uniqueId, message });

        await transaction.commit();
      } catch (err) {
        console.log(err);
        io.to(socket.id).emit("message", {
          status: false,
          message: "Some internal error occured",
        });
        await transaction.rollback();
      }
    });
  });

  socket.on("addUser", async (payload) => {
    userList[payload] = socket.id;
    socketList[socket.id] = payload;
  });

  socket.on("read", async (payload) => {
    session.run(async () => {
      try {
        session.set("transaction", await sequelize.transaction());
        const receiverId = socketList[socket.id];
        console.log(payload);
      const data  =await Message.update(
          { readByUser: true },
          { where: { receiverId, senderId: payload } }
        );
        console.log(data)
        await session.get("transaction").commit();
      } catch (err) {
        await session.get("transaction").rollback();
      }
    });
  });

  socket.on("user-typing", async (payload) => {
    const socketId = userList[payload];
    const senderId = socketList[socket.id];
    console.log(payload)
    if (socketId) {
      socket.to(socketId).emit("is-typing", senderId);
    }
  });

  socket.on("disconnect", () => {
    const userId = socketList[socket.id];
    delete socketList[socket.id];
    delete userList[userId];
    console.log(`User disconnected ${socket.id}`);
  });
});

export default server;
