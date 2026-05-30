import { describe, expect, it } from "vitest";

import {
  createMessageContextMenuState,
  getMessageContextActionAvailability,
} from "../../src/renderer/messages/models/messageContextMenuModel";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

describe("message context menu model", () => {
  it("allows recent self server messages to be recalled", () => {
    const state = createMessageContextMenuState({
      canCopyMediaFile: false,
      mediaCacheStatus: undefined,
      message: message({
        isMine: true,
        messageId: "m1",
        sentAt: "2026-05-29T12:00:00.000Z",
        status: "sent",
      }),
      mine: true,
      now: new Date("2026-05-29T12:01:30.000Z"),
      revealInFolderLabel: "显示文件位置",
    });

    expect(state.recallable).toBe(true);
    expect(state.serverUsable).toBe(true);
  });

  it.each([
    ["failed message", { messageId: "m1", status: "failed" }],
    ["pc local message", { messageId: "pc-local-1", status: "sent" }],
    ["recalled message", { isRecalled: true, messageId: "m1", status: "sent" }],
  ])("disables server actions for %s", (_label, overrides) => {
    const state = createMessageContextMenuState({
      canCopyMediaFile: false,
      mediaCacheStatus: undefined,
      message: message(overrides),
      mine: true,
      revealInFolderLabel: "显示文件位置",
    });

    expect(state.recallable).toBe(false);
    expect(state.serverUsable).toBe(false);
  });

  it("classifies media and text capabilities", () => {
    expect(
      createMessageContextMenuState({
        canCopyMediaFile: true,
        mediaCacheStatus: "cached",
        message: message({
          body: { video: { url: "/clip.mp4" } },
          messageType: "video",
        }),
        mine: false,
        revealInFolderLabel: "显示文件位置",
      }),
    ).toMatchObject({
      canCopyMediaFile: true,
      hasMedia: true,
      isText: false,
      isVideo: true,
    });
  });

  it("exposes an action availability map for menus and command guards", () => {
    const state = createMessageContextMenuState({
      canCopyMediaFile: true,
      mediaCacheStatus: "not_cached",
      message: message({
        body: { video: { url: "/clip.mp4" } },
        messageType: "video",
      }),
      mine: false,
      revealInFolderLabel: "显示文件位置",
    });

    expect(getMessageContextActionAvailability(state)).toMatchObject({
      copy_media: false,
      delete: true,
      forward: true,
      open_media: false,
      save_media_as: false,
    });
  });
});

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: { text: "hello" },
    messageId: "m",
    messageType: "text",
    preview: "hello",
    sentAt: "2026-05-29T12:00:00.000Z",
    ...overrides,
  } as MessageItemDto;
}
