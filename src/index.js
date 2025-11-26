import env from "#configs/env";
import server from "#configs/socket";
import sequelize from "#configs/database";

server.listen(env.PORT, () => {
  console.log(`Server started on PORT ${env.PORT}`);
});

// added this to clear ports on shutdown 
let shuttingDown = false;
const gracefulShutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: closing server...`);

  server.close(async (err) => {
    if (err) {
      console.error("Error closing server:", err);
      process.exit(1);
    }
    try {
      await sequelize.close();
      console.log("Database connection closed.");
    } catch (dbErr) {
      console.error("Error closing database connection:", dbErr);
    } finally {
      process.exit(0);
    }
  });

  // Failsafe: force exit if close hangs
  setTimeout(() => {
    console.warn("Force exiting process after graceful shutdown timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
