import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const refactorDir = join(repoRoot, "docs/refactor");
const patterns = [
  { label: "pending-status", regex: /待开始|待处理|进行中/g },
  { label: "temporary-wording", regex: /暂未|TODO|FIXME/g },
  { label: "legacy-reference", regex: /旧版|历史参考|历史规格/g },
];

const files = listMarkdownFiles(refactorDir);
const rows = files.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return patterns.flatMap(({ label, regex }) => {
    const count = text
      .split(/\r?\n/)
      .filter((line) => !isSelfDescribingSignalLine(line))
      .reduce((total, line) => total + Array.from(line.matchAll(regex)).length, 0);
    return count > 0 ? [{ file: relative(repoRoot, file), label, count }] : [];
  });
});

if (rows.length === 0) {
  console.log("refactor doc garden: no stale signals");
} else {
  const activeRows = rows.filter((row) => !row.file.includes("/validation/"));
  const archiveRows = rows.filter((row) => row.file.includes("/validation/"));
  if (activeRows.length === 0) {
    console.log("refactor doc garden active signals: none");
  } else {
    console.log("refactor doc garden active signals:");
    activeRows
      .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
      .forEach((row) => {
        console.log(`- ${row.file} [${row.label}] ${row.count}`);
      });
  }
  if (archiveRows.length > 0) {
    const archiveSummary = archiveRows.reduce((summary, row) => {
      summary.count += row.count;
      summary.files.add(row.file);
      return summary;
    }, { count: 0, files: new Set() });
    console.log(
      `refactor doc garden archived validation signals: ${archiveSummary.count} matches across ${archiveSummary.files.size} files`,
    );
  }
}

function listMarkdownFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listMarkdownFiles(filePath);
    return filePath.endsWith(".md") ? [filePath] : [];
  });
}

function isSelfDescribingSignalLine(line) {
  return (
    line.includes("docs:garden") ||
    /^\|\s*`?(待开始|进行中|待处理)`?\s*\|/.test(line) ||
    line.includes("队列、进行中、历史")
  );
}
