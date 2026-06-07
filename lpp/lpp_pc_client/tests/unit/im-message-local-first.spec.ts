import { describe, expect, it } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  imLocalMessagesQueryKey,
  resolveLocalFirstMessages,
} from "../../src/renderer/data/message-store/im-message-store-hydration";

const localMessage = { messageId: "local-1", preview: "local" } as MessageItemDto;
const serverMessage = { messageId: "server-1", preview: "server" } as MessageItemDto;
const hotMessage = { messageId: "hot-1", preview: "hot" } as MessageItemDto;

describe("IM message local-first hydration", () => {
  it("shows local messages while the server query is still loading", () => {
    expect(
      resolveLocalFirstMessages({
        localMessages: [localMessage],
        serverLoading: true,
      }),
    ).toMatchObject({
      hydrationSource: "local",
      isLocalHydrated: true,
      messages: [localMessage],
      messagesLoaded: true,
      messagesLoading: false,
    });
  });

  it("keeps local messages visible when the server query fails", () => {
    const serverError = new Error("network");

    expect(
      resolveLocalFirstMessages({
        localMessages: [localMessage],
        serverError,
      }),
    ).toMatchObject({
      hydrationSource: "local",
      messages: [localMessage],
      messagesLoaded: true,
      messagesLoading: false,
      nonBlockingError: serverError,
    });
  });

  it("prefers server messages over hot and local snapshots", () => {
    expect(
      resolveLocalFirstMessages({
        hotMessages: [hotMessage],
        localMessages: [localMessage],
        serverMessages: [serverMessage],
      }),
    ).toMatchObject({
      hydrationSource: "server",
      messages: [serverMessage],
    });
  });

  it("uses hot cache before local store so re-entry remains stable during local fetch", () => {
    expect(
      resolveLocalFirstMessages({
        hotMessages: [hotMessage],
        localMessages: [localMessage],
        serverLoading: true,
      }),
    ).toMatchObject({
      hydrationSource: "hot",
      messages: [hotMessage],
      messagesLoading: false,
    });
  });

  it("keeps blocking loading only when no local or hot messages are available", () => {
    expect(
      resolveLocalFirstMessages({
        localMessages: [],
        localLoading: false,
        serverLoading: true,
      }),
    ).toMatchObject({
      hydrationSource: "empty",
      messages: [],
      messagesLoaded: false,
      messagesLoading: true,
    });
  });

  it("builds a stable local messages query key", () => {
    expect(imLocalMessagesQueryKey("scope-1", "direct", "c1")).toEqual([
      "pc-im-local-messages",
      "scope-1",
      "direct",
      "c1",
    ]);
  });
});
