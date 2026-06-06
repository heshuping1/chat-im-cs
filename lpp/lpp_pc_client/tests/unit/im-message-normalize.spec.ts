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

  it("normalizes group media payloads that wrap image fields under content", () => {
    expect(
      normalizeMessageParts(
        message(
          {
            content: {
              content_url: "/group/files/photo.jpg",
              thumb_url: "/group/thumbs/photo.jpg",
              original_file_name: "photo.jpg",
              mime_type: "image/jpeg",
            },
          },
          "image",
        ),
      )[0],
    ).toMatchObject({
      type: "image",
      media: {
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        thumbnailUrl: "/group/thumbs/photo.jpg",
        url: "/group/files/photo.jpg",
      },
    });

    expect(normalizeMessageParts(message({ content: "/media/group-photo-1" }, "image"))[0]).toMatchObject({
      type: "image",
      media: { url: "/media/group-photo-1" },
    });

    expect(
      normalizeMessageParts(
        message(
          {
            content: JSON.stringify({
              mediaId: "group-photo-2",
              originalFileName: "photo-2.jpg",
              mimeType: "image/jpeg",
            }),
          },
          "image",
        ),
      )[0],
    ).toMatchObject({
      type: "image",
      media: {
        fileName: "photo-2.jpg",
        mimeType: "image/jpeg",
        url: "/media/group-photo-2",
      },
    });

    expect(
      normalizeMessageParts(
        message(
          {
            image: {
              mediaId: "group-photo-3",
              thumbnail_media_id: "group-photo-thumb-3",
              file_name: "photo-3.jpg",
            },
          },
          "image",
        ),
      )[0],
    ).toMatchObject({
      type: "image",
      media: {
        fileName: "photo-3.jpg",
        thumbnailUrl: "/media/group-photo-thumb-3",
        url: "/media/group-photo-3",
      },
    });

    expect(
      normalizeMessageParts(
        message(
          {
            image: {
              url: "/media/raw-photo",
              signedUrl: "/media/raw-photo?sig=ok",
              fileName: "signed.png",
            },
          },
          "image",
        ),
      )[0],
    ).toMatchObject({
      type: "image",
      media: {
        fileName: "signed.png",
        signedUrl: "/media/raw-photo?sig=ok",
        url: "/media/raw-photo",
      },
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
