import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AuthSession } from "../../src/renderer/data/auth/auth-session";
import { pcQueryKeys } from "../../src/renderer/data/query-keys";

const session = {
  apiBaseUrl: "https://api.example.test",
  platformUserId: "platform-user-1",
  spaceType: 1,
  tenantId: "tenant-1",
  tenantToken: "token-1",
  userId: "user-1",
} as AuthSession;

describe("IM message query scope", () => {
  it("uses the same session-scoped message key for read and write paths", () => {
    expect(pcQueryKeys.imMessagesForSession(session, "direct", "c1")).toEqual([
      "pc-im-messages",
      "workspace|https://api.example.test|personal|tenant-1|user-1|platform-user-1",
      "direct",
      "c1",
    ]);
  });

  it("keeps another workspace isolated even when conversation id matches", () => {
    const other = { ...session, tenantId: "tenant-2", userId: "user-2" } as AuthSession;

    expect(pcQueryKeys.imMessagesForSession(session, "direct", "c1")).not.toEqual(
      pcQueryKeys.imMessagesForSession(other, "direct", "c1"),
    );
  });

  it("does not use token-scoped imMessages in runtime message read and mutation paths", () => {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const runtimeFiles = [
      "src/renderer/messages/hooks/useActiveImConversationQueries.ts",
      "src/renderer/messages/models/messageCacheMutationModel.ts",
    ];

    const offenders = runtimeFiles.filter((relativePath) =>
      fs.readFileSync(path.join(repoRoot, relativePath), "utf8").includes("pcQueryKeys.imMessages("),
    );

    expect(offenders).toEqual([]);
  });
});
