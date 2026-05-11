/**
 * deploy.mjs — Commit source changes and push to main.
 * GitHub Actions (.github/workflows/deploy.yml) will automatically
 * build and deploy to GitHub Pages on every push.
 *
 * Usage:  node scripts/deploy.mjs
 *        (or just: git add . && git commit -m "..." && git push origin main)
 */

import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function tryRun(cmd) {
  try {
    execSync(cmd, { stdio: "pipe", cwd: root });
  } catch {
    // Ignore — file may already be untracked
  }
}

// Remove any previously-committed build artifacts from git tracking
tryRun("git rm --cached -r --quiet assets/");
tryRun("git rm --cached --quiet vite.html");

// Stage all source changes
run("git add .");

// Commit only if there is something staged
try {
  execSync("git diff --cached --quiet", { cwd: root });
  console.log("Nothing new to commit — source is already up to date.");
} catch {
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  run(`git commit -m "source: update ${timestamp}"`);
  run("git push origin HEAD:main");
  console.log("\n✔ Source pushed to main — GitHub Actions will build and deploy automatically.");
}
