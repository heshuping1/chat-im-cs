import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/renderer/data/api/base";
import {
  formatApiErrorForUser,
  normalizeApiError,
} from "../../src/renderer/data/api/api-error-model";
import { formatError } from "../../src/renderer/lib/format";

describe("api error model", () => {
  it("maps auth and permission errors to stable user messages", () => {
    expect(formatApiErrorForUser(new ApiError("token expired", "TOKEN_EXPIRED", "r1", 401))).toBe(
      "登录状态已失效，请重新登录",
    );
    expect(formatApiErrorForUser(new ApiError("no access", "FORBIDDEN", "r2", 403))).toBe(
      "当前账号没有权限执行此操作",
    );
  });

  it("formats IM send permission errors with actionable copy", () => {
    expect(
      formatApiErrorForUser(
        new ApiError("forbidden", "MSG_MEMBER_FORBIDDEN", "r1", 403),
      ),
    ).toBe("你不在该会话中，无法发送消息");
    expect(
      formatApiErrorForUser(new ApiError("muted", "MSG_GROUP_MUTED", "r2", 403)),
    ).toBe("群聊已开启全员禁言，暂时无法发送");
    expect(
      formatApiErrorForUser(new ApiError("muted", "MSG_MEMBER_MUTED", "r3", 403)),
    ).toBe("你已被禁言，暂时无法发言");
  });

  it("maps tenant join pending errors to product copy", () => {
    expect(
      formatApiErrorForUser(
        new ApiError("a join request is already pending", "TENANT_JOIN_REQUEST_PENDING", "r6", 409),
      ),
    ).toBe("已提交加入申请，正在等待管理员审核");
    expect(formatApiErrorForUser(new ApiError("a join request is already pending", undefined, "r7", 409))).toBe(
      "已提交加入申请，正在等待管理员审核",
    );
  });

  it("maps common http errors without exposing backend internals", () => {
    expect(formatApiErrorForUser(new ApiError("not found", "NOT_FOUND", "r3", 404))).toBe(
      "目标内容不存在或已被删除",
    );
    expect(formatApiErrorForUser(new ApiError("too many", "RATE_LIMIT", "r4", 429))).toBe(
      "操作过于频繁，请稍后再试",
    );
    expect(
      formatApiErrorForUser(
        new ApiError("HTTP 500 https://example.test/internal?token=abc", "SERVER", "r5", 500),
      ),
    ).toBe("服务暂时不可用，请稍后重试");
  });

  it("detects network and aborted errors", () => {
    expect(normalizeApiError(new TypeError("Failed to fetch")).kind).toBe("network");
    expect(formatApiErrorForUser(new TypeError("Failed to fetch"))).toBe(
      "网络连接异常，请检查网络后重试",
    );
    expect(normalizeApiError(new DOMException("Upload aborted", "AbortError")).kind).toBe(
      "aborted",
    );
  });

  it("sanitizes backend messages before user display", () => {
    const message = formatApiErrorForUser(
      new ApiError(
        "参数错误 Bearer secret-token requestId=req-1 https://api.example.test/a?token=secret",
        "VALIDATION_FAILED",
        "req-1",
        422,
      ),
    );

    expect(message).toContain("参数错误");
    expect(message).toContain("Bearer ***");
    expect(message).not.toContain("secret-token");
    expect(message).not.toContain("requestId=req-1");
    expect(message).not.toContain("api.example.test");
  });

  it("keeps non-api errors compatible with existing formatError behavior", () => {
    expect(formatError(new Error("请选择联系人"))).toBe("请选择联系人");
    expect(formatError("输入不能为空")).toBe("输入不能为空");
    expect(formatError(null, "兜底错误")).toBe("兜底错误");
  });
});
