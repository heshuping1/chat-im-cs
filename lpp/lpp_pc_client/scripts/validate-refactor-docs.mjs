import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const refactorDir = join(repoRoot, "docs/refactor");
const validationDir = join(refactorDir, "validation");
const adrDir = join(refactorDir, "adr");
const validStatuses = new Set(["待开始", "进行中", "已完成", "已缓解", "待处理"]);
const requiredDocs = [
  "AGENTS.md",
  "docs/refactor/README.md",
  "docs/refactor/PC端核心架构技术方案.md",
  "docs/refactor/PC端重构任务矩阵.md",
  "docs/refactor/PC端核心覆盖率目标.md",
  "docs/refactor/validation/README.md",
  "docs/refactor/adr/README.md",
];

const failures = [
  ...requiredDocs.flatMap((file) => (existsSync(join(repoRoot, file)) ? [] : [`Missing ${file}`])),
  ...validateReadme(),
  ...validateTaskMatrix(),
  ...validateAdrs(),
];

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("refactor docs ok");

function validateReadme() {
  const readme = readText("docs/refactor/README.md");
  return requiredDocs
    .filter((file) => file.startsWith("docs/refactor/") && file.endsWith(".md"))
    .flatMap((file) => {
      const basename = file.replace("docs/refactor/", "");
      return readme.includes(basename) ? [] : [`README does not link ${basename}`];
    });
}

function validateTaskMatrix() {
  const matrix = readText("docs/refactor/PC端重构任务矩阵.md");
  const validationFiles = readdirSync(validationDir);
  const failures = [];

  for (const line of matrix.split("\n")) {
    const match = line.match(/^\|\s*(P\d-[A-Z]+-\d{3}[A-Z]?)\s*\|.*\|\s*([^|]+)\s*\|$/);
    if (!match) continue;
    const [, taskId, rawStatus] = match;
    const status = rawStatus.trim();
    if (!validStatuses.has(status)) failures.push(`${taskId} has invalid status ${status}`);
    if (status === "已完成") {
      const validationPrefix = taskId.replace(/[A-Z]$/, "");
      const hasValidation = validationFiles.some((file) => file.startsWith(validationPrefix));
      if (!hasValidation) failures.push(`${taskId} is completed but has no validation record`);
    }
  }

  return failures;
}

function validateAdrs() {
  const adrFiles = readdirSync(adrDir)
    .filter((file) => /^ADR-\d{4}-.+\.md$/.test(file))
    .sort();
  return adrFiles.flatMap((file, index) => {
    const expected = `ADR-${String(index + 1).padStart(4, "0")}-`;
    const text = readFileSync(join(adrDir, file), "utf8");
    const requiredSections = [
      "## Status",
      "## Date",
      "## Related Tasks",
      "## Context",
      "## Decision",
      "## Alternatives Considered",
      "## Consequences",
      "## Validation",
    ];
    return [
      ...(file.startsWith(expected) ? [] : [`ADR sequence gap around ${file}`]),
      ...requiredSections.flatMap((section) =>
        text.includes(section) ? [] : [`${file} is missing ${section}`],
      ),
    ];
  });
}

function readText(file) {
  return readFileSync(join(repoRoot, file), "utf8");
}
