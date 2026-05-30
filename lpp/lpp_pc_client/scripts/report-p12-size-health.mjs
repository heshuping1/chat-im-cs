import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const roots = ["src/main", "src/preload", "src/shared", "src/renderer"];
const extensions = new Set([".ts", ".tsx", ".cts", ".css"]);

const files = roots.flatMap((root) => listFiles(join(repoRoot, root)));
const rows = files
  .map((file) => {
    const relativeFile = relative(repoRoot, file);
    const lines = lineCount(readFileSync(file, "utf8"));
    return {
      file: relativeFile,
      lines,
      kind: classify(relativeFile),
    };
  })
  .sort((left, right) => right.lines - left.lines);

printSection(
  "css-large-files",
  rows
    .filter((row) => row.kind === "css" && row.lines >= 2000)
    .map(formatRow),
);
printSection(
  "component-edge-files",
  rows
    .filter((row) => row.kind === "component" && row.lines >= 700)
    .map(formatRow),
);
printSection(
  "data-main-edge-files",
  rows
    .filter((row) => row.kind === "data-main" && row.lines >= 450)
    .map(formatRow),
);

function listFiles(dir) {
  if (!statSafe(dir)?.isDirectory()) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSafe(fullPath);
    if (!stat) return [];
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") return [];
      return listFiles(fullPath);
    }
    return extensions.has(extname(entry)) ? [fullPath] : [];
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
  if (/^src\/renderer\/components\/.*\.tsx$/.test(file)) return "component";
  if (/^src\/(main|preload|shared|renderer\/data)\//.test(file)) return "data-main";
  return "other";
}

function lineCount(source) {
  if (!source) return 0;
  return source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length;
}

function formatRow(row) {
  return `${row.file} lines=${row.lines}`;
}

function printSection(title, sectionRows) {
  console.log(`## ${title}`);
  if (sectionRows.length === 0) {
    console.log("none");
    return;
  }
  for (const row of sectionRows) console.log(row);
}
