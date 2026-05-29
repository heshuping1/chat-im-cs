import { describe, expect, it } from "vitest";
import { mergeLocalOutgoingMessages } from "../../src/renderer/data/im-local-outgoing";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

function message(id: string, status = "sent", sentAt = "2026-05-28T10:00:00.000Z"): MessageItemDto {
  return {
    messageId: id,
    conversationId: "c1",
    sentAt,
    status,
    messageType: "file",
    body: { file: { fileName: "case.xlsx", sizeBytes: 12 } },
  };
}

function textMessage(id: string, status = "sent", text = "from owner to agent"): MessageItemDto {
  return {
    messageId: id,
    conversationId: "c1",
    sentAt: "2026-05-28T10:00:00.000Z",
    status,
    direction: "out",
    isMine: true,
    isSelf: true,
    messageType: "text",
    body: { text },
    preview: text,
  };
}

describe("mergeLocalOutgoingMessages", () => {
  it("keeps a local uploading file visible when a server refresh does not include it yet", () => {
    const server = [message("server-1", "sent", "2026-05-28T09:59:00.000Z")];
    const local = [message("pc-local-media-1", "sending", "2026-05-28T10:00:00.000Z")];

    expect(mergeLocalOutgoingMessages(server, local).map((item) => item.messageId)).toEqual([
      "server-1",
      "pc-local-media-1",
    ]);
  });

  it("uses the server copy once the same outgoing file arrives from the server", () => {
    const server = [message("server-1", "sent", "2026-05-28T10:00:00.000Z")];
    const local = [message("server-1", "sending", "2026-05-28T10:00:00.000Z")];

    expect(mergeLocalOutgoingMessages(server, local)).toEqual(server);
  });

  it("deduplicates a pending local text echo when the server copy arrives with a new id first", () => {
    const server = [textMessage("server-23", "sent")];
    const local = [textMessage("pc-local-text-1", "sending")];

    expect(mergeLocalOutgoingMessages(server, local)).toEqual(server);
  });
});
