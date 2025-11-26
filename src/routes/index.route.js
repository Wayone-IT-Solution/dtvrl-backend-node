import express from "express";
import fs from "node:fs";
import { dirname, join } from "node:path";
import httpStatus from "http-status";
import { fileURLToPath, pathToFileURL } from "node:url";

globalThis.httpStatus = httpStatus;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();
const routesDir = __dirname;

const loadRoutes = async () => {
  try {
    const files = fs.readdirSync(routesDir);
    const routePromises = [];

    for (let file of files) {
      if (file.endsWith(".route.js") && file != "index.route.js") {
        const routePath = join(routesDir, file);
        const routeUrl = pathToFileURL(routePath).href;
        
        // Process file name for the endpoint (camelCase to kebab-case)
        const endpoint = file
          .replace(".route.js", "")
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .toLowerCase();

        // Load routes in parallel
        routePromises.push(
          import(routeUrl).then(module => ({
            endpoint,
            route: module.default
          }))
        );
      }
    }

    // Wait for all routes to load in parallel
    const loadedRoutes = await Promise.all(routePromises);
    
    // Register all routes
    loadedRoutes.forEach(({ endpoint, route }) => {
      router.use(`/${endpoint}`, route);
    });

    console.log(`Loaded ${loadedRoutes.length} route files`);
    console.log('Available routes:', loadedRoutes.map(r => `/${r.endpoint}`));
  } catch (error) {
    console.error('Error loading routes:', error);
  }
};

await loadRoutes();

export default router;



// old file content
// import express from "express";
// import fs from "node:fs";
// import { dirname, join } from "node:path";
// import { fileURLToPath, pathToFileURL } from "node:url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const router = express.Router();
// const routesDir = __dirname;

// const loadRoutes = async () => {
//   const files = fs.readdirSync(routesDir);

//   for (let file of files) {
//     if (file.endsWith(".route.js") && file != "index.route.js") {
//       const routePath = join(routesDir, file);
//       const routeUrl = pathToFileURL(routePath).href;
//       const route = (await import(routeUrl)).default;

//       // Process file name for the endpoint (camelCase to kebab-case)
//       const endpoint = file
//         .replace(".route.js", "")
//         .replace(/([a-z])([A-Z])/g, "$1-$2")
//         .toLowerCase();

//       router.use(`/${endpoint}`, route);
//     }
//   }
// };

// await loadRoutes();

// export default router;
