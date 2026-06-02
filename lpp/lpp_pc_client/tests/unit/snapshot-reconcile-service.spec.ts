import { describe, expect, it } from "vitest";

import { reconcileSnapshot } from "../../src/renderer/data/gateway/snapshot-reconcile-service";

describe("SnapshotReconcileService", () => {
  it("accepts strong fields only when snapshot seq is newer than local push seq", () => {
    expect(
      reconcileSnapshot({
        incomingSeq: 105,
        localSeq: 104,
        owner: "im",
        scopeKey: "scope-a",
        source: "conversation-snapshot",
        targetId: "direct-1",
      }),
    ).toMatchObject({
      canMergeWeakFields: true,
      canUpdateStrongFields: true,
      decision: "accept-strong",
      reason: "newer-snapshot",
    });
  });

  it("keeps strong fields when snapshot seq equals local seq", () => {
    expect(
      reconcileSnapshot({
        incomingSeq: 105,
        localSeq: 105,
        owner: "im",
        scopeKey: "scope-a",
        source: "conversation-snapshot",
        targetId: "direct-1",
      }),
    ).toMatchObject({
      canMergeWeakFields: true,
      canUpdateStrongFields: false,
      decision: "merge-weak",
      reason: "same-seq-weak-merge",
    });
  });

  it("rejects stale strong fields when snapshot seq is older than local push seq", () => {
    expect(
      reconcileSnapshot({
        incomingSeq: 104,
        localSeq: 105,
        owner: "customerService",
        scopeKey: "scope-a",
        source: "workbench-snapshot",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      canMergeWeakFields: true,
      canUpdateStrongFields: false,
      decision: "reject-strong",
      reason: "stale-snapshot-rejected",
    });
  });

  it("only merges weak fields when seq is missing", () => {
    expect(
      reconcileSnapshot({
        incomingSeq: undefined,
        localSeq: 105,
        owner: "customerService",
        scopeKey: "scope-a",
        source: "tempSession",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      canMergeWeakFields: true,
      canUpdateStrongFields: false,
      decision: "merge-weak",
      reason: "seq-missing-weak-only",
    });
  });
});
