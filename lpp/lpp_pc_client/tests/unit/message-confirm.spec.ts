import { describe, expect, it } from "vitest";

import { messageDangerConfirmationText } from "../../src/renderer/messages/runtime/messageConfirm";

describe("message danger confirmation", () => {
  it("keeps destructive message action copy centralized", () => {
    expect(messageDangerConfirmationText("recall-message")).toContain("撤回");
    expect(messageDangerConfirmationText("delete-message")).toContain("删除");
    expect(messageDangerConfirmationText("delete-conversation")).toContain("会话");
    expect(messageDangerConfirmationText("batch-delete-messages", 3)).toContain("3 条");
  });
});
