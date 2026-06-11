import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");
const packagedExe = join(root, "release", "win-unpacked", "startlink.exe");
const installedExe = process.env.LPP_INSTALLED_EXE || "D:\\Program Files\\startlink\\startlink.exe";
const ico = join(root, "assets", "app-icon-startlink.ico");
const syncScript = join(root, "scripts", "sync-app-icon.mjs");

if (process.platform !== "win32") {
  fail("icon:fix-taskbar currently supports Windows only.");
}

main();

function main() {
  log("stopping packaged and installed app processes");
  stopProcesses([packagedExe, installedExe]);

  log("syncing source icon outputs and workspace packaged exe");
  run(process.execPath, [syncScript], { label: "run icon:sync" });

  if (!existsSync(installedExe)) {
    fail(`installed exe not found: ${installedExe}`);
  }
  if (!existsSync(ico)) {
    fail(`ICO not found: ${relative(ico)}`);
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    fail("rcedit-x64.exe was not found. Run electron-builder once or set RCEDIT_PATH.");
  }

  run(rcedit, [installedExe, "--set-icon", ico], {
    label: `patch installed exe: ${installedExe}`,
    adminHint: true,
  });

  updateShortcuts(installedExe);
  refreshIconCache();
  log("installed taskbar icon repair complete");
  log("if the pinned taskbar icon still shows the old image, unpin and pin again or restart Explorer.");
}

function stopProcesses(targets) {
  const script = [
    `$targets = @(${targets.map(psString).join(",")});`,
    "Get-CimInstance Win32_Process |",
    "Where-Object { $targets -contains $_.ExecutablePath } |",
    "ForEach-Object { Stop-Process -Id $_.ProcessId -Force }",
  ].join(" ");
  run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    label: "stop existing LPP processes",
    optional: true,
  });
}

function updateShortcuts(targetExe) {
  const script = [
    "$shell = New-Object -ComObject WScript.Shell;",
    `$target = ${psString(targetExe)};`,
    "$roots = @(",
    "$env:PUBLIC + '\\Desktop',",
    "$env:USERPROFILE + '\\Desktop',",
    "$env:APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs',",
    "$env:APPDATA + '\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar'",
    ");",
    "foreach ($root in $roots) {",
    "if (-not (Test-Path $root)) { continue }",
    "Get-ChildItem $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue |",
    "Where-Object { $_.Name -match 'startlink|LPP|客服|lpp' } |",
    "ForEach-Object {",
    "$shortcut = $shell.CreateShortcut($_.FullName);",
    "if ($shortcut.TargetPath -eq $target -or $_.Name -match 'startlink|LPP|客服|lpp') {",
    "$shortcut.TargetPath = $target;",
    "$shortcut.WorkingDirectory = Split-Path $target;",
    "$shortcut.IconLocation = $target + ',0';",
    "$shortcut.Save();",
    "Write-Output $_.FullName;",
    "}",
    "}",
    "}",
  ].join(" ");
  run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    label: "update desktop/start/taskbar shortcut icon locations",
    optional: true,
  });
}

function refreshIconCache() {
  run("ie4uinit.exe", ["-ClearIconCache"], { label: "clear Windows icon cache", optional: true });
  run("ie4uinit.exe", ["-show"], { label: "refresh Windows icon cache", optional: true });
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

function run(command, args, options) {
  log(options.label);
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", windowsHide: true });
  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.status === 0) return;

  const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
  const suffix = options.adminHint
    ? "\nIf this is a permission error, run the command from an administrator PowerShell."
    : "";
  const message = `${options.label} failed${details ? `:\n${details}` : ""}${suffix}`;
  if (options.optional) {
    warn(message);
    return;
  }
  fail(message);
}

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
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
