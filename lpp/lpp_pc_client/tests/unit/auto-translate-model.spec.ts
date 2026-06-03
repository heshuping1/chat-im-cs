import { describe, expect, it } from "vitest";
import {
  autoTranslateTargetLanguage,
  selectAutoTranslateMessages,
  translationAnnotationText,
} from "../../src/renderer/translation/models/autoTranslateModel";
import type { MessageItemDto } from "../../src/renderer/data/api-client";

function message(
  messageId: string,
  body: Record<string, unknown>,
  messageType = "text",
  senderId = "peer",
): MessageItemDto {
  return {
    body,
    conversationId: "c-1",
    messageId,
    messageType,
    senderId,
    sentAt: "2026-06-03T10:00:00.000Z",
  } as MessageItemDto;
}

describe("auto translate model", () => {
  it("maps PC language to translation target language", () => {
    expect(autoTranslateTargetLanguage("简体中文")).toBe("zh-CN");
    expect(autoTranslateTargetLanguage("English")).toBe("en-US");
    expect(autoTranslateTargetLanguage("العربية")).toBe("ar");
    expect(autoTranslateTargetLanguage("unknown")).toBe("zh-CN");
  });

  it("selects only peer text messages without existing translation state", () => {
    const candidates = selectAutoTranslateMessages({
      annotations: {
        translated: "译文：hello",
        pending: "译文：翻译中...",
      },
      activeTaskKeys: new Set(["c-1::busy"]),
      conversationKey: "c-1",
      isMineMessage: (item) => item.senderId === "me",
      messages: [
        message("peer-text", { text: "hello" }),
        message("me-text", { text: "mine" }, "text", "me"),
        message("image-1", { image: { url: "x" } }, "image"),
        message("system-1", { text: "joined" }, "system"),
        message("empty", { text: " " }),
        message("translated", { text: "done" }),
        message("pending", { text: "wait" }),
        message("busy", { text: "busy" }),
      ],
    });

    expect(candidates).toEqual([
      {
        message: expect.objectContaining({ messageId: "peer-text" }),
        taskKey: "c-1::peer-text",
        text: "hello",
      },
    ]);
  });

  it("formats visible translation status text", () => {
    expect(translationAnnotationText("loading")).toBe("译文：翻译中...");
    expect(translationAnnotationText("success", " hello ")).toBe("译文：hello");
    expect(translationAnnotationText("empty")).toBe("译文：翻译服务未返回内容");
    expect(translationAnnotationText("failed")).toBe("译文：翻译失败，请稍后重试");
  });
});
