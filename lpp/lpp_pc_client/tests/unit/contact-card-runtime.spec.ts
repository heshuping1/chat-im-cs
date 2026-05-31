import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("contact card runtime wiring", () => {
  it("keeps contact card picker send state wired instead of hard-coding pending false", () => {
    const dialogsLayer = source("src/renderer/messages/components/MessageDialogsLayer.tsx");
    const stage = source("src/renderer/messages/components/MessageCenterConversationStage.tsx");
    const center = source("src/renderer/components/MessageCenter.tsx");

    expect(dialogsLayer).toContain("sendContactCardPending");
    expect(dialogsLayer).toContain("pending={sendContactCardPending}");
    expect(dialogsLayer).not.toContain("pending={false}");
    expect(stage).toContain("sendContactCardPending");
    expect(stage).toContain("sendContactCardPending={sendContactCardPending}");
    expect(center).toContain("contactCardSendPending");
    expect(center).toContain("setContactCardSendPending(true)");
    expect(center).toContain("contactCardActionErrorText(error, \"发送名片失败\")");
  });

  it("tracks the contact card profile relation actions in a committed controller", () => {
    const controllerPath = "src/renderer/messages/hooks/useMessageContactProfileController.ts";
    const controller = source(controllerPath);
    const center = source("src/renderer/components/MessageCenter.tsx");

    expect(existsSync(resolve(process.cwd(), controllerPath))).toBe(true);
    expect(controller).toContain("sendFriendRequest");
    expect(controller).toContain("handleFriendRequest");
    expect(controller).toContain("resolveContactCardRelation");
    expect(controller).toContain("localOutgoingContactRequestIds");
    expect(controller).toContain("acceptContactRequest");
    expect(controller).toContain("rejectContactRequest");
    expect(controller).toContain("sendContactRequest");
    expect(center).toContain("contactProfileController.contactCardRelation");
    expect(center).not.toContain("const sendFriendRequestMutation = useMutation");
    expect(center).not.toContain("const handleFriendRequestMutation = useMutation");
  });

  it("renders relation-specific actions for friend, stranger and incoming request cards", () => {
    const profileDialog = source("src/renderer/messages/components/ConversationInfoViews.tsx");

    expect(profileDialog).toContain("发消息");
    expect(profileDialog).toContain("删除好友");
    expect(profileDialog).toContain("加入黑名单");
    expect(profileDialog).toContain("添加到通讯录");
    expect(profileDialog).toContain("好友申请已发送");
    expect(profileDialog).toContain("拒绝");
    expect(profileDialog).toContain("通过");
    expect(profileDialog).toContain("这是你自己");
  });
});
