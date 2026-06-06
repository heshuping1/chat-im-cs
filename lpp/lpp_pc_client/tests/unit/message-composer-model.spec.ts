import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { GroupMemberDto, MediaResourceDto } from "../../src/renderer/data/api-client";
import {
  buildMentionOptions,
  extractActionResultText,
  extractMentions,
  MENTION_ALL_ID,
  MENTION_ALL_LABEL,
  normalizeUploadedMedia,
  settleVideoPosterForSend,
  withReplyBody,
} from "../../src/renderer/messages/models/messageComposerModel";

describe("messageComposerModel", () => {
  const lexicalInputSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/LexicalChatInput.tsx"),
    "utf8",
  );
  const messageComposerSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageComposer.tsx"),
    "utf8",
  );

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
      { userId: "u1", displayName: "Alice", groupNickname: "A-one" },
      { platformUserId: "p2", displayName: "Bob" },
      { userId: "u3", displayName: "Owner", groupNickname: "@mouse所有者" },
    ] as GroupMemberDto[];

    expect(buildMentionOptions(members)).toEqual([
      { id: "u1", label: "A-one" },
      { id: "p2", label: "Bob" },
      { id: "u3", label: "mouse所有者" },
    ]);
    expect(extractMentions("@A-one hi", members)).toEqual([
      { type: "user", userId: "u1", offset: 0, length: 6 },
    ]);
    expect(extractMentions("@alice hi", members)).toEqual([
      { type: "user", userId: "u1", offset: 0, length: 6 },
    ]);
    expect(extractMentions("@mouse所有者 hi", members)).toEqual([
      { type: "user", userId: "u3", offset: 0, length: 9 },
    ]);
  });

  it("adds @all only when the group permission allows it", () => {
    const members = [
      { userId: "u1", displayName: "Alice" },
    ] as GroupMemberDto[];

    expect(buildMentionOptions(members, { includeAll: true })[0]).toEqual({
      id: MENTION_ALL_ID,
      label: MENTION_ALL_LABEL,
      kind: "all",
    });
    expect(buildMentionOptions(members, { includeAll: false })).not.toContainEqual(
      expect.objectContaining({ kind: "all" }),
    );
    expect(extractMentions(`@${MENTION_ALL_LABEL} hi`, members)).toEqual([]);
    expect(extractMentions(`@${MENTION_ALL_LABEL} hi`, members, { includeAll: true })).toEqual([
      {
        type: "all",
        offset: 0,
        length: 4,
      },
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

  it("replaces the active rich-text mention trigger instead of appending another at sign", () => {
    expect(messageComposerSource).toContain("lexicalInputRef.current?.insertMention(label)");
    expect(messageComposerSource).not.toContain('lexicalInputRef.current?.insertText(`@${label} `)');
    expect(lexicalInputSource).toContain("insertMention: (label: string) => void");
    expect(lexicalInputSource).toContain("insertMentionAtSelection(label)");
    expect(lexicalInputSource).toContain("/(?:^|\\s)@([^\\s@]*)$/");
  });
});
