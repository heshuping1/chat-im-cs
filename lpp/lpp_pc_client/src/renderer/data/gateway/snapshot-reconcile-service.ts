export type SnapshotReconcileOwner = "im" | "customerService";

export type SnapshotReconcileDecision =
  | "accept-strong"
  | "merge-weak"
  | "reject-strong";

export type SnapshotReconcileReason =
  | "newer-snapshot"
  | "same-seq-weak-merge"
  | "stale-snapshot-rejected"
  | "seq-missing-weak-only";

export interface SnapshotReconcileInput {
  incomingSeq?: number | null;
  localSeq?: number | null;
  owner: SnapshotReconcileOwner;
  scopeKey: string;
  source: "conversation-snapshot" | "workbench-snapshot" | "detail" | "history" | "tempSession";
  targetId: string;
}

export interface SnapshotReconcileResult {
  canUpdateStrongFields: boolean;
  canMergeWeakFields: boolean;
  decision: SnapshotReconcileDecision;
  incomingSeq?: number;
  localSeq?: number;
  owner: SnapshotReconcileOwner;
  reason: SnapshotReconcileReason;
  scopeKey: string;
  source: SnapshotReconcileInput["source"];
  targetId: string;
}

export function reconcileSnapshot(input: SnapshotReconcileInput): SnapshotReconcileResult {
  const incomingSeq = normalizeSeq(input.incomingSeq);
  const localSeq = normalizeSeq(input.localSeq) ?? 0;
  const base = {
    incomingSeq,
    localSeq,
    owner: input.owner,
    scopeKey: input.scopeKey,
    source: input.source,
    targetId: input.targetId,
  };

  if (incomingSeq === undefined) {
    return {
      ...base,
      canMergeWeakFields: true,
      canUpdateStrongFields: false,
      decision: "merge-weak",
      reason: "seq-missing-weak-only",
    };
  }

  if (incomingSeq > localSeq) {
    return {
      ...base,
      canMergeWeakFields: true,
      canUpdateStrongFields: true,
      decision: "accept-strong",
      reason: "newer-snapshot",
    };
  }

  if (incomingSeq === localSeq) {
    return {
      ...base,
      canMergeWeakFields: true,
      canUpdateStrongFields: false,
      decision: "merge-weak",
      reason: "same-seq-weak-merge",
    };
  }

  return {
    ...base,
    canMergeWeakFields: true,
    canUpdateStrongFields: false,
    decision: "reject-strong",
    reason: "stale-snapshot-rejected",
  };
}

function normalizeSeq(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
}
