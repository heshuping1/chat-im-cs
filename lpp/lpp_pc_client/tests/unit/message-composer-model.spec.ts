import { describe, expect, it, vi } from "vitest";
import type { GroupMemberDto, MediaResourceDto } from "../../src/renderer/data/api-client";
import {
  buildMentionOptions,
  extractActionResultText,
  extractMentions,
  normalizeUploadedMedia,
  settleVideoPosterForSend,
  withReplyBody,
} from "../../src/renderer/messages/models/messageComposerModel";

describe("messageComposerModel", () => {
  it("attaches reply metadata to outgoing body", () => {
    expect(withReplyBody({ text: "hello" }, {
      messageId: "m1",
      sender: "Alice",
      preview: "source",
    })).toEqual({
      text: "hello",
      reply: {
        messageId: "m1",
        sender: "Alice",
        preview: "source",
      },
    });
  });

  it("builds mention options and extracts mentioned members", () => {
    const members = [
      { userId: "u1", displayName: "Alice" },
      { platformUserId: "p2", displayName: "Bob" },
    ] as GroupMemberDto[];

    expect(buildMentionOptions(members)).toEqual([
      { id: "u1", label: "Alice" },
      { id: "p2", label: "Bob" },
    ]);
    expect(extractMentions("@Alice hi", members)).toEqual([
      { userId: "u1", displayName: "Alice" },
    ]);
  });

  it("extracts action result text from nested API responses", () => {
    expect(extractActionResultText({
      data: {
        translations: [{ text: " translated " }],
      },
    })).toBe("translated");
  });

  it("normalizes uploaded media with file metadata and url fallbacks", () => {
    const file = new File(["x"], "image.png", { type: "image/png" });
    const media = {
      resourceUrl: "https://cdn.example.com/image.png",
      thumbUrl: "https://cdn.example.com/thumb.png",
    } as MediaResourceDto;

    expect(normalizeUploadedMedia(media, file)).toMatchObject({
      url: "https://cdn.example.com/image.png",
      thumbnailUrl: "https://cdn.example.com/thumb.png",
      fileName: "image.png",
      originalFileName: "image.png",
      mimeType: "image/png",
      sizeBytes: 1,
    });
  });

  it("settles video poster by timeout", async () => {
    vi.useFakeTimers();
    const pending = new Promise<undefined>(() => undefined);
    const resultPromise = settleVideoPosterForSend(pending, 10);

    await vi.advanceTimersByTimeAsync(10);
    await expect(resultPromise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
