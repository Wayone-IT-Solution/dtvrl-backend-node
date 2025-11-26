import sequelize from "#configs/database";
import { AsyncLocalStorage } from "node:async_hooks";

class Storage {
  constructor() {
    this.als = new AsyncLocalStorage();
  }

  run(callback, initial = {}) {
    const store = new Map(Object.entries(initial));
    this.als.run(store, callback);
  }

  set(key, value) {
    const store = this.als.getStore();
    if (store) store.set(key, value);
  }

  get(key) {
    const store = this.als.getStore();
    return store?.get(key);
  }

  has(key) {
    const store = this.als.getStore();
    return store?.has(key);
  }
}

export const session = new Storage();

export default function () {
  return function (req, res, next) {
    session.run(async () => {
      session.set("files", req.files ?? []);
      if (req.method !== "GET" && req.method !== "OPTIONS") {
        try {
          const transaction = await sequelize.transaction();
          session.set("transaction", transaction);

          // Failsafe: ensure a transaction is cleaned up if a handler forgets to commit/rollback
          let cleanedUp = false;
          const cleanup = async () => {
            if (cleanedUp || transaction.finished) return;
            cleanedUp = true;
            try {
              await transaction.rollback();
            } catch (err) {
              console.error("Transaction cleanup rollback failed:", err);
            }
          };
          res.on("finish", cleanup);
          res.on("close", cleanup);
        } catch (err) {
          return next(err);
        }
      }
      next();
    });
  };
}
