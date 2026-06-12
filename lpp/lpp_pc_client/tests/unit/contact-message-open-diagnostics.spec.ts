import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  contactMessageOpenTraceForConversation,
  createContactMessageOpenTrace,
  rememberContactMessageOpenTrace,
} from "../../src/renderer/data/diagnostics/contact-message-open-diagnostics";

const root = process.cwd();

describe("contact message open diagnostics", () => {
  it("remembers the contact-open trace by target conversation", () => {
    const trace = createContactMessageOpenTrace("contact-1");
    rememberContactMessageOpenTrace("conversation-1", trace);

    expect(contactMessageOpenTraceForConversation("conversation-1")).toMatchObject({
      contactId: "contact-1",
      targetConversationId: "conversation-1",
      traceId: trace.traceId,
    });
  });

  it("starts the trace at the ContactsPage click boundary", () => {
    const source = readSource("src/renderer/components/ContactsPage.tsx");

    expect(source).toContain("createContactMessageOpenTrace(contact.id)");
    expect(source).toContain("\"contacts.message-click\"");
    expect(source).toContain("openMessage(contact, trace)");
  });

  it("records controller phases for known and created direct conversations", () => {
    const source = readSource("src/renderer/contacts/hooks/useContactsDirectoryController.ts");

    expect(source).toContain("\"openMessage.enter\"");
    expect(source).toContain("\"known-conversation.route-start\"");
    expect(source).toContain("\"create-direct.mutate-start\"");
    expect(source).toContain("\"create-direct.success\"");
    expect(source).toContain("\"create-direct.error\"");
    expect(source).toContain("\"set-active.before\"");
    expect(source).toContain("\"set-active.after\"");
    expect(source).toContain("\"im.conversation-cache.upsert-start\"");
    expect(source).toContain("\"im.conversation-cache.invalidate-background-start\"");
  });

  it("records workspace store active-conversation state changes and no-ops", () => {
    const source = readSource("src/renderer/data/workspace-ui/workspace-store-core.ts");

    expect(source).toContain("event: 'workspace.im.set-active'");
    expect(source).toContain("phase: noOp ? 'no-op' : 'state-change'");
    expect(source).toContain("previousActiveConversationId");
    expect(source).toContain("nextActiveConversationId");
  });

  it("records MessageCenter route, active-conversation resolution and first pane visibility", () => {
    const source = readSource("src/renderer/components/MessageCenter.tsx");

    expect(source).toContain("\"message-center.route-observed\"");
    expect(source).toContain("\"message-center.active-conversation.resolve\"");
    expect(source).toContain("\"message-center.first-pane-visible\"");
    expect(source).toContain("contactMessageOpenTraceForConversation(activeConversationId)");
  });
});

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}
