import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const roots = ["src/main", "src/preload", "src/shared", "src/renderer"];
const sourceExtensions = new Set([".ts", ".tsx", ".cts", ".css"]);
const ledgerPath = "docs/refactor/PC端P19文件职责与AI上下文治理清单.md";
const ledger = existsSync(join(repoRoot, ledgerPath))
  ? readFileSync(join(repoRoot, ledgerPath), "utf8")
  : "";

const rows = roots
  .flatMap((root) => listFiles(join(repoRoot, root)))
  .map((file) => {
    const relativeFile = relative(repoRoot, file);
    const kind = classify(relativeFile);
    const lines = lineCount(readFileSync(file, "utf8"));
    return {
      file: relativeFile,
      kind,
      lines,
      threshold: reviewThreshold(kind),
    };
  })
  .sort((left, right) => right.lines - left.lines);

const reviewRows = rows.filter((row) => row.threshold > 0 && row.lines >= row.threshold);
const splitCandidates = reviewRows.filter(
  (row) => !isDocumented(row.file) && row.kind !== "pure-types-config",
);
const undocumentedRows = reviewRows.filter((row) => !isDocumented(row.file));

printSection(
  "ai-context-review-files",
  reviewRows.map(formatReviewRow),
);
printSection(
  "ai-context-split-candidates",
  splitCandidates.map(formatReviewRow),
);
printSection("ai-context-over-split-signals", findOverSplitSignals(rows));

if (!ledger) {
  console.error(`Missing ${ledgerPath}`);
  process.exit(1);
}

if (undocumentedRows.length > 0) {
  console.error(
    [
      "P19 context ledger is missing review rows:",
      ...undocumentedRows.map((row) => `- ${row.file} lines=${row.lines} kind=${row.kind}`),
    ].join("\n"),
  );
  process.exit(1);
}

function listFiles(dir) {
  if (!statSafe(dir)?.isDirectory()) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSafe(fullPath);
    if (!stat) return [];
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "release") return [];
      return listFiles(fullPath);
    }
    return sourceExtensions.has(extname(entry)) ? [fullPath] : [];
  });
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function classify(file) {
  if (file.endsWith(".css")) return "css";
  if (/\/hooks\//.test(file) || /Controller\.(ts|tsx)$/.test(file)) return "hook-controller";
  if (/\/models\//.test(file) || /\/domain\//.test(file) || /-model\.(ts|tsx)$/.test(file)) {
    return "model-domain";
  }
  if (isPureTypesOrConfig(file)) return "pure-types-config";
  if (/^src\/renderer\/data\//.test(file)) return "data-api-cache";
  if (/^src\/(main|preload)\//.test(file) || /\/runtime\//.test(file)) {
    return "main-preload-runtime";
  }
  if (isPageFile(file)) return "page";
  if (file.endsWith(".tsx") && /^src\/renderer\//.test(file)) return "component";
  return "other";
}

function isPureTypesOrConfig(file) {
  const name = basename(file);
  return (
    /^types\.(ts|tsx)$/.test(name) ||
    /-types\.(ts|tsx)$/.test(name) ||
    /config\.(ts|tsx)$/.test(name) ||
    /-config\.(ts|tsx)$/.test(name) ||
    /static-config\.(ts|tsx)$/.test(name)
  );
}

function isPageFile(file) {
  const name = basename(file);
  return (
    /Page\.tsx$/.test(name) ||
    /Workspace\.tsx$/.test(name) ||
    name === "App.tsx" ||
    name === "MessageCenter.tsx" ||
    name === "Sidebar.tsx"
  );
}

function reviewThreshold(kind) {
  return {
    page: 600,
    component: 500,
    "hook-controller": 400,
    "model-domain": 500,
    "data-api-cache": 550,
    "main-preload-runtime": 500,
    css: 1600,
    "pure-types-config": 700,
    other: 0,
  }[kind];
}

function lineCount(source) {
  if (!source) return 0;
  return source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length;
}

function isDocumented(file) {
  return ledger.includes(`\`${file}\``);
}

function formatReviewRow(row) {
  const documented = isDocumented(row.file) ? "documented=yes" : "documented=no";
  return `${row.file} lines=${row.lines} kind=${row.kind} threshold=${row.threshold} ${documented}`;
}

function findOverSplitSignals(allRows) {
  const tinyRuntimeRows = allRows
    .filter((row) => row.lines > 0 && row.lines <= 25)
    .filter((row) => row.kind !== "pure-types-config")
    .filter((row) => !row.file.endsWith(".css"))
    .filter((row) => !row.file.includes("/tests/"))
    .map((row) => `${row.file} lines=${row.lines} kind=${row.kind}`);
  return tinyRuntimeRows.length > 0 ? tinyRuntimeRows : ["none"];
}

function printSection(title, sectionRows) {
  console.log(`## ${title}`);
  if (sectionRows.length === 0) {
    console.log("none");
    return;
  }
  for (const row of sectionRows) console.log(row);
}
