import { describe, expect, it } from "vitest";
import { sendComposerPartsInOrder } from "../../src/renderer/media/runtime/sendQueue";

describe("sendComposerPartsInOrder", () => {
  it("does nothing for an empty composer send", async () => {
    const events: string[] = [];
    await sendComposerPartsInOrder<{ id: string }>({
      parts: [],
      sendText: async (text) => {
        events.push(`text:${text}`);
      },
      sendAttachment: async (attachment) => {
        events.push(`attachment:${attachment.id}`);
      },
    });

    expect(events).toEqual([]);
  });

  it("sends text and attachments strictly in visible order", async () => {
    const events: string[] = [];
    await sendComposerPartsInOrder<{ id: string }>({
      parts: [
        { type: "text", text: "A" },
        { type: "attachment", attachment: { id: "image-1" } },
        { type: "text", text: "B" },
        { type: "attachment", attachment: { id: "file-1" } },
        { type: "text", text: "C" },
      ],
      sendText: async (text) => {
        events.push(`text:${text}`);
      },
      sendAttachment: async (attachment) => {
        events.push(`attachment:${attachment.id}`);
      },
    });

    expect(events).toEqual([
      "text:A",
      "attachment:image-1",
      "text:B",
      "attachment:file-1",
      "text:C",
    ]);
  });

  it("continues after a failed part and reports the failure", async () => {
    const events: string[] = [];
    const failures: string[] = [];
    await sendComposerPartsInOrder<{ id: string }>({
      parts: [
        { type: "text", text: "A" },
        { type: "attachment", attachment: { id: "bad-file" } },
        { type: "text", text: "B" },
      ],
      sendText: async (text) => {
        events.push(`text:${text}`);
      },
      sendAttachment: async (attachment) => {
        events.push(`attachment:${attachment.id}`);
        throw new Error(`failed:${attachment.id}`);
      },
      onFailure: ({ error }) => {
        failures.push(error instanceof Error ? error.message : String(error));
      },
    });

    expect(events).toEqual(["text:A", "attachment:bad-file", "text:B"]);
    expect(failures).toEqual(["failed:bad-file"]);
  });
});
