import { describe, expect, it } from "vitest";

import {
  createMessageLookupScope,
  filterMessagesByHistory,
  filterVisibleMessages,
  getHistoryFilterCounts,
  messageActionPreview,
} from "../../src/renderer/messages/models/messageListModel";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

describe("message list model", () => {
  it("marks local and hot hydration as lookup-limited ranges", () => {
    expect(createMessageLookupScope("local")).toMatchObject({
      labelKey: "messages.listPanel.localRange",
      limitedToLoadedRange: true,
    });
    expect(createMessageLookupScope("hot")).toMatchObject({
      labelKey: "messages.listPanel.loadedRange",
      limitedToLoadedRange: true,
    });
    expect(createMessageLookupScope("server")).toMatchObject({
      labelKey: "messages.listPanel.syncedRange",
      limitedToLoadedRange: false,
    });
  });

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
      message({ messageId: "file", body: { file: { fileName: "contract.pdf" } }, messageType: "file" }),
      message({ messageId: "link", body: { text: "https://example.com" }, messageType: "text" }),
    ];

    expect(getHistoryFilterCounts(messages)).toMatchObject({
      all: 4,
      date: 4,
      file: 1,
      image: 1,
      link: 1,
    });
    expect(getHistoryFilterCounts(messages)).not.toHaveProperty("text");
    expect(getHistoryFilterCounts(messages)).not.toHaveProperty("voice");
    expect(getHistoryFilterCounts(messages)).not.toHaveProperty("favorite");
    expect(filterMessagesByHistory(messages, "image").map((item) => item.messageId)).toEqual([
      "image",
    ]);
    expect(filterMessagesByHistory(messages, "date").map((item) => item.messageId)).toEqual([
      "text",
      "image",
      "file",
      "link",
    ]);
  });

  it("hides received videos until the playable source is ready", () => {
    const pendingVideo = message({
      messageId: "video-pending",
      messageType: "video",
      preview: "clip.mp4",
      status: "sent",
      body: {
        video: {
          fileName: "clip.mp4",
          thumbnailUrl: "/covers/clip.jpg",
          status: "processing",
        },
      },
    });
    const readyVideo = message({
      messageId: "video-ready",
      messageType: "video",
      preview: "ready.mp4",
      body: {
        video: {
          fileName: "ready.mp4",
          thumbnailUrl: "/covers/ready.jpg",
          url: "/video/ready.mp4",
          status: "completed",
        },
      },
    });

    expect(filterVisibleMessages([pendingVideo, readyVideo], "").map((item) => item.messageId))
      .toEqual(["video-ready"]);
    expect(filterVisibleMessages([pendingVideo, readyVideo], "clip")).toEqual([]);
    expect(filterMessagesByHistory([pendingVideo, readyVideo], "image").map((item) => item.messageId))
      .toEqual(["video-ready"]);
    expect(getHistoryFilterCounts([pendingVideo, readyVideo])).toMatchObject({
      all: 1,
      date: 1,
      image: 1,
    });
    expect(getHistoryFilterCounts([pendingVideo, readyVideo])).not.toHaveProperty("video");
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
    expect(
      messageActionPreview(
        message({
          body: { contactCard: { userId: "u1", displayName: "张三" } },
          messageId: "card",
          messageType: "contact_card",
        }),
      ),
    ).toBe("[名片]");
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
