import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

const paths = {
  sourcePng: join(root, "assets", "brand", "app-icon-source.png"),
  assetPng: join(root, "assets", "app-icon-startlink.png"),
  publicPng: join(root, "public", "app-icon-startlink.png"),
  ico: join(root, "assets", "app-icon-startlink.ico"),
  icns: join(root, "assets", "app-icon-startlink.icns"),
  packagedExe: join(root, "release", "win-unpacked", "startlink.exe"),
};
const outputManifest = ["assets/app-icon-startlink.ico", "public/app-icon-startlink.png"];

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

  const source = readFileSync(file);
  const width = source.readUInt32BE(16);
  const height = source.readUInt32BE(20);
  const colorType = source.readUInt8(25);
  if (width !== 1024 || height !== 1024 || colorType !== 6) {
    fail(
      [
        "source must be a 1024x1024 RGBA PNG with transparent rounded corners,",
        `got ${width}x${height} colorType=${colorType}: ${relative(file)}`,
      ].join(" "),
    );
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
    if (syncConvertedIconOutputsWithMacTools()) return;

    warn(
      [
        "ImageMagick was not found and no local icon fallback was available; skipped ICO/ICNS regeneration.",
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

function syncConvertedIconOutputsWithMacTools() {
  if (process.platform !== "darwin") return false;

  const sips = findExecutable(["sips"]);
  if (!sips) return false;

  const tmpDir = mkdtempSync(join(tmpdir(), "startlink-icon-sync-"));
  try {
    const icoFrameDir = join(tmpDir, "ico");
    mkdirSync(icoFrameDir, { recursive: true });

    const icoSizes = [256, 128, 64, 48, 32, 16];
    const icoFrames = icoSizes.map((size) => {
      const frame = join(icoFrameDir, `icon-${size}.png`);
      run(sips, ["-z", String(size), String(size), paths.sourcePng, "--out", frame], {
        label: `render ${size}x${size} ICO frame`,
      });
      return { size, frame };
    });
    writePngBackedIco(paths.ico, icoFrames);

    const iconutil = findExecutable(["iconutil"]);
    if (!iconutil) {
      warn(`iconutil was not found; skipped ${relative(paths.icns)} regeneration.`);
      return true;
    }

    const iconsetDir = join(tmpDir, "app-icon.iconset");
    mkdirSync(iconsetDir, { recursive: true });
    const iconsetFrames = [
      ["icon_16x16.png", 16],
      ["icon_16x16@2x.png", 32],
      ["icon_32x32.png", 32],
      ["icon_32x32@2x.png", 64],
      ["icon_128x128.png", 128],
      ["icon_128x128@2x.png", 256],
      ["icon_256x256.png", 256],
      ["icon_256x256@2x.png", 512],
      ["icon_512x512.png", 512],
      ["icon_512x512@2x.png", 1024],
    ];
    for (const [fileName, size] of iconsetFrames) {
      run(sips, ["-z", String(size), String(size), paths.sourcePng, "--out", join(iconsetDir, fileName)], {
        label: `render ${fileName}`,
      });
    }
    run(iconutil, ["-c", "icns", iconsetDir, "-o", paths.icns], {
      label: `generate ${relative(paths.icns)}`,
      optional: true,
    });
    return true;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function writePngBackedIco(target, frames) {
  const images = frames.map(({ size, frame }) => ({
    size,
    buffer: readFileSync(frame),
  }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;
  images.forEach((image, index) => {
    const entryOffset = index * 16;
    entries.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset);
    entries.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(image.buffer.length, entryOffset + 8);
    entries.writeUInt32LE(offset, entryOffset + 12);
    offset += image.buffer.length;
  });

  writeFileSync(target, Buffer.concat([header, entries, ...images.map((image) => image.buffer)]));
  log(`generated ${relative(target)} with ${images.map((image) => `${image.size}px`).join(", ")} PNG frames`);
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
