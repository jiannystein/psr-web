/**
 * deploy.mjs — Build and deploy to GitHub Pages (gh-pages branch).
 *
 * Usage:  node scripts/deploy.mjs
 *
 * What it does:
 *   1. Restores root index.html from vite.html (the canonical template)
 *   2. Runs `vite build` (which reads vite.html via rollupOptions.input)
 *   3. Copies dist/index.html → root index.html
 *   4. Copies dist/assets/*   → root assets/
 *   5. Stages the changes and creates a deploy commit
 *   6. Pushes to origin gh-pages (with gc.auto=0 to avoid interactive prompts)
 *   7. Restores root index.html back to the template for the next dev session
 */

import { copyFileSync, readdirSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

// 1. Restore template so Vite has a clean entry point
const template = readFileSync(join(root, "vite.html"), "utf8");
writeFileSync(join(root, "index.html"), template);
console.log("✓ Restored index.html from vite.html");

// 2. Build
run("npx vite build");

// 3. Copy built index.html to root
copyFileSync(join(root, "dist/index.html"), join(root, "index.html"));
console.log("✓ Copied dist/index.html → index.html");

// 4. Copy dist/assets/* to root assets/
const assetsOut = join(root, "assets");
mkdirSync(assetsOut, { recursive: true });
for (const file of readdirSync(join(root, "dist/assets"))) {
  copyFileSync(join(root, "dist/assets", file), join(assetsOut, file));
}
console.log("✓ Copied dist/assets → assets/");

// 5. Stage and commit
run("git add index.html assets/");
const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
run(`git -c gc.auto=0 commit -m "deploy: update production build ${timestamp}"`);

// 6. Push
run("git -c gc.auto=0 push origin gh-pages");

// 7. Restore template for next dev session
writeFileSync(join(root, "index.html"), template);
console.log("✓ Restored index.html to dev template — ready for next session");
