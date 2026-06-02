import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

const paths = {
  sourcePng: join(root, "assets", "brand", "app-icon-source.png"),
  assetPng: join(root, "assets", "app-icon-green-bubble.png"),
  publicPng: join(root, "public", "app-icon-green-bubble.png"),
  ico: join(root, "assets", "app-icon-green-bubble.ico"),
  icns: join(root, "assets", "app-icon-green-bubble.icns"),
  packagedExe: join(root, "release", "win-unpacked", "LPP 客服客户端.exe"),
};
const outputManifest = ["assets/app-icon-green-bubble.ico", "public/app-icon-green-bubble.png"];

const pngSignature = "89504e470d0a1a0a";

main();

function main() {
  log(`source: ${relative(paths.sourcePng)}`);
  log(`outputs: ${outputManifest.join(", ")}`);
  validateSourcePng(paths.sourcePng);
  syncPngOutputs();
  syncConvertedIconOutputs();
  patchPackagedExe();
  log("done");
}

function validateSourcePng(file) {
  if (!existsSync(file)) {
    fail(`missing source PNG: ${relative(file)}`);
  }

  const header = readFileSync(file).subarray(0, 8).toString("hex");
  if (header !== pngSignature) {
    fail(`source must be a PNG file: ${relative(file)}`);
  }

  log("validated PNG source");
}

function syncPngOutputs() {
  for (const target of [paths.assetPng, paths.publicPng]) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(paths.sourcePng, target);
    log(`wrote ${relative(target)}`);
  }
}

function syncConvertedIconOutputs() {
  const magick = findExecutable(["magick.exe", "magick"]);
  if (!magick) {
    warn(
      [
        "ImageMagick was not found; skipped ICO/ICNS regeneration.",
        `Existing files are preserved: ${relative(paths.ico)}, ${relative(paths.icns)}.`,
        "Install ImageMagick or provide fresh ICO/ICNS files before release packaging.",
      ].join(" "),
    );
    return;
  }

  run(magick, [paths.sourcePng, "-define", "icon:auto-resize=256,128,64,48,32,16", paths.ico], {
    label: `generate ${relative(paths.ico)}`,
  });
  run(magick, [paths.sourcePng, paths.icns], {
    label: `generate ${relative(paths.icns)}`,
    optional: true,
  });
}

function patchPackagedExe() {
  if (!existsSync(paths.packagedExe)) {
    warn(`packaged exe not found; skipped exe icon patch: ${relative(paths.packagedExe)}`);
    return;
  }

  if (!existsSync(paths.ico)) {
    fail(`cannot patch exe because ICO is missing: ${relative(paths.ico)}`);
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    fail(
      [
        "packaged exe exists but rcedit was not found, so the exe icon was not patched.",
        "Run electron-builder once or set RCEDIT_PATH to rcedit-x64.exe.",
      ].join(" "),
    );
  }

  run(rcedit, [paths.packagedExe, "--set-icon", paths.ico], {
    label: `patch ${relative(paths.packagedExe)} with ${relative(paths.ico)}`,
  });
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

function findExecutable(names) {
  if (process.platform !== "win32") {
    for (const name of names) {
      const result = spawnSync("which", [name], { encoding: "utf8" });
      if (result.status === 0) return result.stdout.trim().split("\n")[0];
    }
    return null;
  }

  for (const name of names) {
    const result = spawnSync("where.exe", [name], { encoding: "utf8", windowsHide: true });
    if (result.status === 0) return result.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
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

function run(command, args, options) {
  log(options.label);
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", windowsHide: true });
  if (result.status === 0) return;

  const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
  const message = details ? `${options.label} failed:\n${details}` : `${options.label} failed`;
  if (options.optional) {
    warn(message);
    return;
  }
  fail(message);
}

function relative(file) {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

function log(message) {
  console.log(`[icon] ${message}`);
}

function warn(message) {
  console.warn(`[icon] WARN ${message}`);
}

function fail(message) {
  console.error(`[icon] ERROR ${message}`);
  process.exit(1);
}
