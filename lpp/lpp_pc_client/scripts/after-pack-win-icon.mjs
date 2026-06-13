import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

export default async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const exePaths = findAppExecutables(context.appOutDir);
  const iconPath = join(root, "assets", "app-icon-startlink.ico");
  if (exePaths.length === 0) {
    throw new Error(`Cannot patch Windows icon, exe not found in: ${context.appOutDir}`);
  }
  if (!existsSync(iconPath)) {
    throw new Error(`Cannot patch Windows icon, ico not found: ${iconPath}`);
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    throw new Error("Cannot patch Windows icon, rcedit-x64.exe was not found.");
  }

  for (const exePath of exePaths) {
    execFileSync(rcedit, [exePath, "--set-icon", iconPath], { stdio: "inherit" });
  }
}

function findAppExecutables(appOutDir) {
  const preferred = [join(appOutDir, "startlink.exe"), join(appOutDir, "StartLink.exe")].filter((exePath) =>
    existsSync(exePath),
  );
  if (preferred.length > 0) return [...new Set(preferred)];

  return readdirSync(appOutDir)
    .filter((entry) => entry.toLowerCase().endsWith(".exe") && !entry.toLowerCase().includes("uninstall"))
    .map((entry) => join(appOutDir, entry));
}

function findRcedit() {
  const candidates = [
    process.env.RCEDIT_PATH,
    ...findFiles(join(process.env.LOCALAPPDATA || "", "electron-builder", "Cache", "winCodeSign"), "rcedit-x64.exe"),
    join(root, "node_modules", "rcedit", "bin", "rcedit-x64.exe"),
    join(root, "node_modules", "electron-winstaller", "vendor", "rcedit.exe"),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function findFiles(startDir, fileName) {
  if (!startDir || !existsSync(startDir)) return [];

  const matches = [];
  const stack = [startDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.toLowerCase() === fileName.toLowerCase()) {
        matches.push(fullPath);
      }
    }
  }
  return matches;
}
