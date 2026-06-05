import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  canTenantRoleBypassAllMute,
  isGroupAllMuted,
  resolveGroupSpeakPermissionGate,
} from "../../src/renderer/messages/models/groupSpeakPermissionModel";

describe("group speak permission model", () => {
  const messageCenterSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
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

  it("recognizes backend mute-all values", () => {
    expect(isGroupAllMuted("all_muted")).toBe(true);
    expect(isGroupAllMuted(1)).toBe(true);
    expect(isGroupAllMuted("1")).toBe(true);
    expect(isGroupAllMuted("normal")).toBe(false);
    expect(isGroupAllMuted(0)).toBe(false);
  });

  it("keeps customers, ordinary members, and technical support read-only in mute-all groups", () => {
    [0, 1, undefined].forEach((membershipRole) => {
      expect(
        resolveGroupSpeakPermissionGate({
          conversationType: "group",
          detailLoaded: true,
          groupRole: "member",
          membershipRole,
          muteMode: "all_muted",
        }),
      ).toEqual({ disabled: true, reason: "all_muted" });
    });
  });

  it("allows customer service, admins, and owners by tenant role", () => {
    [2, 3, 4].forEach((membershipRole) => {
      expect(canTenantRoleBypassAllMute(membershipRole)).toBe(true);
      expect(
        resolveGroupSpeakPermissionGate({
          conversationType: "group",
          detailLoaded: true,
          groupRole: "member",
          membershipRole,
          muteMode: "all_muted",
        }).disabled,
      ).toBe(false);
    });
  });

  it("allows group owners and group admins under mute-all", () => {
    ["owner", "admin"].forEach((groupRole) => {
      expect(
        resolveGroupSpeakPermissionGate({
          conversationType: "group",
          detailLoaded: true,
          groupRole: groupRole as "owner" | "admin",
          membershipRole: 0,
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
        membershipRole: 0,
        muteMode: "all_muted",
      }).disabled,
    ).toBe(false);
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "direct",
        detailLoaded: true,
        groupRole: "member",
        membershipRole: 0,
        muteMode: "all_muted",
      }).disabled,
    ).toBe(false);
    expect(
      resolveGroupSpeakPermissionGate({
        conversationType: "group",
        detailLoaded: true,
        groupRole: "member",
        membershipRole: 0,
        muteMode: "normal",
      }).disabled,
    ).toBe(false);
  });

  it("wires the mute-all gate through composer UI and send commands", () => {
    expect(messageCenterSource).toContain("resolveGroupSpeakPermissionGate");
    expect(messageCenterSource).toContain("detailLoaded: Boolean(groupManagement.detail)");
    expect(messageCenterSource).toContain("membershipRole: session?.membershipRole");
    expect(messageCenterSource).toContain("sendText: guardedSendText");
    expect(messageCenterSource).toContain("sendMedia: guardedSendMedia");
    expect(messageCenterSource).toContain("sendContactCard: guardedSendContactCard");
    expect(messageCenterSource).toContain("openContactCardPicker: guardedOpenContactCardPicker");
    expect(messageCenterSource).toContain("uploadAction: guardedUploadAction");
    expect(messageCenterSource).toContain("if (groupSpeakPermissionGate.disabled)");
    expect(messageCenterSource).toContain("composerDisabled={groupSpeakPermissionGate.disabled}");
    expect(messageCenterSource).toContain("composerDisabledReason={composerDisabledNotice}");

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
