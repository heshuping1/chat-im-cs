import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");
const packagedExe = join(root, "release", "win-unpacked", "LPP 客服客户端.exe");
const syncScript = join(root, "scripts", "sync-app-icon.mjs");

if (process.platform !== "win32") {
  fail("start:packaged currently supports Windows only.");
}

if (!existsSync(packagedExe)) {
  fail(`packaged exe not found: ${relative(packagedExe)}. Run npm.cmd run dist:win first.`);
}

stopExistingPackagedProcesses();

const syncResult = spawnSync(process.execPath, [syncScript], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
if (syncResult.status !== 0) {
  process.exit(syncResult.status || 1);
}

const child = spawn(packagedExe, [], {
  cwd: dirname(packagedExe),
  detached: true,
  stdio: "ignore",
  windowsHide: false,
});
child.unref();

console.log(`[icon] started packaged app: ${relative(packagedExe)}`);

function stopExistingPackagedProcesses() {
  const script = [
    `$target = ${psString(packagedExe)};`,
    "Get-CimInstance Win32_Process |",
    "Where-Object { $_.ExecutablePath -eq $target } |",
    "ForEach-Object { Stop-Process -Id $_.ProcessId -Force }",
  ].join(" ");
  spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  });
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
