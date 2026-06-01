import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/renderer/data/api-client";
import {
  aiSuggestionSourceLabel,
  aiSuggestionStatusLabel,
  formatAiSuggestionError,
  normalizeAiSuggestion,
  normalizeAiSuggestionsResponse,
} from "../../src/renderer/data/api/ai-suggestion-normalizers";

describe("ai suggestion normalizers", () => {
  it("normalizes array and items responses", () => {
    expect(
      normalizeAiSuggestionsResponse({
        items: [
          {
            id: "s1",
            thread_type: "temp_session",
            thread_id: "t1",
            draft: "Please verify the order id.",
            confidence: "0.82",
            source: "external_rag",
            sources: [
              {
                title: "Order SOP",
                path: ["Orders", "Pending"],
                snippet: "Check order id first.",
                similarity: "0.77",
              },
            ],
            status: 1,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        suggestionId: "s1",
        text: "Please verify the order id.",
        confidence: 0.82,
        source: "external_rag",
        status: 1,
        sources: [
          expect.objectContaining({
            documentTitle: "Order SOP",
            headingPath: ["Orders", "Pending"],
            score: 0.77,
          }),
        ],
      }),
    ]);
  });

  it("normalizes a single suggestion without inventing draft text", () => {
    expect(normalizeAiSuggestion({ suggestionId: "s2", status: "generated" })).toEqual(
      expect.objectContaining({
        suggestionId: "s2",
        text: null,
        sources: [],
      }),
    );
  });

  it("maps status and source labels", () => {
    expect(aiSuggestionStatusLabel(0)).toBe("已生成");
    expect(aiSuggestionStatusLabel("adopted")).toBe("已采纳");
    expect(aiSuggestionStatusLabel("discarded")).toBe("已弃用");
    expect(aiSuggestionStatusLabel("other")).toBe("状态未知");
    expect(aiSuggestionSourceLabel("external_rag")).toBe("知识库增强");
    expect(aiSuggestionSourceLabel("builtin_rule")).toBe("内置规则");
    expect(aiSuggestionSourceLabel("fallback")).toBe("兜底建议");
  });

  it("maps service errors to user facing AI reply suggestion messages", () => {
    expect(
      formatAiSuggestionError(
        new ApiError("no customer message", "CS_SUGGESTION_NO_CUSTOMER_MESSAGE", undefined, 400),
      ),
    ).toBe("暂无客户消息可用于生成草稿");
    expect(formatAiSuggestionError(new ApiError("forbidden", undefined, undefined, 403))).toBe(
      "当前账号无客服 AI 权限",
    );
    expect(
      formatAiSuggestionError(
        new ApiError("customerServiceThreadNotFound", "customerServiceThreadNotFound", undefined, 404),
      ),
    ).toBe("当前会话尚未形成客服接待线程，无法生成客服 AI 草稿");
  });
});
