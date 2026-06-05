import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("message P1 service API source", () => {
  const endpoints = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/endpoints.ts"),
    "utf8",
  );
  const messagesClient = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/messages-client.ts"),
    "utf8",
  );
  const conversationActionsHook = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageConversationActions.ts"),
    "utf8",
  );
  const actionMutationsHook = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageActionMutations.ts"),
    "utf8",
  );

  it("declares conversation persistence endpoints and methods", () => {
    [
      "conversationPin",
      "conversationMute",
      "conversationVisibility",
    ].forEach((key) => expect(endpoints).toContain(key));
    [
      "setConversationPinned",
      "setConversationMuted",
      "setConversationVisibility",
    ].forEach((method) => expect(messagesClient).toContain(method));
    expect(conversationActionsHook).toContain("useMessageConversationActions");
  });

  it("declares batch message endpoints and uses them in multi-message actions", () => {
    ["messageBatchDelete", "messageBatchForward"].forEach((key) => expect(endpoints).toContain(key));
    ["batchDeleteMessages", "batchForwardMessages"].forEach((method) => expect(messagesClient).toContain(method));
    expect(actionMutationsHook).toContain("client.batchForwardMessages");
    expect(actionMutationsHook).toContain("batchDeleteMessages");
  });
});
