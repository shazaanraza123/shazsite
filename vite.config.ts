import { defineConfig, type Plugin } from "vite";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function serveFigmaExport(): Plugin {
  const dir = path.resolve(__dirname, "figma-export");
  return {
    name: "serve-figma-export",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/figma-export/")) return next();
        const rel = decodeURIComponent(req.url.replace("/figma-export/", "").split("?")[0]);
        const file = path.resolve(dir, rel);
        if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          return next();
        }
        res.setHeader("Content-Type", "image/jpeg");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const dest = path.resolve(__dirname, "dist/figma-export");
      fs.cpSync(dir, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveFigmaExport()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
