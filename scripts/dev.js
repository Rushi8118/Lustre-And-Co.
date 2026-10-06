import { spawn, execSync } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");
const clientDir = path.join(rootDir, "lustre-and-co");

const isWin = process.platform === "win32";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function log(prefix, color, message) {
  const lines = String(message).split(/\r?\n/);
  for (const line of lines) {
    if (line.trim()) {
      console.log(`${color}${prefix}${colors.reset} ${line}`);
    }
  }
}

function isPortInUse(port) {
  return new Promise((resolve) => {
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
}

function spawnNpm(args, options = {}) {
  if (isWin) {
    const cmd = process.env.ComSpec || "cmd.exe";
    return spawn(cmd, ["/d", "/s", "/c", "npm", ...args], {
      ...options,
      shell: false,
    });
  }
  return spawn("npm", args, {
    ...options,
    shell: false,
  });
}

function killProcess(pid) {
  if (!pid) return;
  try {
    if (isWin) {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // Process might have already exited
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.green}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.green}  ✨ Lustre & Co. Unified Development Launcher ✨  ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}═════════════════════════════════════════════════════════${colors.reset}\n`);

  const activeProcesses = [];

  const cleanup = () => {
    console.log(`\n${colors.yellow}Shutting down Lustre & Co. development servers...${colors.reset}`);
    for (const proc of activeProcesses) {
      if (proc?.pid) {
        killProcess(proc.pid);
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  const sharedEnv = { ...process.env, LUSTRE_DEV_RUNNER: "1" };

  // 1. Check & start Backend Server (port 5000)
  const serverRunning = await isPortInUse(5000);
  if (serverRunning) {
    log("[Backend]", colors.green, "✓ Port 5000 is already active (backend server is running).");
  } else {
    log("[Backend]", colors.cyan, "Starting NestJS API server on http://localhost:5000/api ...");
    const serverProc = spawnNpm(["run", "start:dev"], {
      cwd: serverDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: sharedEnv,
    });

    activeProcesses.push(serverProc);

    serverProc.stdout.on("data", (data) => {
      log("[Backend]", colors.cyan, data);
    });

    serverProc.stderr.on("data", (data) => {
      log("[Backend]", colors.yellow, data);
    });

    serverProc.on("error", (err) => {
      log("[Backend]", colors.red, `Server error: ${err.message}`);
    });
  }

  // 2. Check & start Frontend Vite Client (port 5177)
  const clientRunning = await isPortInUse(5177);
  if (clientRunning) {
    log("[Storefront]", colors.green, "✓ Port 5177 is already active (storefront is running).");
  } else {
    log("[Storefront]", colors.magenta, "Starting Vite storefront on http://localhost:5177 ...");
    const clientProc = spawnNpm(["run", "dev"], {
      cwd: clientDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: sharedEnv,
    });

    activeProcesses.push(clientProc);

    clientProc.stdout.on("data", (data) => {
      log("[Storefront]", colors.magenta, data);
    });

    clientProc.stderr.on("data", (data) => {
      log("[Storefront]", colors.yellow, data);
    });

    clientProc.on("error", (err) => {
      log("[Storefront]", colors.red, `Client error: ${err.message}`);
    });
  }
}

main().catch((err) => {
  console.error("Failed to start development launcher:", err);
  process.exit(1);
});
