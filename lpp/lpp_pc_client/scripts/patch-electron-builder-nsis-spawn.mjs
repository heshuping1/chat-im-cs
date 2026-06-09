import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = join(
  process.cwd(),
  "node_modules",
  "app-builder-lib",
  "out",
  "targets",
  "nsis",
  "NsisTarget.js",
);

const marker = "retrying NSIS uninstaller generation";
const before =
  '            await (0, wine_1.execWine)(installerPath, null, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });';
const after = `            const runUninstallerBuilder = async (attempt = 1) => {
                try {
                    await (0, wine_1.execWine)(installerPath, null, [], { env: { ...process.env, __COMPAT_LAYER: "RunAsInvoker" } });
                }
                catch (error) {
                    const message = error && (error.message || error.code || String(error));
                    if (process.platform === "win32" && attempt < 4 && \`\${message}\`.includes("spawn UNKNOWN")) {
                        builder_util_1.log.warn({ attempt, reason: "spawn UNKNOWN" }, "${marker}");
                        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
                        return runUninstallerBuilder(attempt + 1);
                    }
                    throw error;
                }
            };
            await runUninstallerBuilder();`;

let source = readFileSync(target, "utf8");

if (source.includes(marker)) {
  console.log("[LPP PC] electron-builder NSIS spawn patch already applied.");
  process.exit(0);
}

if (!source.includes(before)) {
  throw new Error("electron-builder NSIS patch target was not found.");
}

source = source.replace(before, after);
writeFileSync(target, source);
console.log("[LPP PC] Applied electron-builder NSIS spawn retry patch.");
