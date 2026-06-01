import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("message lookup UI", () => {
  const header = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageChatHeader.tsx"),
    "utf8",
  );
  const stage = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageCenterConversationStage.tsx"),
    "utf8",
  );
  const listPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageListPanel.tsx"),
    "utf8",
  );
  const messageCenter = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
    "utf8",
  );
  const contactProfileController = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageContactProfileController.ts"),
    "utf8",
  );
  const messageInteractionHandlers = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageInteractionHandlers.ts"),
    "utf8",
  );
  const conversationInfoPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ConversationInfoPanel.tsx"),
    "utf8",
  );
  const startDialogs = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageStartDialogs.tsx"),
    "utf8",
  );
  const conversationListPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageConversationListPanel.tsx"),
    "utf8",
  );
  const conversationSidebar = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageConversationSidebar.tsx"),
    "utf8",
  );
  const messageContextRail = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageContextRail.tsx"),
    "utf8",
  );
  const messageComposerSurface = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageComposerSurface.tsx"),
    "utf8",
  );
  const chatContextMenus = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ChatContextMenus.tsx"),
    "utf8",
  );
  const messageContextMenuModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/messageContextMenuModel.ts"),
    "utf8",
  );
  const sidebar = readFileSync(
    resolve(process.cwd(), "src/renderer/components/Sidebar.tsx"),
    "utf8",
  );
  const reminderCenter = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ReminderCenter.tsx"),
    "utf8",
  );
  const messageCenterCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/message-center.css"),
    "utf8",
  );
  const contextMenuCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/context-menu.css"),
    "utf8",
  );

  it("uses one WeChat-style lookup entry instead of separate search and history buttons", () => {
    expect(header).toContain("onToggleLookup");
    expect(header).toContain("查找聊天内容");
    expect(header).not.toContain("onToggleHistory");
    expect(header).not.toContain("onToggleSearch");
    expect(header).not.toContain("Clock3");
  });

  it("closes standalone profile before opening lookup from the chat header", () => {
    expect(stage).toContain("onToggleLookup={() => {");
    expect(stage).toContain('const nextOpen = profileStandaloneOpen ? true : !(messageSearchOpen || historyOpen)');
    expect(stage).toContain("setHistoryOpen(nextOpen)");
    expect(stage).toContain("setMessageSearchOpen(nextOpen)");
    expect(stage).toContain("setProfileStandaloneOpen(false)");
  });

  it("clears hidden lookup state when opening standalone customer info", () => {
    expect(stage).toContain("const toggleProfileFromRail = () => {");
    expect(stage).toContain("setHistoryOpen(false)");
    expect(stage).toContain("setMessageSearchOpen(false)");
    expect(stage).toContain("setProfileStandaloneOpen(true)");
    expect(stage).toContain("onToggleProfile={toggleProfileFromRail}");
  });

  it("renders one unified lookup panel with search, type filters and a close action", () => {
    expect(listPanel).toContain("const lookupOpen = messageSearchOpen || historyOpen");
    expect(listPanel).toContain("chat-lookup-panel");
    expect(listPanel).toContain("关闭查找");
    expect(listPanel).toContain("没有匹配的聊天记录");
    expect(listPanel).not.toContain("chat-inline-panel");
  });

  it("loads im_direct profile-card for ordinary IM customer info and refreshes existing caches after edits", () => {
    expect(messageCenter).toContain("useMessageContactProfileController");
    expect(messageCenter).toContain("contactProfileController.profileQuery.data");
    expect(contactProfileController).toContain('getThreadProfileCard(');
    expect(contactProfileController).toContain('"im_direct"');
    expect(contactProfileController).toContain("pcQueryKeys.customerServiceThreadProfile");
    expect(contactProfileController).toContain("getFriendProfileExtra(activeFriendUserId)");
    expect(contactProfileController).toContain("updateFriendProfileMutation");
    expect(contactProfileController).toContain('queryClient.invalidateQueries({ queryKey: ["pc-friends"] })');
    expect(contactProfileController).toContain("pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken)");
    expect(conversationInfoPanel).toContain('errorMode="silent"');
    expect(conversationInfoPanel).toContain('variant="im"');
  });

  it("passes loaded direct profile data into the avatar light profile card", () => {
    expect(messageCenter).toContain("useMessageInteractionHandlers({");
    expect(messageCenter).toContain("profile: contactProfileController.profileQuery.data");
    expect(messageCenter).toContain("profileExtra: contactProfileController.profileExtraQuery.data");
    expect(contactProfileController).toContain("getFriendProfileExtra(activeFriendUserId)");
    expect(stage).toContain("handleAvatarClick");
  });

  it("positions message contact-card profile dialogs as viewport-safe anchored popovers", () => {
    expect(messageInteractionHandlers).toContain("resolveFloatingProfilePosition");
    expect(messageInteractionHandlers).toContain("CONTACT_CARD_PROFILE_POPOVER_SIZE");
    expect(messageInteractionHandlers).toContain("anchor.right + PROFILE_POPOVER_GAP");
    expect(messageInteractionHandlers).toContain("anchor.left - panelWidth - PROFILE_POPOVER_GAP");
    expect(messageInteractionHandlers).not.toContain("rect.left + 44");
    expect(contextMenuCss).toContain(".pc-avatar-profile-popover.contact-card-profile-dialog");
    expect(contextMenuCss).toContain("max-height: calc(100vh - 32px)");
    expect(contextMenuCss).toContain("scrollbar-gutter: stable");
  });

  it("only shows real direct-chat customer channel chips in the IM header", () => {
    expect(header).toContain("customerApplicationName");
    expect(header).toContain("customerSource");
    expect(header).toContain("chat-header-meta-chips");
    expect(header).toContain("渠道应用");
    expect(header).toContain("来源渠道");
    expect(header).not.toContain("conversationMetaText");
    expect(stage).toContain("directCustomerHeaderMeta");
    expect(stage).toContain("readCustomerHeaderApplicationName(profileData)");
    expect(stage).toContain("readCustomerHeaderSource(profileData, profileExtra)");
    expect(stage).toContain("customerApplicationName={directCustomerHeaderMeta.applicationName}");
    expect(stage).toContain("customerSource={directCustomerHeaderMeta.source}");
    expect(stage).not.toContain("excludedHeaderSources");
    expect(stage).not.toContain("\"客户通讯录\"");
    expect(stage).not.toContain("\"好友通讯录\"");
    expect(stage).not.toContain("\"好友私聊\"");
  });

  it("lets standalone customer info consume the composer row instead of leaving a blank footer", () => {
    expect(stage).toContain("profile-standalone-open");
    expect(stage).toContain('profileStandaloneOpen ? "profile-standalone-open" : ""');
    expect(messageCenterCss).toContain(".e-chat-panel.profile-standalone-open");
    expect(messageCenterCss).toContain("grid-template-rows: 72px minmax(0, 1fr)");
  });

  it("keeps IM customer info, quick replies and knowledge base in the right rail without AI drafting", () => {
    expect(stage).toContain("MessageContextRail");
    expect(stage).toContain("activeAssistantPane");
    expect(stage).toContain("onToggleAssistantPane={(pane) => {");
    expect(stage).toContain("showAiTools={canOpenAiAssistant}");
    expect(messageCenter).toContain("canOpenAiAssistant={false}");
    expect(stage).toContain('if (pane === "knowledge")');
    expect(messageContextRail).toContain("message-context-rail");
    expect(messageContextRail).toContain("message-context-rail-avatar");
    expect(messageContextRail).not.toContain("UserRound");
    expect(messageContextRail).toContain("MessageSquareText");
    expect(messageContextRail).toContain("{showAiTools &&");
    expect(messageContextRail).toContain("LibraryBig");
    expect(messageContextRail).toContain('activeAssistantPane === "quickReply"');
    expect(messageContextRail).toContain('activeAssistantPane === "knowledge"');
    expect(messageComposerSurface).toContain("{showAiTools &&");
    expect(messageCenter).toContain("assistantPaneVisible");
    expect(messageCenter).toContain("messageProfilePinned");
    expect(messageCenter).toContain("messageContextPaneOrder");
    expect(messageCenter).not.toContain("AiReplySuggestionPanel");
    expect(messageCenter).not.toContain("aiReplyTargetForDirectConversation");
    expect(messageCenter).not.toContain("pc-cs-staff-service-history");
    expect(messageContextMenuModel).not.toContain("ai_reply");
    expect(chatContextMenus).not.toContain("AI 起草");
    expect(messageCenter).toContain('messageLayoutMode === "no-profile"');
    expect(messageCenterCss).toContain(".message-context-rail");
    expect(messageCenterCss).toContain(".message-context-rail-actions button.active");
  });

  it("adds a first-class add-friend action to the message plus menu", () => {
    expect(startDialogs).toContain('action: "addFriend"');
    expect(startDialogs).toContain("添加好友");
    expect(startDialogs).toContain("UserPlus");
    expect(conversationListPanel).toContain('title="创建与添加"');
    expect(conversationListPanel).toContain("friendRequestCount");
    expect(conversationSidebar).toContain('if (action === "addFriend")');
    expect(conversationSidebar).toContain("onAddFriend");
    expect(messageCenter).toContain("addFriendDialogOpen");
    expect(messageCenter).toContain("ContactAddFriendDialog");
    expect(messageCenter).toContain("useContactAddFriendController");
  });

  it("surfaces incoming friend requests across navigation, message plus and reminders", () => {
    expect(conversationListPanel).toContain("message-plus-request-badge");
    expect(conversationListPanel).toContain("friendRequestCount > 0");
    expect(startDialogs).toContain("friendRequestCount");
    expect(sidebar).toContain("useFriendRequestReminderController");
    expect(sidebar).toContain('item.key === "contacts"');
    expect(sidebar).toContain("pendingIncomingRequestCount");
    expect(sidebar).toContain("条好友申请");
    expect(reminderCenter).toContain('item.targetModule === "contacts"');
    expect(reminderCenter).toContain('setContactFilter("requests")');
    expect(reminderCenter).toContain("处理申请");
  });
});
