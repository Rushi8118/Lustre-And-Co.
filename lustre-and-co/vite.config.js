import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import net from "net";
import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function autoBackendPlugin() {
  let backendProc = null;

  return {
    name: "auto-backend-plugin",
    configureServer() {
      if (process.env.LUSTRE_DEV_RUNNER === "1") {
        return;
      }
      const isWin = process.platform === "win32";
      const checkPort = (port) =>
        new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(400);
          socket.on("connect", () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
          });
          socket.on("error", () => {
            resolve(false);
          });
          socket.connect(port, "127.0.0.1");
        });

      checkPort(5000).then((isInUse) => {
        if (!isInUse) {
          console.log("\x1b[36m[Backend]\x1b[0m Port 5000 is offline. Automatically launching NestJS server in background...");
          const serverDir = path.resolve(__dirname, "../server");
          if (isWin) {
            backendProc = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", "run", "start:dev"], {
              cwd: serverDir,
              stdio: "inherit",
              shell: false,
            });
          } else {
            backendProc = spawn("npm", ["run", "start:dev"], {
              cwd: serverDir,
              stdio: "inherit",
              shell: false,
            });
          }
        } else {
          console.log("\x1b[32m[Backend]\x1b[0m Connected to running backend on http://localhost:5000/api");
        }
      });

      const cleanup = () => {
        if (backendProc && backendProc.pid) {
          try {
            if (isWin) {
              execSync(`taskkill /pid ${backendProc.pid} /T /F`, { stdio: "ignore" });
            } else {
              process.kill(-backendProc.pid, "SIGKILL");
            }
          } catch {}
        }
      };

      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    },
  };
}

export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    port: 5177,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
