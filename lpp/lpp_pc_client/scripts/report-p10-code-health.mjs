import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const repoRoot = process.cwd();
const sourceRoots = ["src/renderer", "src/shared", "src/main", "src/preload"];
const sourceExtensions = new Set([".ts", ".tsx", ".cts"]);
const files = sourceRoots.flatMap((root) => listSourceFiles(join(repoRoot, root)));
const relativeFiles = files.map((file) => relative(repoRoot, file));
const importGraph = buildImportGraph(files);

const sourceTextByFile = new Map(
  files.map((file) => [relative(repoRoot, file), readFileSync(file, "utf8")]),
);

printSection("large-files", largeFiles());
printSection("orphan-source-candidates", orphanSourceCandidates());
printSection("compat-store-imports", compatStoreImports());
printSection("public-ability-signals", publicAbilitySignals());
printSection("date-format-signals", dateFormatSignals());
printSection("type-escape-signals", patternRows(/\bas any\b|:\s*any\b/g));
printSection("global-css-signals", globalCssSignals());
printSection("tracked-generated-artifacts", trackedGeneratedArtifacts());

function largeFiles() {
  return relativeFiles
    .map((file) => ({
      file,
      lines: lineCount(sourceTextByFile.get(file) ?? ""),
      threshold: file.endsWith(".css") ? 2000 : 800,
    }))
    .filter((row) => row.lines >= row.threshold)
    .sort((left, right) => right.lines - left.lines)
    .map((row) => `${row.file} lines=${row.lines} threshold=${row.threshold}`);
}

function orphanSourceCandidates() {
  const inbound = new Map(relativeFiles.map((file) => [file, 0]));
  for (const imports of importGraph.values()) {
    for (const imported of imports) {
      inbound.set(imported, (inbound.get(imported) ?? 0) + 1);
    }
  }

  const entrypoints = new Set([
    "src/main/main.ts",
    "src/renderer/main.tsx",
    "src/renderer/vite-env.d.ts",
    "src/preload/preload.cts",
    "src/preload/screenshot-selector-preload.cts",
  ]);
  const generatedOrAmbient = (file) => file.endsWith(".d.ts");

  return [...inbound.entries()]
    .filter(([file, count]) => count === 0 && !entrypoints.has(file) && !generatedOrAmbient(file))
    .filter(([file]) => !file.includes("/diagnostics/"))
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 80)
    .map(([file]) => file);
}

function compatStoreImports() {
  return files.flatMap((file) => {
    const relativeFile = relative(repoRoot, file);
    const imports = importsOf(file)
      .map((specifier) => resolveImport(file, specifier))
      .filter(Boolean)
      .map((resolved) => relative(repoRoot, resolved));

    if (!imports.includes("src/renderer/data/store.ts")) return [];
    if (/^src\/renderer\/data\/(auth|settings|workspace-ui|im-read|reminder)\//.test(relativeFile)) {
      return [`${relativeFile} imports backing store as owner facade`];
    }
    return [`${relativeFile} imports backing store directly`];
  });
}

