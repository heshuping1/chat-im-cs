import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");
const targets = [
  {
    exe: resolvePackagedExe(),
    outputPng: join(root, "tmp", "packaged-exe-icon.png"),
    required: true,
  },
  {
    exe: resolveInstalledExe(),
    outputPng: join(root, "tmp", "installed-exe-icon.png"),
    required: false,
  },
];

if (process.platform !== "win32") {
  fail("icon:verify currently requires Windows because it uses System.Drawing.Icon.ExtractAssociatedIcon.");
}

for (const target of targets) {
  extractIcon(target);
}

function extractIcon(target) {
  if (!target.exe) {
    const message = "exe not found";
    if (target.required) fail(message);
    console.warn(`[icon] WARN ${message}; skipped`);
    return;
  }

  if (!existsSync(target.exe)) {
    const message = `exe not found: ${target.exe}`;
    if (target.required) fail(message);
    console.warn(`[icon] WARN ${message}; skipped`);
    return;
  }

  mkdirSync(dirname(target.outputPng), { recursive: true });

  const script = [
    "Add-Type -AssemblyName System.Drawing;",
    `$exe = ${psString(target.exe)};`,
    `$out = ${psString(target.outputPng)};`,
    "$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe);",
    "if ($null -eq $icon) { throw 'AssociatedIcon is null.' }",
    "$bitmap = $icon.ToBitmap();",
    "$bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png);",
    "$bitmap.Dispose();",
    "$icon.Dispose();",
  ].join(" ");

  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    fail(details || `failed to extract AssociatedIcon from ${target.exe}.`);
  }

  console.log(`[icon] extracted ${target.exe} icon to ${relative(target.outputPng)}`);
}

function resolvePackagedExe() {
  const packagedDir = join(root, "release", "win-unpacked");
  for (const candidate of [join(packagedDir, "startlink.exe"), join(packagedDir, "StartLink.exe")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveInstalledExe() {
  if (process.env.LPP_INSTALLED_EXE) return process.env.LPP_INSTALLED_EXE;
  for (const candidate of [
    "C:\\Program Files\\StartLink\\startlink.exe",
    "C:\\Program Files\\StartLink\\StartLink.exe",
    "C:\\Program Files (x86)\\StartLink\\startlink.exe",
    "C:\\Program Files (x86)\\StartLink\\StartLink.exe",
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function relative(file) {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

function fail(message) {
  console.error(`[icon] ERROR ${message}`);
  process.exit(1);
}
