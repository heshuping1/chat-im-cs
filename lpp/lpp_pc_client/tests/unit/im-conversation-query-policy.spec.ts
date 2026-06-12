import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { realtimeSyncPolicy } from "../../src/renderer/data/realtime/realtime-sync-policy";

const root = process.cwd();

describe("IM conversation query policy", () => {
  it("uses push-first fallback intervals for conversation and message queries", () => {
    expect(realtimeSyncPolicy.im.conversationListFallbackPollMs).toBe(60_000);
    expect(realtimeSyncPolicy.im.conversationListRefetchInBackground).toBe(false);
    expect(realtimeSyncPolicy.im.activeMessagesFallbackPollMs).toBe(60_000);
    expect(realtimeSyncPolicy.im.directReadStatusFallbackPollMs).toBe(30_000);
  });

  it("routes Sidebar and MessageCenter through the shared IM conversation query hook", () => {
    const sidebarSource = readSource("src/renderer/components/Sidebar.tsx");
    const messageCenterSource = readSource("src/renderer/components/MessageCenter.tsx");
    const hookSource = readSource("src/renderer/messages/hooks/useImConversationsQuery.ts");
    const contactsSource = readSource(
      "src/renderer/contacts/hooks/useContactsDirectoryController.ts",
    );

    expect(sidebarSource).toContain("useImConversationsQuery(authSession)");
    expect(messageCenterSource).toContain("useImConversationsQuery(session)");
    expect(contactsSource).toContain("pcQueryKeys.imConversationsForSession(session)");
    expect(contactsSource).not.toContain(
      "pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken)",
    );
    expect(hookSource).toContain("realtimeSyncPolicy.im.conversationListFallbackPollMs");
    expect(hookSource).toContain("pcQueryKeys.imConversationsForSession(session)");
  });
});

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}