function publicAbilitySignals() {
  const checks = [
    {
      label: "local PanelState definition",
      regex: /\bfunction\s+PanelState\b|\bconst\s+PanelState\s*=/g,
      allow: new Set(["src/renderer/components/PanelState.tsx"]),
    },
    {
      label: "manual avatar initial",
      regex: /\bavatarInitial\b|\binitials\b|fallback.*avatar|avatar.*fallback/gi,
      allow: new Set(["src/renderer/components/PcAvatar.tsx"]),
    },
    {
      label: "direct desktop media action",
      regex: /window\.desktopApi\?\.(copyMediaFile|saveMediaAs|openMediaFile|revealMediaInFolder|editMediaFile)/g,
      allow: new Set([
        "src/main/video-player-window.ts",
        "src/main/video-player-template.ts",
        "src/renderer/media/runtime/desktopMediaActions.ts",
        "src/renderer/media/runtime/imagePrecache.ts",
        "src/renderer/media/runtime/videoPosterRuntime.ts",
        "src/renderer/media/runtime/videoPlayer.ts",
      ]),
    },
    {
      label: "direct Notification construction",
      regex: /\bnew\s+(window\.)?Notification\b/g,
      allow: new Set([
        "src/main/desktop-notification.ts",
        "src/main/main.ts",
        "src/renderer/data/reminder/reminder-service.ts",
      ]),
    },
    {
      label: "direct diagnostic console",
      regex: /console\.(debug|info|warn|error)\(/g,
      allowPattern: /diagnostics|send-state-machine|startup-performance|cs-thread-state|cs-cache-adapter|scripts\//,
    },
  ];

  return checks.flatMap((check) =>
    [...sourceTextByFile.entries()].flatMap(([file, source]) => {
      if (check.allow?.has(file)) return [];
      if (check.allowPattern?.test(file)) return [];
      const matches = [...source.matchAll(check.regex)];
      if (matches.length === 0) return [];
      return [`${file} ${check.label} count=${matches.length}`];
    }),
  );
}

function patternRows(regex) {
  return [...sourceTextByFile.entries()]
    .flatMap(([file, source]) => {
      const matches = [...source.matchAll(regex)];
      return matches.length ? [`${file} count=${matches.length}`] : [];
    })
    .sort();
}

function dateFormatSignals() {
  const guardedRoots = [
    "src/renderer/components/",
    "src/renderer/customer-service/",
    "src/renderer/messages/",
    "src/renderer/settings/",
  ];
  const allowedFiles = new Set([
    "src/renderer/lib/format.ts",
    "src/renderer/data/api/types.ts",
  ]);
  const regex = /\bnew\s+Date\(|\.toLocale(?:Date|Time|String)\(|\bIntl\.DateTimeFormat\b/g;
  return [...sourceTextByFile.entries()]
    .filter(([file]) => guardedRoots.some((root) => file.startsWith(root)))
    .filter(([file]) => !allowedFiles.has(file))
    .flatMap(([file, source]) => {
      const matches = [...source.matchAll(regex)];
      return matches.length ? [`${file} display date-format candidate count=${matches.length}`] : [];
    })
    .sort();
}

function globalCssSignals() {
  const cssThresholds = new Map([
    ["src/renderer/styles/app.css", 2000],
    ["src/renderer/styles/messages/message-center.css", 2000],
  ]);
  const cssFiles = [...cssThresholds.keys()]
    .filter((file) => existsSync(join(repoRoot, file)))
    .map((file) => ({
      file,
      lines: lineCount(readFileSync(join(repoRoot, file), "utf8")),
      threshold: cssThresholds.get(file) ?? 2000,
    }));
  return cssFiles
    .filter((row) => row.lines >= row.threshold)
    .map((row) => `${row.file} lines=${row.lines} threshold=${row.threshold}`);
}

function trackedGeneratedArtifacts() {
  const generatedPathPatterns = [
    /^dist\//,
    /^release\//,
    /^coverage\//,
    /^playwright-report\//,
    /^test-results\//,
    /\/coverage\//,
    /\/playwright-report\//,
    /\/test-results\//,
  ];
  return gitTrackedFiles()
    .filter((file) => existsSync(join(repoRoot, file)))
    .filter((file) => generatedPathPatterns.some((pattern) => pattern.test(file)))
    .sort();
}

function printSection(label, rows) {
  console.log(`## ${label}`);
  if (rows.length === 0) {
    console.log("none");
    return;
  }
  rows.forEach((row) => console.log(`- ${row}`));
}

function buildImportGraph(sourceFiles) {
  const graph = new Map();
  for (const file of sourceFiles) {
    const imports = importsOf(file)
      .map((specifier) => resolveImport(file, specifier))
      .filter(Boolean)
      .map((resolved) => relative(repoRoot, resolved));
    graph.set(relative(repoRoot, file), imports);
  }
  return graph;
}

function importsOf(file) {
  const source = readFileSync(file, "utf8");
  const imports = new Set();
  for (const match of source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    imports.add(match[1]);
  }
  for (const match of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  for (const match of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.add(match[1]);
  }
  return [...imports];
}

function resolveImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(file), specifier);
  const candidates = [
    base,
    base.endsWith(".js") ? `${base.slice(0, -3)}.ts` : null,
    base.endsWith(".js") ? `${base.slice(0, -3)}.tsx` : null,
    base.endsWith(".cjs") ? `${base.slice(0, -4)}.cts` : null,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.cts`,
    `${base}.js`,
    `${base}.jsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listSourceFiles(filePath);
    return sourceExtensions.has(extname(filePath)) ? [normalize(filePath)] : [];
  });
}

function lineCount(source) {
  return source.split("\n").length;
}

function gitTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
