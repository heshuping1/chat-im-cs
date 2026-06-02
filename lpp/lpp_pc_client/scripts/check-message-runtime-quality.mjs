import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const runLiveGateway = process.argv.includes("--live-gateway");

const checks = [
  {
    name: "typecheck",
    command: npmCommand(),
    args: ["run", "typecheck", "--", "--pretty", "false"],
  },
  {
    name: "message-runtime unit gates",
    command: npxCommand(),
    args: [
      "vitest",
      "run",
      "tests/unit/architecture-boundaries.spec.ts",
      "tests/unit/message-reminder-diagnostics.spec.ts",
      "tests/unit/message-delivery-service.spec.ts",
      "tests/unit/message-gap-sync-coordinator.spec.ts",
      "tests/unit/gateway-connection-manager.spec.ts",
      "tests/unit/gateway-event-router.spec.ts",
      "tests/unit/gateway-im-side-effects.spec.ts",
      "tests/unit/gateway-cs-side-effects.spec.ts",
      "tests/unit/messages-client.spec.ts",
      "tests/unit/customer-service-client.spec.ts",
    ],
  },
  {
    name: "message-runtime static transport audit",
    run: runStaticTransportAudit,
  },
  {
    name: "build",
    command: npmCommand(),
    args: ["run", "build"],
  },
];

if (runLiveGateway) {
  checks.splice(3, 0, {
    name: "live gateway smoke",
    run: runLiveGatewaySmoke,
  });
}

for (const check of checks) {
  console.log(`\n[message-runtime-quality] ${check.name}`);
  if (check.run) {
    await check.run();
  } else {
    await runCommand(check.command, check.args);
  }
}

console.log("\n[message-runtime-quality] passed");

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const spawnPlan = spawnCommand(command, args);
    const child = spawn(spawnPlan.command, spawnPlan.args, {
      cwd: repoRoot,
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

function runStaticTransportAudit() {
  const files = [
    "src/renderer/components/GatewayBridge.tsx",
    "src/renderer/data/api/base.ts",
    "src/main/message-reminder-diagnostics-routing.ts",
    "src/renderer/data/gateway/gateway-health-diagnostics.ts",
    "src/renderer/data/diagnostics/message-source-diagnostics.ts",
  ];
  const sources = new Map(files.map((file) => [file, readText(file)]));
  const allRendererText = readTrackedSource([
    "src/renderer",
    "tests/unit",
  ]);

  const violations = [];
  const gatewayBridge = sources.get("src/renderer/components/GatewayBridge.tsx") ?? "";
  if (!gatewayBridge.includes("accessTokenFactory")) {
    violations.push("GatewayBridge must authenticate SignalR via accessTokenFactory.");
  }
  if (!gatewayBridge.includes("withCredentials: false")) {
    violations.push("GatewayBridge must set withCredentials: false for token-only cross-origin SignalR.");
  }
  if (/withCredentials\s*:\s*true/.test(allRendererText)) {
    violations.push("Renderer must not opt SignalR/XHR requests into cross-origin credentials.");
  }
  if (/credentials\s*:\s*["']include["']/.test(allRendererText)) {
    violations.push("Renderer must not use credentials: include.");
  }
  if (!(sources.get("src/renderer/data/api/base.ts") ?? "").includes('credentials: "omit"')) {
    violations.push("ApiBaseClient must explicitly use credentials: \"omit\".");
  }
  if (!(sources.get("src/main/message-reminder-diagnostics-routing.ts") ?? "").includes("message-source.jsonl")) {
    violations.push("Message source diagnostics must route to message-source.jsonl.");
  }
  if (!(sources.get("src/renderer/data/gateway/gateway-health-diagnostics.ts") ?? "").includes("gateway.negotiate_fetch_failed")) {
    violations.push("Gateway health diagnostics must classify negotiate fetch failures.");
  }
  if (!(sources.get("src/renderer/data/diagnostics/message-source-diagnostics.ts") ?? "").includes("message.source.observed")) {
    violations.push("Message source diagnostics must emit message.source.observed.");
  }

  if (violations.length) {
    throw new Error(`Static transport audit failed:\n- ${violations.join("\n- ")}`);
  }
}

async function runLiveGatewaySmoke() {
  const baseUrl = process.env.LPP_GATEWAY_BASE_URL || "https://chat.hearteasechat.com";
  const token = process.env.LPP_GATEWAY_TOKEN;
  if (!token) {
    throw new Error("Set LPP_GATEWAY_TOKEN before running --live-gateway.");
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(async ({ baseUrl, token }) => {
      const signalr = await import("/node_modules/.vite/deps/@microsoft_signalr.js");
      const url = `${baseUrl.replace(/\/$/, "")}/ws/client?deviceId=quality-gate&clientInstanceId=quality-gate&clientPlatform=pc`;
      const connection = new signalr.HubConnectionBuilder()
        .withUrl(url, {
          accessTokenFactory: () => token,
          withCredentials: false,
        })
        .build();
      try {
        await connection.start();
        return { ok: true, state: connection.state };
      } catch (error) {
        return { ok: false, error: String(error) };
      } finally {
        await connection.stop().catch(() => undefined);
      }
    }, { baseUrl, token });
    if (!result.ok || result.state !== "Connected") {
      throw new Error(`Live gateway smoke failed: ${JSON.stringify(result)}`);
    }
  } finally {
    await browser.close();
  }
}

function readTrackedSource(roots) {
  const output = [];
  for (const root of roots) {
    output.push(...listFiles(join(repoRoot, root)).map((file) => readFileSync(file, "utf8")));
  }
  return output.join("\n");
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    if (!statSync(path).isFile()) return [];
    if (!/\.(ts|tsx|cts|mjs|js)$/.test(entry.name)) return [];
    return [path];
  });
}

function readText(file) {
  return readFileSync(join(repoRoot, file), "utf8");
}

function npmCommand() {
  return "npm";
}

function npxCommand() {
  return "npx";
}

function spawnCommand(command, args) {
  if (process.platform !== "win32") return { command, args };
  const executable = command === "npm" ? "npm.cmd" : command === "npx" ? "npx.cmd" : command;
  return {
    command: "cmd.exe",
    args: ["/c", executable, ...args],
  };
}
