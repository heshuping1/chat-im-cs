import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  isGroupAllMuted,
  resolveGroupSpeakPermissionGate,
} from "../../src/renderer/messages/models/groupSpeakPermissionModel";

describe("group speak permission model", () => {
  const messageCenterSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
    "utf8",
  );
  const speakPermissionModelSource = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/groupSpeakPermissionModel.ts"),
    "utf8",
  );
  const conversationStageSource = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageCenterConversationStage.tsx"),
    "utf8",
  );
  const composerDockSource = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageComposerDock.tsx"),
    "utf8",
  );
  const composerSurfaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageComposerSurface.tsx"),
    "utf8",
  );
  const sharedComposerSurfaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatComposerSurface.tsx"),
    "utf8",
  );
  const zhCnMessagesSource = readFileSync(
    resolve(process.cwd(), "src/renderer/i18n/messages/zh-CN.ts"),
    "utf8",
  );

  it("recognizes backend mute-all values", () => {
    expect(isGroupAllMuted("all_muted")).toBe(true);
    expect(isGroupAllMuted(1)).toBe(true);
    expect(isGroupAllMuted("1")).toBe(true);
    expect(isGroupAllMuted("normal")).toBe(false);
    expect(isGroupAllMuted(0)).toBe(false);
  });

  it("keeps non-manager group members read-only in mute-all groups", () => {
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "group",
        detailLoaded: true,
        groupRole: "member",
        muteMode: "all_muted",
      }),
    ).toEqual({ disabled: true, reason: "all_muted" });
  });

  it("allows group owners and group admins under mute-all", () => {
    ["owner", "admin"].forEach((groupRole) => {
      expect(
        resolveGroupSpeakPermissionGate({
          conversationType: "group",
          detailLoaded: true,
          groupRole: groupRole as "owner" | "admin",
          muteMode: 1,
        }).disabled,
      ).toBe(false);
    });
  });

  it("does not disable before detail is loaded or outside mute-all group chats", () => {
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "group",
        detailLoaded: false,
        groupRole: "member",
        muteMode: "all_muted",
      }).disabled,
    ).toBe(false);
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "direct",
        detailLoaded: true,
        groupRole: "member",
        muteMode: "all_muted",
      }).disabled,
    ).toBe(false);
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "group",
        detailLoaded: true,
        groupRole: "member",
        muteMode: "normal",
      }).disabled,
    ).toBe(false);
  });

  it("wires the mute-all gate through composer UI and send commands", () => {
    expect(messageCenterSource).toContain("resolveGroupSpeakPermissionGate");
    expect(messageCenterSource).toContain("detailLoaded: Boolean(groupManagement.detail)");
    expect(speakPermissionModelSource).not.toContain("membershipRole");
    expect(speakPermissionModelSource).not.toContain("canTenantRoleBypassAllMute");
    expect(messageCenterSource).not.toContain("resolveTenantMembershipRole(session)");
    expect(messageCenterSource).not.toContain("membershipRole: tenantMembershipRole");
    expect(messageCenterSource).toContain("sendText: guardedSendText");
    expect(messageCenterSource).toContain("sendMedia: guardedSendMedia");
    expect(messageCenterSource).toContain("sendContactCard: guardedSendContactCard");
    expect(messageCenterSource).toContain("openContactCardPicker: guardedOpenContactCardPicker");
    expect(messageCenterSource).toContain("uploadAction: guardedUploadAction");
    expect(messageCenterSource).toContain("if (groupSpeakPermissionGate.disabled)");
    expect(messageCenterSource).toContain("composerDisabled={groupSpeakPermissionGate.disabled}");
    expect(messageCenterSource).toContain("composerDisabledReason={composerDisabledNotice}");
    expect(zhCnMessagesSource).toContain("groupAllMutedReadOnly: '已开启仅群主或特定成员可发言'");

    expect(conversationStageSource).toContain("composerDisabled?: boolean");
    expect(conversationStageSource).toContain("composerDisabledReason?: string");
    expect(conversationStageSource).toContain("composerDisabled={composerDisabled}");
    expect(conversationStageSource).toContain("composerPlaceholder={composerDisabledReason}");
    expect(composerDockSource).toContain("disabled={composerDisabled}");
    expect(composerDockSource).toContain("placeholder={composerPlaceholder}");
    expect(composerSurfaceSource).toContain("disabled={disabled}");
    expect(composerSurfaceSource).toContain("placeholder={placeholder ?? t(\"composer.messagePlaceholder\")}");
    expect(sharedComposerSurfaceSource).toContain("disabled={disabled}");
    expect(sharedComposerSurfaceSource).toContain("if (!disabled) onQuickReply?.()");
    expect(sharedComposerSurfaceSource).toContain("if (!disabled) onKnowledgeBase?.()");
    expect(sharedComposerSurfaceSource).toContain("if (!disabled) onAiDraft?.()");
  });
});
