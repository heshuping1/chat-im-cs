import { describe, expect, it } from "vitest";

import { createChatSendRuntime } from "../../src/renderer/data/send/chat-send-runtime";
import {
  createMemorySendOutboxStorage,
  sendOutboxScopeKey,
} from "../../src/renderer/data/send/send-outbox";

const session = {
  apiBaseUrl: "https://api.example",
  tenantId: "tenant-1",
  tenantToken: "token-1",
  userId: "user-1",
};

describe("chat send runtime", () => {
  it("creates scoped local identities and writes channel-isolated outbox records", async () => {
    const storage = createMemorySendOutboxStorage();
    const runtime = createChatSendRuntime({
      channel: "customer_service",
      session,
      storage,
      taskId: "P4-MSG-005D",
    });
    const identity = runtime.createLocalIdentity("pc-cs-local-text");

    expect(identity.localMessageId).toBe(identity.clientMsgId);
    expect(identity.localMessageId).toMatch(/^pc-cs-local-text-\d+-[0-9a-f]+$/);
    expect(runtime.scopeKey).toBe(sendOutboxScopeKey(session));
    expect(runtime.targetKey("temp_session", "thread-1")).toBe(
      "customer_service:temp_session:thread-1",
    );

    await runtime.upsertOutboxRecord({
      body: { text: "hello" },
      clientMsgId: identity.clientMsgId,
      createdAt: identity.createdAt,
      localMessageId: identity.localMessageId,
      messageType: "text",
      status: "sending",
      targetId: "thread-1",
      targetType: "temp_session",
    });

    expect(await storage.listRecords({ scopeKey: runtime.scopeKey })).toEqual([
      expect.objectContaining({
        body: { text: "hello" },
        channel: "customer_service",
        clientMsgId: identity.clientMsgId,
        localMessageId: identity.localMessageId,
        scopeKey: runtime.scopeKey,
        status: "sending",
        targetId: "thread-1",
        targetType: "temp_session",
      }),
    ]);
  });

  it("patches and deletes records through the runtime scope", async () => {
    const storage = createMemorySendOutboxStorage();
    const runtime = createChatSendRuntime({ channel: "im", session, storage });
    const identity = runtime.createLocalIdentity("pc-local-text");

    await runtime.upsertOutboxRecord({
      body: { text: "hello" },
      clientMsgId: identity.clientMsgId,
      createdAt: identity.createdAt,
      localMessageId: identity.localMessageId,
      messageType: "text",
      status: "sending",
      targetId: "conversation-1",
      targetType: "direct",
    });
    await runtime.patchOutboxRecord(identity.localMessageId, {
      localError: "network",
      status: "failed",
    });

    expect(await storage.listRecords({ scopeKey: runtime.scopeKey })).toEqual([
      expect.objectContaining({
        localError: "network",
        status: "failed",
      }),
    ]);

    await runtime.deleteOutboxRecord(identity.localMessageId);
    expect(await storage.listRecords({ scopeKey: runtime.scopeKey })).toEqual([]);
  });

  it("binds diagnostics to the runtime channel and task", () => {
    const runtime = createChatSendRuntime({
      channel: "im",
      session,
      storage: createMemorySendOutboxStorage(),
      taskId: "P4-MSG-005C",
    });

    expect(
      runtime.log({
        action: "send_succeeded",
        phase: "send",
        result: "ok",
        to: "sent",
      }),
    ).toMatchObject({
      channel: "im",
      module: "send",
      phase: "send",
      result: "ok",
      taskId: "P4-MSG-005C",
      to: "sent",
    });
  });
});
