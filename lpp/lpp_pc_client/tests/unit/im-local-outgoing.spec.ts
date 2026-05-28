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
});
