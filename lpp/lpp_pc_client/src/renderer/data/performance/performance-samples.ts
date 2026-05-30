import type { DiagnosticsJsonValue, DiagnosticsPayload } from "../../../shared/desktop-api";
import { startupPerformanceBudgets } from "./startup-performance";

export interface PerformanceSample {
  metric: string;
  durationMs: number;
  generatedAt?: string;
  platform?: string;
  source: string;
}

export interface PerformanceSampleSummary {
  metric: string;
  count: number;
  minMs: number;
  p50Ms: number;
  p75Ms: number;
  p95Ms: number;
  maxMs: number;
  budgetMs?: number;
  status: "ok" | "warning";
}

export const defaultPerformanceBudgets: Record<string, number> = {
  "startup.first-interactive": startupPerformanceBudgets.firstInteractiveMs,
  "startup.renderer-entry": startupPerformanceBudgets.rendererEntryMs,
};

export function extractPerformanceSamples(
  payloads: DiagnosticsPayload[],
): PerformanceSample[] {
  return payloads.flatMap((payload, payloadIndex) => {
    const platform = runtimePlatform(payload);
    const startupRecords = payload.diagnostics?.startup?.records ?? [];
    return startupRecords.flatMap((record, recordIndex) => {
      const fields = asRecord(record);
      const durationMs = numericField(fields.durationMs);
      if (durationMs === undefined) return [];
      return [
        {
          metric: stringField(fields.event) || "startup.unknown",
          durationMs,
          generatedAt: payload.generatedAt,
          platform,
          source: `${payload.traceId || "diagnostics"}:${payloadIndex}:${recordIndex}`,
        },
      ];
    });
  });
}

export function summarizePerformanceSamples(
  samples: PerformanceSample[],
  budgets: Record<string, number | undefined> = defaultPerformanceBudgets,
): PerformanceSampleSummary[] {
  const grouped = new Map<string, PerformanceSample[]>();
  for (const sample of samples) {
    const group = grouped.get(sample.metric) ?? [];
    group.push(sample);
    grouped.set(sample.metric, group);
  }

  return Array.from(grouped.entries())
    .map(([metric, group]) => summarizeMetric(metric, group, budgets[metric]))
    .sort((left, right) => left.metric.localeCompare(right.metric));
}

export function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function summarizeMetric(
  metric: string,
  samples: PerformanceSample[],
  budgetMs: number | undefined,
): PerformanceSampleSummary {
  const durations = samples.map((sample) => sample.durationMs);
  const maxMs = Math.max(...durations);
  const p75Ms = percentile(durations, 75);
  const p95Ms = percentile(durations, 95);
  return {
    metric,
    count: durations.length,
    minMs: Math.min(...durations),
    p50Ms: percentile(durations, 50),
    p75Ms,
    p95Ms,
    maxMs,
    budgetMs,
    status: budgetMs === undefined || p75Ms <= budgetMs ? "ok" : "warning",
  };
}

function runtimePlatform(payload: DiagnosticsPayload) {
  const runtimeRecord = payload.diagnostics?.runtime?.records?.[0];
  const fields = asRecord(runtimeRecord);
  return stringField(fields.platform);
}

function asRecord(value: DiagnosticsJsonValue | undefined): Record<string, DiagnosticsJsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, DiagnosticsJsonValue>
    : {};
}

function numericField(value: DiagnosticsJsonValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringField(value: DiagnosticsJsonValue | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
