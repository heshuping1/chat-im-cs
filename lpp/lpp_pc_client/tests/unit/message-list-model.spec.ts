import { describe, expect, it } from "vitest";

import {
  filterMessagesByHistory,
  filterVisibleMessages,
  getHistoryFilterCounts,
  messageActionPreview,
} from "../../src/renderer/messages/models/messageListModel";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

describe("message list model", () => {
  it("filters by keyword across preview, sender, text and file names", () => {
    const text = message({
      messageId: "text",
      body: { text: "refund please" },
      preview: "refund please",
      senderDisplayName: "Alice",
    });
    const file = message({
      messageId: "file",
      body: { file: { fileName: "contract.pdf" } },
      messageType: "file",
      preview: "file",
    });

    expect(filterVisibleMessages([text, file], "contract")).toEqual([file]);
    expect(filterVisibleMessages([text, file], "alice")).toEqual([text]);
  });

  it("counts and filters history buckets", () => {
    const messages = [
      message({ messageId: "text", body: { text: "hello" }, messageType: "text" }),
      message({ messageId: "image", body: { image: { url: "/image.png" } }, messageType: "image" }),
      message({ messageId: "link", body: { text: "https://example.com" }, messageType: "text" }),
    ];

    expect(getHistoryFilterCounts(messages)).toMatchObject({
      all: 3,
      image: 1,
      link: 1,
      text: 2,
    });
    expect(filterMessagesByHistory(messages, "image").map((item) => item.messageId)).toEqual([
      "image",
    ]);
  });

  it("creates compact action previews for media and long text", () => {
    expect(
      messageActionPreview(
        message({
          body: { text: "x".repeat(70) },
          messageId: "long",
          messageType: "text",
        }),
      ),
    ).toHaveLength(63);
    expect(
      messageActionPreview(
        message({
          body: { video: { fileName: "clip.mp4" } },
          messageId: "video",
          messageType: "video",
        }),
      ),
    ).toBe("[视频]");
  });
});

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: {},
    messageId: "m1",
    messageType: "text",
    preview: "",
    sentAt: "2026-05-29T12:00:00.000Z",
    ...overrides,
  } as MessageItemDto;
}
