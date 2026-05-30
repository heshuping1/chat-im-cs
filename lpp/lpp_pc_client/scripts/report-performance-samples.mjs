import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error("Usage: npm run perf:samples -- <diagnostics.json|directory> [...]");
  process.exit(1);
}

const payloads = paths.flatMap(readDiagnosticsPath);
const samples = extractSamples(payloads);
const summaries = summarize(samples);

if (summaries.length === 0) {
  console.log("No performance samples found.");
} else {
  console.log("metric,count,min,p50,p75,p95,max,budget,status");
  summaries.forEach((item) => {
    console.log([
      item.metric,
      item.count,
      item.minMs,
      item.p50Ms,
      item.p75Ms,
      item.p95Ms,
      item.maxMs,
      item.budgetMs ?? "",
      item.status,
    ].join(","));
  });
}

function readDiagnosticsPath(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    return ["lpp-diagnostics.json", "diagnostics.json"]
      .map((name) => join(path, name))
      .flatMap((file) => {
        try {
          return readDiagnosticsFile(file);
        } catch {
          return [];
        }
      });
  }
  return readDiagnosticsFile(path);
}

function readDiagnosticsFile(path) {
  const text = readFileSync(path, "utf8");
  if (path.endsWith(".jsonl")) {
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed];
  throw new Error(`Unsupported diagnostics file: ${basename(path)}`);
}

function extractSamples(payloads) {
  return payloads.flatMap((payload, payloadIndex) => {
    const platform = payload?.diagnostics?.runtime?.records?.[0]?.platform;
    const records = payload?.diagnostics?.startup?.records;
    if (!Array.isArray(records)) return [];
    return records.flatMap((record, recordIndex) => {
      if (typeof record?.durationMs !== "number") return [];
      return [{
        metric: typeof record.event === "string" ? record.event : "startup.unknown",
        durationMs: record.durationMs,
        generatedAt: payload.generatedAt,
        platform,
        source: `${payload.traceId || "diagnostics"}:${payloadIndex}:${recordIndex}`,
      }];
    });
  });
}

function summarize(samples) {
  const budgets = {
    "startup.first-interactive": 2500,
    "startup.renderer-entry": 800,
  };
  const grouped = new Map();
  samples.forEach((sample) => {
    const group = grouped.get(sample.metric) ?? [];
    group.push(sample.durationMs);
    grouped.set(sample.metric, group);
  });
  return [...grouped.entries()].map(([metric, values]) => {
    const sorted = [...values].sort((left, right) => left - right);
    const budgetMs = budgets[metric];
    const p75Ms = percentile(sorted, 75);
    return {
      metric,
      count: sorted.length,
      minMs: sorted[0],
      p50Ms: percentile(sorted, 50),
      p75Ms,
      p95Ms: percentile(sorted, 95),
      maxMs: sorted.at(-1),
      budgetMs,
      status: budgetMs === undefined || p75Ms <= budgetMs ? "ok" : "warning",
    };
  }).sort((left, right) => left.metric.localeCompare(right.metric));
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1),
  );
  return sortedValues[index];
}
