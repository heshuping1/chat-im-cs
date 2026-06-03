import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const sourceRoots = ["src/renderer", "src/shared", "src/main", "src/preload"];
const sourceExtensions = new Set([".ts", ".tsx", ".cts"]);
const maxLines = 900;
const largeFileAllowlist = new Map([
  ["src/renderer/components/CustomerProfileWorkspace.tsx", "P19 documented customer profile workspace owner"],
  ["src/renderer/components/MePage.tsx", "P19 documented me page assembly owner"],
  ["src/renderer/components/MessageCenter.tsx", "P19 documented IM page assembly owner"],
  ["src/renderer/components/OnlineServicePage.tsx", "P19 documented online service page assembly owner"],
  ["src/renderer/components/Sidebar.tsx", "P19 documented app sidebar assembly owner"],
  ["src/renderer/data/api/customer-service-client.ts", "P19 documented customer-service API client owner"],
  ["src/renderer/data/api/types.ts", "P19 documented API DTO contract owner"],
]);

const failures = [];
const warnings = [];
const files = sourceRoots.flatMap((root) => listSourceFiles(join(repoRoot, root)));

for (const file of files) {
  const relativePath = relative(repoRoot, file);
  const source = readFileSync(file, "utf8");
  const lineCount = source.split("\n").length;
  if (lineCount > maxLines) {
    const reason = largeFileAllowlist.get(relativePath);
    if (reason) {
      warnings.push(`${relativePath} has ${lineCount} lines (${reason})`);
    } else {
      failures.push(`${relativePath} has ${lineCount} lines; limit is ${maxLines}`);
    }
  }

  source.split("\n").forEach((line, index) => {
    if (!line.includes("console.")) return;
    if (isAllowedConsole(relativePath, line)) return;
    failures.push(`${relativePath}:${index + 1} contains unscoped console usage`);
  });
}

if (!readFileSync(join(repoRoot, "src/shared/desktop-api.ts"), "utf8").includes("desktopIpcChannelByMethod")) {
  failures.push("desktopIpcChannelByMethod whitelist is missing");
}
if (!readFileSync(join(repoRoot, "src/shared/desktop-api-validation.ts"), "utf8").includes("validateDesktopApiCall")) {
  failures.push("validateDesktopApiCall boundary validator is missing");
}

if (warnings.length > 0) {
  console.log("code shape warnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("code shape ok");

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listSourceFiles(filePath);
    return sourceExtensions.has(extname(filePath)) ? [filePath] : [];
  });
}

function isAllowedConsole(relativePath, line) {
  if (relativePath.includes("/diagnostics/")) return true;
  if (relativePath.endsWith("send-state-machine.ts")) return true;
  if (relativePath.endsWith("startup-performance.ts")) return true;
  if (line.includes(":diagnostic]")) return true;
  if (line.includes("[lpp:")) return true;
  return false;
}
