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
    // Step 1: Install dependencies
    console.log("\x1b[33m[1/3] Installing dependencies...\x1b[0m");
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

    // Step 2: Start dev server
    console.log("\x1b[33m[2/3] Starting development server...\x1b[0m");
    const devServer = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    console.log("\x1b[32m✓ Dev server started (http://localhost:5173)\x1b[0m");
    console.log("");

    // Step 3: Wait for server to start and open browser
    console.log("\x1b[33m[3/3] Opening application in browser...\x1b[0m");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const url = "http://localhost:5173";
    const currentPlatform = platform();

    if (currentPlatform === "win32") {
      exec(`start ${url}`);
    } else if (currentPlatform === "darwin") {
      exec(`open ${url}`);
    } else if (currentPlatform === "linux") {
      exec(`xdg-open ${url}`);
    }

    console.log("\x1b[32m✓ Browser opened\x1b[0m");
    console.log("");
    console.log("===============================================");
    console.log("\x1b[36mCampus Marketplace is ready!\x1b[0m");
    console.log("\x1b[33mPress Ctrl+C to stop the dev server\x1b[0m");
    console.log("===============================================");

    // Keep process alive
    devServer.on("close", () => {
      process.exit(0);
    });
  } catch (error) {
    console.error("\x1b[31mError:\x1b[0m", error.message);
    process.exit(1);
  }
}

main();
