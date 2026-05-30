import { describe, expect, it } from "vitest";
import {
  messagePreviewFromBody,
  normalizeMessageParts,
} from "../../src/renderer/data/im-message-normalize";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

function message(body: Record<string, unknown>, messageType?: string): MessageItemDto {
  return {
    body,
    messageId: "m-1",
    messageType,
  };
}

describe("im-message-normalize", () => {
  it("normalizes common message body variants", () => {
    expect(normalizeMessageParts(message({ text: "hello" }, "text"))).toEqual([
      { type: "text", text: "hello" },
    ]);
    expect(normalizeMessageParts(message({ markdown: "**hello**" }, "markdown"))).toEqual([
      { type: "markdown", text: "**hello**" },
    ]);
    expect(normalizeMessageParts(message({ imageUrl: "https://img.test/a.png" }, "image"))[0]).toMatchObject({
      type: "image",
      media: { url: "https://img.test/a.png" },
    });
    expect(normalizeMessageParts(message({ fileUrl: "https://file.test/a.pdf" }, "file"))[0]).toMatchObject({
      type: "file",
      media: { url: "https://file.test/a.pdf" },
    });
    expect(normalizeMessageParts(message({ audioUrl: "https://audio.test/a.mp3" }, "voice"))[0]).toMatchObject({
      type: "voice",
      media: { url: "https://audio.test/a.mp3" },
    });
    expect(normalizeMessageParts(message({ videoUrl: "https://video.test/a.mp4" }, "video"))[0]).toMatchObject({
      type: "video",
      media: { url: "https://video.test/a.mp4" },
    });
  });

  it("normalizes structured location, contact, call and event messages", () => {
    expect(normalizeMessageParts(message({ location: { name: "Tokyo" } }, "location"))).toEqual([
      { type: "location", value: { name: "Tokyo" } },
    ]);
    expect(normalizeMessageParts(message({ contact_card: { name: "Eric" } }, "contact"))).toEqual([
      { type: "contact", value: { name: "Eric" } },
    ]);
    expect(normalizeMessageParts(message({ call_log: { duration: 12 } }, "call_log"))).toEqual([
      { type: "call", value: { duration: 12 } },
    ]);
    expect(normalizeMessageParts(message({ eventText: "joined" }, "event"))).toEqual([
      { type: "event", text: "joined" },
    ]);
  });

  it("falls back to a readable unsupported type preview", () => {
    expect(messagePreviewFromBody({ type: "sticker_pack" }, "sticker_pack")).toBe(
      "暂不支持的消息类型：sticker_pack",
    );
  });
});
