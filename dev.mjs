#!/usr/bin/env node
/**
 * Campus Marketplace - Development Setup Script
 * Cross-platform Node.js script
 * Usage: node dev.mjs
 */

import { spawn } from "child_process";
import { platform } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("===============================================");
console.log("\x1b[36mCampus Marketplace - Development Setup\x1b[0m");
console.log("===============================================");
console.log("");

async function main() {
  try {
    // Check Node version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (isNaN(nodeMajor)) {
      console.error(`\x1b[31mError: Could not parse Node version "${nodeVersion}". Expected v22.x\x1b[0m`);
      process.exit(1);
    }
    if (nodeMajor !== 22) {
      console.error(
        `\x1b[31mError: Node 22 required (found ${nodeVersion}). Run: nvm use 22\x1b[0m`
      );
      process.exit(1);
    }

    // Step 1: Install dependencies
    console.log("\x1b[33m[1/4] Installing dependencies...\x1b[0m");
    await new Promise((resolve, reject) => {
      const install = spawn("npm", ["install"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      install.on("close", (code) => {
        if (code !== 0) {
          reject(new Error("npm install failed"));
        } else {
          resolve();
        }
      });
    });
    console.log("\x1b[32m✓ Dependencies installed\x1b[0m");
    console.log("");

    // Step 2: Build backend
    console.log("\x1b[33m[2/4] Building backend...\x1b[0m");
    await new Promise((resolve, reject) => {
      const build = spawn("npm", ["run", "build", "--workspace=apps/backend"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      build.on("close", (code) => {
        if (code !== 0) {
          reject(new Error("backend build failed"));
        } else {
          resolve();
        }
      });
    });
    console.log("\x1b[32m✓ Backend built\x1b[0m");
    console.log("");

    // Step 3: Start dev server
    console.log("\x1b[33m[3/4] Starting development server...\x1b[0m");
    const devServer = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    devServer.on("error", (err) => {
      console.error("\x1b[31mFailed to start dev server:\x1b[0m", err.message);
      process.exit(1);
    });

    console.log("\x1b[32m✓ Dev server process launched (http://localhost:5173)\x1b[0m");
    console.log("");

    // Step 4: Wait for server to start and open browser
    console.log("\x1b[33m[4/4] Opening application in browser...\x1b[0m");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const url = "http://localhost:5173";
    const currentPlatform = platform();

    try {
      if (currentPlatform === "win32") {
        await execAsync(`start ${url}`);
      } else if (currentPlatform === "darwin") {
        await execAsync(`open ${url}`);
      } else if (currentPlatform === "linux") {
        await execAsync(`xdg-open ${url}`);
      }
      console.log("\x1b[32m✓ Browser opened\x1b[0m");
    } catch {
      console.log("\x1b[33m⚠ Could not open browser automatically — visit http://localhost:5173 manually\x1b[0m");
    }
    console.log("");
    console.log("===============================================");
    console.log("\x1b[36mCampus Marketplace is ready!\x1b[0m");
    console.log("\x1b[33mPress Ctrl+C to stop the dev server\x1b[0m");
    console.log("===============================================");

    // Keep process alive
    devServer.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`\x1b[31mDev server exited with code ${code}\x1b[0m`);
        process.exit(code);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("\x1b[31mError:\x1b[0m", error.message);
    process.exit(1);
  }
}

main();
