import express from "express";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();
const routesDir = __dirname;

const loadRoutes = async () => {
  const files = fs.readdirSync(routesDir);

  for (let file of files) {
    if (file.endsWith(".route.js") && file != "index.route.js") {
      const routePath = join(routesDir, file);
      const routeUrl = pathToFileURL(routePath).href;
      const route = (await import(routeUrl)).default;

      // Process file name for the endpoint (camelCase to kebab-case)
      const endpoint = file
        .replace(".route.js", "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();

      router.use(`/${endpoint}`, route);
    }
  }
};

await loadRoutes();

export default router;
