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
  const messageListModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/messageListModel.ts"),
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
  const sharedComposerSurface = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatComposerSurface.tsx"),
    "utf8",
  );
  const chatMessageBubble = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatMessageBubble.tsx"),
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
  const accountUtilityPages = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AccountUtilityPages.tsx"),
    "utf8",
  );
  const productPagesCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/pages/product-pages.css"),
    "utf8",
  );
  const zhCnMessages = readFileSync(
    resolve(process.cwd(), "src/renderer/i18n/messages/zh-CN.ts"),
    "utf8",
  );
  const contextMenuCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/context-menu.css"),
    "utf8",
  );

  it("uses one WeChat-style lookup entry instead of separate search and history buttons", () => {
    expect(header).toContain("onToggleLookup");
    expect(header).toContain("lookupPointerHandledRef");
    expect(header).toContain("onPointerDown");
    expect(header).toContain("onClick={() => {");
    expect(header).toContain('t("messages.chatHeader.searchMessages")');
    expect(header).not.toContain("onToggleHistory");
    expect(header).not.toContain("onToggleSearch");
    expect(header).not.toContain("Clock3");
    expect(messageCenterCss).toContain(".e-chat-panel.group-chat-mode .e-chat-actions");
    expect(messageCenterCss).toContain("z-index: 12");
    expect(messageCenterCss).toContain("pointer-events: auto");
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
    expect(listPanel).toContain('t("messages.listPanel.closeSearch")');
    expect(listPanel).toContain("emptyText");
    expect(listPanel).not.toContain("chat-inline-panel");
  });

  it("previews image and video chat history as a thumbnail grid", () => {
    expect(listPanel).toContain("chatMediaItemsFromMessage");
    expect(listPanel).toContain("showMediaLookupPreview");
    expect(listPanel).toContain("groupLookupMediaPreviewItems");
    expect(listPanel).toContain("lookupMediaPreviewItemsFromMessage");
    expect(listPanel).toContain("chat-history-media-results");
    expect(listPanel).toContain("chat-history-media-grid");
    expect(listPanel).toContain("chat-history-media-tile");
    expect(listPanel).toContain("LookupMediaThumbnail");
    expect(listPanel).toContain("useCachedImageMediaUrl");
    expect(listPanel).toContain("previewUrls");
    expect(listPanel).toContain("hasNextPreview");
    expect(listPanel).toContain('item.kind === "video"');
    expect(listPanel).toContain("? item.posterUrl");
    expect(listPanel).toContain("openLookupMediaPreview(item)");
    expect(listPanel).toContain("setLookupImagePreview({ fileName: item.fileName, src: openUrl })");
    expect(listPanel).toContain("openMessageVideoPlayer(item.message, openUrl, authToken, cacheContext)");
    expect(listPanel).toContain("openMessageMediaFile(item.message, openUrl, authToken, cacheContext)");
    expect(listPanel).toContain("chat-lookup-image-preview");
    expect(listPanel).toContain("openUrl: item.localOpenUrl || item.remoteSourceUrl || item.sourceUrl");
    expect(listPanel).not.toContain('key: "video"');
    expect(messageListModel).toContain('filter === "image"');
    expect(messageListModel).toContain("Boolean(body.image || body.video)");
    expect(messageListModel).not.toContain('"video",\n  "link"');
    expect(zhCnMessages).toContain("image: '图片与视频'");
    expect(messageCenterCss).toContain(".chat-history-media-grid");
    expect(messageCenterCss).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(messageCenterCss).toContain(".chat-history-media-tile img");
    expect(messageCenterCss).toContain(".chat-history-media-video");
  });

  it("previews favorite images and videos from real media fields", () => {
    expect(accountUtilityPages).toContain("favoriteMediaPreviewFromItem");
    expect(accountUtilityPages).toContain("chatMediaItemsFromMessage({ assetBaseUrl, message })");
    expect(accountUtilityPages).toContain("favorite-media-preview");
    expect(accountUtilityPages).toContain("setImagePreview({ fileName: preview.fileName, src: openUrl })");
    expect(accountUtilityPages).toContain("openMessageVideoPlayer(preview.message, openUrl, authToken, cacheContext)");
    expect(accountUtilityPages).toContain("openMessageMediaFile(preview.message, openUrl, authToken, cacheContext)");
    expect(accountUtilityPages).toContain("message-image-preview favorite-image-preview");
    expect(accountUtilityPages).toContain('"imageUrl"');
    expect(accountUtilityPages).toContain('"videoUrl"');
    expect(accountUtilityPages).toContain('"thumbnailUrl"');
    expect(productPagesCss).toContain(".favorite-media-preview");
    expect(productPagesCss).toContain(".favorite-media-preview img");
    expect(productPagesCss).toContain(".favorite-media-video");
    expect(zhCnMessages).toContain("previewMedia: '预览{name}'");
  });

  it("renders an empty message list as a centered event notice instead of a regular panel state", () => {
    expect(listPanel).toContain("pc-chat-empty-event");
    expect(listPanel).toContain('<span className="pc-chat-event-pill">{emptyText}</span>');
    expect(listPanel).not.toContain('<PanelState className="e-panel-state" text={emptyText} tone={false} />');
    expect(messageCenterCss).toContain(".pc-chat-empty-event");
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
    expect(header).toContain('t("messages.chatHeader.channelApp"');
    expect(header).toContain('t("messages.chatHeader.sourceChannel"');
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
    expect(messageContextRail).toContain("isGroup");
    expect(messageContextRail).toContain("UsersRound");
    expect(messageContextRail).toContain("UserRound");
    expect(messageContextRail).toContain("collapseGroupInfo");
    expect(messageContextRail).toContain("expandGroupInfo");
    expect(messageContextRail).toContain("collapseUserInfo");
    expect(messageContextRail).toContain("expandUserInfo");
    expect(messageContextRail).not.toContain('src="/customer-info-entry.svg"');
    expect(stage).not.toContain("<MessageContextRail\n        activeAssistantPane={activeAssistantPane}\n        conversation={activeConversation}\n        groupAvatar={");
    expect(zhCnMessages).toContain("collapseGroupInfo: '收起群聊信息'");
    expect(zhCnMessages).toContain("expandGroupInfo: '展开群聊信息'");
    expect(messageContextRail).toContain("MessageSquareText");
    expect(messageContextRail).toContain("{showAiTools &&");
    expect(messageContextRail).toContain("LibraryBig");
    expect(messageContextRail).toContain('activeAssistantPane === "quickReply"');
    expect(messageContextRail).toContain('activeAssistantPane === "knowledge"');
    expect(messageComposerSurface).toContain("showAiTools={showAiTools}");
    expect(sharedComposerSurface).toContain("const showServiceAiTool = serviceMode || showAiTools");
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
    expect(startDialogs).toContain('t("messages.start.addFriend")');
    expect(startDialogs).toContain("UserPlus");
    expect(conversationListPanel).toContain('title={t("messages.conversationList.createAndAdd")}');
    expect(conversationListPanel).toContain("friendRequestCount");
    expect(conversationSidebar).toContain('if (action === "addFriend")');
    expect(conversationSidebar).toContain("onAddFriend");
    expect(messageCenter).toContain("addFriendDialogOpen");
    expect(messageCenter).toContain("ContactAddFriendDialog");
    expect(messageCenter).toContain("useContactAddFriendController");
  });

  it("marks direct read receipts with a green check without changing unread receipts", () => {
    expect(chatMessageBubble).toContain('model.status.receipt === "read"');
    expect(chatMessageBubble).toContain("pc-chat-receipt-icon");
    expect(chatMessageBubble).toContain('className={`pc-chat-receipt${readReceipt ? " read" : ""}`}');
    expect(messageCenterCss).toContain(".pc-chat-receipt.read");
    expect(messageCenterCss).toContain("color: #10b981");
  });

  it("surfaces incoming friend requests across navigation, message plus and reminders", () => {
    expect(conversationListPanel).toContain("message-plus-request-badge");
    expect(conversationListPanel).toContain("friendRequestCount > 0");
    expect(startDialogs).toContain("friendRequestCount");
    expect(sidebar).toContain("useFriendRequestReminderController");
    expect(sidebar).toContain('item.key === "contacts"');
    expect(sidebar).toContain("pendingIncomingRequestCount");
    expect(sidebar).toContain('t("sidebar.badge.friendRequestsSuffix"');
    expect(reminderCenter).toContain('item.targetModule === "contacts"');
    expect(reminderCenter).toContain('setContactFilter("requests")');
    expect(reminderCenter).toContain('t("reminder.action.handleRequest")');
  });
});
