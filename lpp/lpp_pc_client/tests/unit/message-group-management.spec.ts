import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  canAddGroupMemberFriend,
  canInviteGroupMembers,
  canMentionAllGroupMembers,
  canManageGroupMember,
  canModifyGroupTitle,
  groupMemberDisplayName,
  groupManagementPermissions,
  groupMemberRoleRank,
  normalizeGroupRole,
  visibleGroupInfoTabs,
} from "../../src/renderer/messages/models/groupManagementModel";
import type { GroupMemberDto } from "../../src/renderer/data/api-client";

describe("message group management", () => {
  const conversationInfoPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoPanel.tsx"),
    "utf8",
  );
  const contactsClient = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/contacts-client.ts"),
    "utf8",
  );
  const endpoints = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/endpoints.ts"),
    "utf8",
  );
  const apiTypes = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/types.ts"),
    "utf8",
  );
  const groupHook = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageGroupManagement.ts"),
    "utf8",
  );
  const messageCenter = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
    "utf8",
  );
  const chatMessageBubble = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatMessageBubble.tsx"),
    "utf8",
  );
  const conversationStage = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageCenterConversationStage.tsx"),
    "utf8",
  );
  const conversationInfoViews = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoViews.tsx"),
    "utf8",
  );
  const messageListPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
    "utf8",
  );
  const messageProfileDock = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageProfileDock.tsx"),
    "utf8",
  );
  const contactCardModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/contactCardModel.ts"),
    "utf8",
  );
  const interactionHandlers = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageInteractionHandlers.ts"),
    "utf8",
  );
  const zhCnMessages = readFileSync(
    resolve(process.cwd(), "src/renderer/i18n/messages/zh-CN.ts"),
    "utf8",
  );
  const messageCenterCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/message-center.css"),
    "utf8",
  );

  function cssRuleBody(selector: string) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = Array.from(messageCenterCss.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "g")));
    return matches[matches.length - 1]?.[1] ?? "";
  }

  it("normalizes group roles and permissions", () => {
    expect(normalizeGroupRole("owner")).toBe("owner");
    expect(normalizeGroupRole("admin")).toBe("admin");
    expect(normalizeGroupRole("member")).toBe("member");
    expect(groupManagementPermissions("owner")).toMatchObject({
      canDisband: true,
      canTransferOwner: true,
      canManageMembers: true,
    });
    expect(groupManagementPermissions("admin")).toMatchObject({
      canDisband: false,
      canTransferOwner: false,
      canManageMembers: true,
    });
    expect(groupManagementPermissions("member")).toMatchObject({
      canManageMembers: false,
      canLeave: true,
    });
  });

  it("orders owner and admins ahead of ordinary members", () => {
    const members = [
      { userId: "m", displayName: "Member", role: "member" },
      { userId: "o", displayName: "Owner", role: "owner" },
      { userId: "a", displayName: "Admin", role: "admin" },
    ] as GroupMemberDto[];
    expect(members.sort((left, right) => groupMemberRoleRank(left) - groupMemberRoleRank(right)).map((m) => m.userId)).toEqual([
      "o",
      "a",
      "m",
    ]);
  });

  it("prefers group alias for member display and falls back to display name", () => {
    expect(groupMemberDisplayName({
      userId: "u1",
      displayName: "Account name",
      groupAlias: "财务-小王",
      groupNickname: "Group nick",
    } as GroupMemberDto)).toBe("财务-小王");
    expect(groupMemberDisplayName({
      userId: "u2",
      displayName: "Account name",
      groupAlias: " ",
    } as GroupMemberDto)).toBe("Account name");
  });

  it("prevents admins from handling owners or other admins", () => {
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "owner", action: "remove" })).toBe(false);
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "admin", action: "remove" })).toBe(false);
    expect(canManageGroupMember({ actorRole: "admin", targetRole: "member", action: "mute" })).toBe(true);
    expect(canManageGroupMember({ actorRole: "owner", targetRole: "admin", action: "demote" })).toBe(true);
  });

  it("keeps group management visible only to owners and admins", () => {
    expect(visibleGroupInfoTabs({ role: "owner" })).toContain("management");
    expect(visibleGroupInfoTabs({ role: "admin" })).toContain("management");
    expect(visibleGroupInfoTabs({ role: "member" })).not.toContain("management");
    expect(visibleGroupInfoTabs({ role: "member", settings: { allowMemberViewMemberList: false } })).not.toContain(
      "members",
    );
  });

  it("allows ordinary members to use setting-enabled group capabilities", () => {
    expect(canModifyGroupTitle({ role: "member", settings: { allowMemberModifyTitle: true } })).toBe(true);
    expect(canModifyGroupTitle({ role: "member", settings: { allowMemberModifyTitle: false } })).toBe(false);
    expect(canInviteGroupMembers({ role: "member", settings: { allowMemberInvite: true } })).toBe(true);
    expect(canInviteGroupMembers({ role: "member", settings: { allowMemberInvite: false } })).toBe(false);
    expect(canAddGroupMemberFriend({ role: "owner", settings: { allowMemberAddFriend: false } })).toBe(true);
    expect(canAddGroupMemberFriend({ role: "admin", settings: { allowMemberAddFriend: false } })).toBe(true);
    expect(canAddGroupMemberFriend({ role: "member", settings: { allowMemberAddFriend: true } })).toBe(true);
    expect(canAddGroupMemberFriend({ role: "member", settings: { allowMemberAddFriend: false } })).toBe(false);
    expect(canAddGroupMemberFriend({ role: "member", settings: {} })).toBe(true);
    expect(canMentionAllGroupMembers({ role: "owner", settings: { allowMemberAtAll: false } })).toBe(true);
    expect(canMentionAllGroupMembers({ role: "admin", settings: { allowMemberAtAll: false } })).toBe(true);
    expect(canMentionAllGroupMembers({ role: "owner", settings: { allowMemberAtAll: true } })).toBe(true);
    expect(canMentionAllGroupMembers({ role: "member", settings: { allowMemberAtAll: true } })).toBe(true);
    expect(canMentionAllGroupMembers({ role: "member", settings: { allowMemberAtAll: false } })).toBe(false);
  });

  it("renders group info without the legacy top tabs and keeps owner danger actions", () => {
    expect(zhCnMessages).toContain("groupProfileTitle: '群聊信息'");
    expect(zhCnMessages).not.toContain("groupProfileTitle: '群聊资料'");
    expect(conversationInfoPanel).toContain("visibleGroupInfoTabs");
    expect(conversationInfoPanel).not.toContain('className="customer-info-tabs group-info-tabs"');
    expect(conversationInfoPanel).not.toContain("GroupTabIcon");
    expect(conversationInfoPanel).toContain("group-members-toolbar");
    expect(conversationInfoPanel).toContain("inviteMembers");
    expect(conversationInfoPanel).toContain("group-member-menu-trigger");
    expect(conversationInfoPanel).toContain("moreActions");
    expect(conversationInfoPanel).toContain("viewMemberProfile");
    expect(conversationInfoPanel).toContain("onOpenGroupMemberProfile");
    expect(conversationInfoPanel).toContain('role="button"');
    expect(conversationInfoPanel).toContain("groupMemberPrimaryLine");
    expect(conversationInfoPanel).toContain("groupMemberSignature");
    expect(conversationInfoPanel).toContain("noSignature");
    expect(conversationInfoPanel).toContain("empty-signature");
    expect(conversationInfoPanel).toContain("actions.transfer");
    expect(conversationInfoPanel).toContain("actions.disbandGroup");
    expect(conversationInfoPanel).toContain("joinRequests");
    expect(conversationInfoPanel).toContain("StatusToggleRow");
    expect(conversationInfoPanel).toContain("setMuteMode");
    expect(conversationInfoPanel).toContain("GroupProfileInfoList");
    expect(conversationInfoPanel).toContain("EditableGroupTitleRow");
    expect(conversationInfoPanel).toContain("PencilLine");
    expect(conversationInfoPanel).toContain("canModifyGroupTitle");
    expect(conversationInfoPanel).toContain("canInviteGroupMembers");
    expect(conversationInfoPanel).toContain("canViewGroupMemberList");
    expect(conversationInfoPanel).toContain("canAddGroupMemberFriend");
    expect(conversationInfoPanel).toContain("canViewMembers");
    expect(conversationInfoPanel).toContain("group-member-add-tile-standalone");
  });

  it("exposes App-parity conversation info actions through real PC handlers", () => {
    expect(conversationInfoPanel).toContain("ConversationSettingsActions");
    expect(conversationInfoPanel).toContain("actions.searchMessages");
    expect(conversationInfoPanel).toContain("actions.chatBackground");
    expect(conversationInfoPanel).toContain("actions.clearHistory");
    expect(conversationInfoPanel).toContain("ComplaintActionButton");
    expect(messageCenter).toContain("submitFeedback");
    expect(conversationStage).toContain("openMessageLookupFromInfo");
    expect(conversationStage).toContain("handleConversationMenuAction");
  });

  it("renders conversation boolean states as real toggles instead of read-only labels", () => {
    expect(conversationInfoPanel).toContain("ToggleStatusControl");
    expect(conversationInfoPanel).toContain("StatusText");
    expect(conversationInfoPanel).toContain("StatusToggleRow");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.chatStatus");
    expect(conversationInfoPanel).toContain("conversation.isMuted");
    expect(conversationInfoPanel).toContain("groupManagement.actions.setMuted(nextChecked)");
    expect(conversationInfoPanel).toContain("groupManagement.actions.setPinned(nextChecked)");
    expect(conversationInfoPanel).toContain('onConversationAction?.("mute", conversation)');
    expect(conversationInfoPanel).toContain('onConversationAction?.("pin", conversation)');
    expect(conversationInfoPanel).toContain("groupManagement?.actions.setMuteMode(nextChecked)");
    expect(conversationInfoPanel).toContain("const [optimisticChecked, setOptimisticChecked] = useState(checked)");
    expect(conversationInfoPanel).toContain("const pendingTargetRef = useRef<boolean | null>(null)");
    expect(conversationInfoPanel).toContain("pendingTargetRef.current = nextChecked");
    expect(conversationInfoPanel).toContain("if (checked === pendingTargetRef.current)");
    expect(conversationInfoPanel).toContain("await onToggle?.(nextChecked)");
    expect(conversationInfoPanel).toContain("pendingTargetRef.current = null");
    expect(conversationInfoPanel).toContain("setOptimisticChecked(previous)");
    expect(conversationInfoPanel).toContain("readOnly={!canManageSettings}");
    expect(groupHook).toContain("setMuted: (muted: boolean) => Promise<void>");
    expect(groupHook).toContain("setMuteMode: (enabled: boolean) => Promise<void>");
    expect(groupHook).toContain("setPinned: (pinned: boolean) => Promise<void>");
    expect(groupHook).toContain("updateSettings: (settings: Partial<GroupSettingsDto>) => Promise<void>");
    expect(groupHook).toContain("pendingMutation.mutateAsync");
    expect(conversationInfoPanel).not.toContain(
      'label={t("messages.conversationInfo.fields.muted")}\n          value={conversation.isMuted',
    );
    expect(conversationInfoPanel).not.toContain('icon={<VolumeX size={14} />}\n          label={');
    expect(conversationInfoPanel).not.toContain("fields.latestMessage");
    expect(conversationInfoPanel).not.toContain("fields.unread");
    expect(conversationInfoPanel).not.toContain("unreadCount");
    expect(conversationInfoPanel).not.toContain("imConversationEffectiveUnreadCount");
    expect(conversationInfoPanel).not.toContain("unread={");
    expect(conversationInfoPanel).not.toContain("group-info-overview");
    expect(conversationInfoPanel).not.toContain("group-profile-title-editor");
    expect(conversationInfoPanel).not.toContain("GroupProfileQuickActions");
    expect(conversationInfoPanel).not.toContain("group-profile-actions");
    expect(conversationInfoPanel).not.toContain('className="customer-info-block group-profile-actions"');
    expect(conversationInfoPanel).not.toContain("renderWechatEmojiText");
  });

  it("uses a WeChat-style group name edit icon instead of a permanent input", () => {
    expect(conversationInfoPanel).toContain("group-title-edit-trigger");
    expect(conversationInfoPanel).toContain("group-title-value");
    expect(conversationInfoPanel).toContain('event.key === "Enter"');
    expect(conversationInfoPanel).toContain('event.key === "Escape"');
    expect(conversationInfoPanel).toContain("group-title-inline-editor");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.groupName");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.groupRemark");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.myGroupNickname");
    expect(conversationInfoPanel).not.toContain("group-profile-title-editor");
  });

  it("allows editing the local group remark and my nickname in the group", () => {
    expect(conversationInfoPanel).toContain("groupRemarkStoragePrefix");
    expect(conversationInfoPanel).toContain("readLocalGroupRemark");
    expect(conversationInfoPanel).toContain("writeLocalGroupRemark");
    expect(conversationInfoPanel).toContain("setLocalGroupRemark(nextRemark)");
    expect(conversationInfoPanel).toContain("displayedGroupRemark");
    expect(conversationInfoPanel).toContain("currentMember?.groupAlias");
    expect(conversationInfoPanel).toContain("detailRecord.myGroupAlias");
    expect(conversationInfoPanel).toContain("optimisticMyGroupNickname");
    expect(conversationInfoPanel).toContain("actions.updateMyGroupNickname(nextNickname)");
    expect(conversationInfoPanel).toContain("setOptimisticMyGroupNickname(nextNickname.trim())");
    expect(conversationInfoPanel).toContain("allowEmpty");
    expect(conversationInfoPanel).toContain("maxLength={64}");
    expect(groupHook).toContain("updateMyGroupNickname: (nickname: string) => Promise<void>");
    expect(groupHook).toContain("const targetUserId = session?.userId || session?.platformUserId || \"\"");
    expect(groupHook).toContain("api().updateGroupMemberAlias(id(), targetUserId, nickname.trim())");
    expect(groupHook).not.toContain("nickname.trim() || null");
    expect(groupHook).not.toContain("myGroupNickname: nickname.trim() || null");
    expect(groupHook).not.toContain("nicknameInGroup: nickname.trim() || null");
    expect(groupHook).toContain("messages.groupManagement.updateMyGroupNickname");
    expect(contactsClient).toContain("updateGroupMemberAlias(groupId: string, targetUserId: string, alias: string)");
    expect(contactsClient).toContain("endpointPlan.groupMemberAlias");
    expect(contactsClient).toContain("body: JSON.stringify({ alias })");
    expect(endpoints).toContain("groupMemberAlias");
    expect(endpoints).toContain("/groups/{groupId}/members/{targetUserId}/alias");
    expect(apiTypes).toContain("groupAlias?: string | null");
    expect(zhCnMessages).toContain("updateMyGroupNickname: '我在本群的昵称已更新。'");
    expect(conversationInfoPanel).not.toContain(
      '<GroupInfoValueRow label={t("messages.conversationInfo.groupRemark")}',
    );
    expect(conversationInfoPanel).not.toContain(
      '<GroupInfoValueRow label={t("messages.conversationInfo.myGroupNickname")}',
    );
  });

  it("keeps profile row controls right-aligned without horizontal jumping", () => {
    expect(messageCenterCss).toContain(".group-info-row {");
    expect(messageCenterCss).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(messageCenterCss).toContain(".group-title-value");
    expect(messageCenterCss).not.toContain("grid-template-columns: minmax(86px, auto) minmax(0, 1fr) auto;");
  });

  it("uses WeChat-style separators only between group profile sections", () => {
    expect(cssRuleBody(".group-info-list-section")).toContain("border-top: 1px solid #edf1f5;");
    expect(cssRuleBody(".group-info-list-section:first-child")).toContain("border-top: 0;");
    expect(cssRuleBody(".group-info-row")).not.toContain("border-bottom");
    expect(cssRuleBody(".group-info-action-button")).not.toContain("border-bottom");
    expect(cssRuleBody(".group-info-danger-button")).not.toContain("border-bottom");
    expect(conversationInfoPanel).toContain('className="group-info-danger-section"');
    expect(conversationInfoPanel).not.toContain(
      '<section className="group-info-danger-section">\n        <GroupInfoDangerButton\n          label={t("messages.conversationInfo.actions.clearHistory")}\n          onClick={() => onConversationAction?.("delete", conversation)}\n        />\n        {groupManagement?.permissions.canLeave && (',
    );
  });

  it("implements the group member nickname display toggle as a real message setting", () => {
    expect(conversationInfoPanel).toContain("messages.conversationInfo.showGroupMemberNicknames");
    expect(conversationInfoPanel).toContain("showGroupMemberNicknames = true");
    expect(conversationInfoPanel).toContain("onShowGroupMemberNicknamesChange");
    expect(conversationInfoPanel).toContain("onToggle={(nextChecked) => onShowGroupMemberNicknamesChange?.(nextChecked)}");
    expect(conversationStage).toContain("groupMemberNicknamePrefsKey");
    expect(conversationStage).toContain("readGroupMemberNicknamePrefs");
    expect(conversationStage).toContain("writeGroupMemberNicknamePrefs");
    expect(conversationStage).toContain("groupMemberNicknamePrefs[activeConversationId] !== false");
    expect(conversationStage).toContain("showGroupMemberNicknames={showGroupMemberNicknames}");
    expect(conversationStage).toContain("onShowGroupMemberNicknamesChange={setShowGroupMemberNicknames}");
    expect(conversationInfoViews).toContain("showGroupMemberNicknames = true");
    expect(conversationInfoViews).toContain("onShowGroupMemberNicknamesChange");
    expect(messageProfileDock).toContain("showGroupMemberNicknames = true");
    expect(messageProfileDock).toContain("onShowGroupMemberNicknamesChange");
    expect(messageListPanel).toContain("showGroupMemberNicknames?: boolean");
    expect(messageListPanel).toContain('conversation.conversationType !== "group" || showGroupMemberNicknames');
    expect(messageListPanel).toContain("showSenderName={");
    expect(chatMessageBubble).toContain("showSenderName = true");
    expect(chatMessageBubble).toContain("!mine && showSenderName");
    expect(zhCnMessages).toContain("showGroupMemberNicknames: '显示群成员昵称'");
  });

  it("places destructive profile actions as centered bottom text buttons", () => {
    expect(conversationInfoPanel).toContain("GroupInfoDangerButton");
    expect(conversationInfoPanel).toContain("group-info-danger-section");
    expect(conversationInfoPanel).toContain("group-info-danger-button");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.actions.clearHistory");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.actions.leaveGroup");
    expect(conversationInfoPanel).not.toContain('danger\n          icon={<Eraser size={15} />}');
    expect(conversationInfoPanel).not.toContain('icon={<LogOut size={15} />}');
  });

  it("uses WeChat-style group member grids with a permission-gated add tile", () => {
    expect(conversationInfoPanel).toContain("GroupMemberGrid");
    expect(conversationInfoPanel).toContain("group-member-grid");
    expect(conversationInfoPanel).toContain("group-member-add-tile");
    expect(conversationInfoPanel).toContain("group-member-remove-tile");
    expect(conversationInfoPanel).toContain("group-member-remove-badge");
    expect(conversationInfoPanel).toContain("messages.conversationInfo.addMemberTile");
    expect(conversationInfoPanel).toContain("const actionTileCount = (canInvite ? 1 : 0) + (canRemoveMembers ? 1 : 0)");
    expect(conversationInfoPanel).toContain("const maxMembers = preview ? Math.max(0, 12 - actionTileCount) : members.length");
    expect(conversationInfoPanel).toContain("{canInvite && (");
    expect(conversationInfoPanel).toContain("{canRemoveMembers && (");
    expect(conversationInfoPanel).toContain("setRemoveMode((value) => !value)");
    expect(conversationInfoPanel).toContain("removeMode && canRemove");
    expect(conversationInfoPanel).toContain("groupManagement?.actions.removeMember(member.userId)");
    expect(conversationInfoPanel).toContain("setMembersInviteOpen");
    expect(conversationInfoPanel).toContain("onOpenProfile?.(target, targetMember, { canAddFriend })");
    expect(conversationInfoPanel).toContain("GroupInviteDialog");
    expect(conversationInfoPanel).toContain("createPortal");
    expect(conversationInfoPanel).toContain("group-invite-dialog-left");
    expect(conversationInfoPanel).toContain("group-invite-dialog-right");
    expect(conversationInfoPanel).toContain("shareChatContent");
    expect(conversationInfoPanel).toContain("group-member-view-more");
    expect(conversationInfoPanel).toContain('onSelectTab("members")');
    expect(messageCenterCss).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(messageCenterCss).toContain(".group-member-add-tile span");
    expect(messageCenterCss).toContain(".group-member-add-tile-standalone");
    expect(messageCenterCss).toContain(".group-member-remove-tile span");
    expect(messageCenterCss).toContain(".group-member-remove-badge");
    expect(messageCenterCss).toContain("border: 2px dashed #c8cdd3;");
    expect(messageCenterCss).toContain(".group-invite-dialog-backdrop");
    expect(messageCenterCss).toContain("grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);");
    expect(messageCenterCss).toContain(".group-invite-dialog-search");
  });

  it("routes profile announcement and file summaries to real tabs", () => {
    expect(conversationInfoPanel).toContain("GroupInfoLinkedRow");
    expect(conversationInfoPanel).toContain('onSelectTab("announcements")');
    expect(conversationInfoPanel).toContain('onSelectTab("files")');
    expect(conversationInfoPanel).toContain("messages.conversationInfo.fileCount");
    expect(conversationInfoPanel).toContain("group-info-linked-row");
    expect(conversationInfoPanel).toContain("group-info-row-trailing");
  });

  it("makes announcement clicks edit for managers and read-only for members", () => {
    expect(conversationInfoPanel).toContain("GroupAnnouncementDetail");
    expect(conversationInfoPanel).toContain("permissions.canManageAnnouncements");
    expect(conversationInfoPanel).toContain('activeAnnouncementId === "new"');
    expect(conversationInfoPanel).toContain("group-announcement-new-button");
    expect(conversationInfoPanel).toContain("group-announcement-list-row");
    expect(conversationInfoPanel).toContain("group-announcement-readonly");
    expect(conversationInfoPanel).toContain("{canManage ? (");
    expect(conversationInfoPanel).toContain("actions.updateAnnouncement");
    expect(conversationInfoPanel).toContain("actions.createAnnouncement");
    expect(conversationInfoPanel).not.toContain("group-management-compose");
  });

  it("keeps group file rows as real links in a light list", () => {
    expect(conversationInfoPanel).toContain('className="group-file-row"');
    expect(conversationInfoPanel).toContain('href={file.url}');
    expect(conversationInfoPanel).toContain('target="_blank"');
    expect(conversationInfoPanel).toContain("groupFileFilterLabel");
    expect(messageCenterCss).toContain(".group-file-row {");
    expect(messageCenterCss).toContain("min-height: 44px !important;");
  });

  it("supports complete group announcement editing and member mute parameters", () => {
    expect(conversationInfoPanel).toContain("announcementTitlePlaceholder");
    expect(conversationInfoPanel).toContain("pinAnnouncement");
    expect(conversationInfoPanel).toContain("memberMuteDialog");
    expect(conversationInfoPanel).toContain("groupMuteUntilFromMinutes");
    expect(groupHook).toContain("muteUntil: muted ? options?.muteUntil ?? null : null");
    expect(groupHook).toContain("reason: muted ? options?.reason ?? null : null");
    expect(contactsClient).toContain("reason?: string | null");
  });

  it("shows the complete group permission switches in the profile panel", () => {
    [
      "allowQrCodeJoin",
      "requireApproval",
      "allowMemberModifyTitle",
      "allowMemberInvite",
      "allowMemberAtAll",
      "allowMemberAddFriend",
      "allowMemberViewMemberList",
    ].forEach((key) => {
      expect(conversationInfoPanel).toContain(key);
    });
    expect(conversationInfoPanel).toContain("profileSettingRows.slice(0, 5)");
    expect(conversationInfoPanel).toContain("profileSettingRows.slice(5)");
  });

  it("routes group member profile clicks to the full contact profile actions", () => {
    expect(messageCenter).toContain("handleGroupMemberProfileOpen");
    expect(messageCenter).toContain("setContactCardProfile");
    expect(messageCenter).toContain("normalizeContactCard");
    expect(messageCenter).toContain("canAddCurrentGroupMemberFriend");
    expect(messageCenter).toContain("allowFriendRequest: options?.canAddFriend ?? canAddCurrentGroupMemberFriend");
    expect(conversationStage).toContain("onOpenGroupMemberProfile={onOpenGroupMemberProfile}");
    expect(contactCardModel).toContain("signature");
    expect(contactCardModel).toContain("source");
    expect(contactCardModel).toContain("allowFriendRequest?: boolean");
    expect(conversationInfoViews).toContain("const canSendFriendRequest = card.allowFriendRequest !== false");
    expect(conversationInfoViews).toContain('relation.status === "none" && canSendFriendRequest');
  });

  it("routes message avatar clicks in direct and group chats to the full contact profile", () => {
    expect(interactionHandlers).toContain("buildMessageAvatarContactCard");
    expect(interactionHandlers).toContain("setContactCardProfile");
    expect(interactionHandlers).toContain("resolveMessageSenderGroupMember");
    expect(interactionHandlers).toContain("canAddGroupMemberFriend = true");
    expect(interactionHandlers).toContain('activeConversation.conversationType === "group" ? canAddGroupMemberFriend : true');
    expect(interactionHandlers).not.toContain('conversationType === "group") return');
    expect(interactionHandlers).not.toContain("buildAvatarProfilePopover");
  });

  it("keeps internal member ids out of the searchable member presentation", () => {
    expect(conversationInfoPanel).toContain(
      "member.groupAlias",
    );
    expect(conversationInfoPanel).not.toContain("member.userId].some");
    expect(conversationInfoPanel).not.toContain("member.platformUserId].some");
  });

  it("declares the client group management endpoints and methods", () => {
    [
      "groupDetail",
      "groupMemberRole",
      "groupMemberAlias",
      "groupMemberMute",
      "groupSettings",
      "groupAnnouncements",
      "groupJoinRequests",
      "groupFiles",
      "groupLeave",
      "groupPin",
      "groupMute",
    ].forEach((key) => expect(endpoints).toContain(key));
    [
      "getGroupDetail",
      "updateGroupDetail",
      "disbandGroup",
      "addGroupMembers",
      "removeGroupMember",
      "transferGroupOwner",
      "setGroupMemberRole",
      "updateGroupMemberAlias",
      "setGroupMemberMute",
      "getGroupSettings",
      "updateGroupSettings",
      "getGroupAnnouncements",
      "getGroupJoinRequests",
      "getGroupFiles",
    ].forEach((method) => expect(contactsClient).toContain(method));
  });

  it("invalidates conversation and group management queries after mutations", () => {
    expect(groupHook).toContain('invalidateQueries({ queryKey: ["pc-im-conversations"] })');
    expect(groupHook).toContain('invalidateQueries({ queryKey: ["pc-group-members"] })');
    expect(groupHook).toContain('"pc-group-management"');
  });
});
