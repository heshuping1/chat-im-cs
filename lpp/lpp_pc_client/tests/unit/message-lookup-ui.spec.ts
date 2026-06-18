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
  const historyLookupDialog = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/MessageHistoryLookupDialog.tsx"),
    "utf8",
  );
  const messageListModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/messageListModel.ts"),
    "utf8",
  );
  const messageCacheMutationModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/messageCacheMutationModel.ts"),
    "utf8",
  );
  const messageCenter = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageCenter.tsx"),
    "utf8",
  );
  const messageListData = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useMessageListData.ts"),
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
  const conversationListParts = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/ConversationListParts.tsx"),
    "utf8",
  );
  const conversationListIdentityModel = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/models/conversationListIdentityModel.ts"),
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
  const directReadReceiptSync = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/hooks/useDirectReadReceiptSync.ts"),
    "utf8",
  );
  const chatMessageBubble = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatMessageBubble.tsx"),
    "utf8",
  );
  const groupReadReceiptPopover = readFileSync(
    resolve(process.cwd(), "src/renderer/messages/components/GroupReadReceiptPopover.tsx"),
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
  const scrollbarBridgeCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/shared/scrollbar-theme-bridge.css"),
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

  it("renders chat history lookup as a modal outside the message list", () => {
    expect(stage).toContain("MessageHistoryLookupDialog");
    expect(stage).toContain("(historyOpen || messageSearchOpen)");
    expect(historyLookupDialog).toContain("message-history-lookup-dialog chat-lookup-panel");
    expect(historyLookupDialog).toContain('t("messages.listPanel.wechatHistoryTitle"');
    expect(historyLookupDialog).toContain('t("messages.listPanel.closeSearch")');
    expect(historyLookupDialog).toContain("lookupScope.limitedToLoadedRange");
    expect(historyLookupDialog).toContain("t(lookupScope.labelKey)");
    expect(historyLookupDialog).toContain("lookupResultMessages.map");
    expect(historyLookupDialog).toContain("isMineMessage?.(message)");
    expect(historyLookupDialog).toContain("currentUserDisplayName || message.senderDisplayName || \"我\"");
    expect(stage).toContain("isMineMessage={(message) => isMineMessage(message, unreadIdentity ?? session)}");
    expect(stage).toContain("currentUserDisplayName={session?.displayName}");
    expect(stage).toContain("currentUserAvatarUrl={session?.avatarUrl}");
    expect(historyLookupDialog).toContain('window.addEventListener("keydown", onKeyDown, true)');
    expect(historyLookupDialog).toContain("if (lookupImagePreview)");
    expect(historyLookupDialog).not.toContain("scrollbarMetrics.visible");
    expect(historyLookupDialog).not.toContain("updateLookupScrollbar");
    expect(historyLookupDialog).not.toContain("messages.slice(0, 8)");
    expect(historyLookupDialog).not.toContain("messages.slice(-6)");
    expect(messageListModel).toContain("createMessageLookupScope");
    expect(messageCenter).toContain("messagesHydrationSource");
    expect(listPanel).toContain("emptyText");
    expect(listPanel).toContain("const windowingEnabled = !unreadJump");
    expect(listPanel).not.toContain("const lookupOpen = messageSearchOpen || historyOpen");
    expect(listPanel).not.toContain("chat-lookup-panel");
    expect(listPanel).not.toContain("chat-inline-panel");
    expect(messageCenterCss).toContain(".message-history-lookup-backdrop");
    expect(messageCenterCss).toContain(".message-history-lookup-dialog");
    expect(messageCenterCss).toContain("overflow-y: scroll !important");
    expect(messageCenterCss).toContain("scrollbar-gutter: stable !important");
    expect(messageCenterCss).toContain("scrollbar-width: thin !important");
    expect(messageCenterCss).toContain("width: 6px !important");
    expect(messageCenterCss).toContain(".message-history-lookup-dialog .chat-history-results.is-scrolling");
    expect(messageCenterCss).toContain(".message-history-lookup-results-shell");
    expect(messageCenterCss).not.toContain(".message-history-lookup-scrollbar");
    expect(messageCenterCss).toContain(".message-history-lookup-backdrop .message-image-preview");
    expect(messageCenterCss).toContain("z-index: 240");
  });

  it("keeps conversation row clicks delegated and rows memoized for fast switching", () => {
    expect(conversationListPanel).toContain("const conversationsById = useMemo");
    expect(conversationListPanel).toContain("conversationFromListEvent");
    expect(conversationListPanel).toContain("onClick={handleConversationListClick}");
    expect(conversationListPanel).toContain("onContextMenu={handleConversationListContextMenu}");
    expect(conversationListPanel).not.toContain("onClick={() => onConversationClick(item)}");
    expect(conversationListPanel).not.toContain("onContextMenu={(event) => onConversationContextMenu(event, item)}");
    expect(conversationListParts).toContain("export const ConversationRow = memo");
    expect(conversationListParts).toContain("areConversationRowsEqual");
    expect(conversationListParts).toContain("data-conversation-id={conversation.conversationId}");
  });

  it("keeps chat history filters scoped to the lookup dialog", () => {
    expect(messageListData).toContain("const visibleMessages = useMemo(");
    expect(messageListData).toContain('filterVisibleMessages(messages, "")');
    expect(messageListData).toContain("const lookupMessages = useMemo(");
    expect(messageListData).toContain("filterMessagesByHistory(searchSource, lookupOpen ? historyFilter : \"all\")");
    expect(messageListData).toContain("lookupMessages,");
    expect(messageCenter).toContain("lookupMessages");
    expect(stage).toContain("lookupMessages: MessageItemDto[]");
    expect(stage).toContain("messages={visibleMessages}");
    expect(stage).toContain("messages={lookupMessages}");
  });

  it("keeps popup scrollbars from shifting dialog content", () => {
    [
      ".app-shell .message-history-lookup-dialog .chat-history-results",
      ".app-shell .pc-forward-targets",
      ".app-shell .message-contact-targets",
      ".app-shell .pc-group-read-receipt-body",
      ".app-shell .group-invite-dialog-list",
      ".app-shell .group-invite-selected-area",
      ".app-shell .pc-avatar-profile-popover.contact-card-profile-dialog",
      ".app-shell .contacts-add-layout",
      ".app-shell .contacts-add-results",
      ".app-shell .account-popover",
      ".app-shell .space-radar-list",
      ".app-shell .cs-knowledge-result-list",
      ".app-shell .cs-knowledge-preview p",
      ".app-shell .cs-quick-reply-filter-rail",
      ".app-shell .cs-quick-reply-list",
      ".app-shell .cs-quick-reply-preview p",
      ".app-shell .cs-ai-preview p",
      ".app-shell .cs-ai-suggestion-list",
    ].forEach((selector) => {
      expect(scrollbarBridgeCss).toContain(selector);
    });

    expect(scrollbarBridgeCss).toContain("overflow-y: scroll !important");
    expect(scrollbarBridgeCss).toContain("scrollbar-gutter: stable !important");
    expect(scrollbarBridgeCss).toContain("scrollbar-width: thin !important");
    expect(scrollbarBridgeCss).toContain("scrollbar-color: transparent transparent !important");
    expect(scrollbarBridgeCss).toContain("width: 6px !important");
    expect(scrollbarBridgeCss).toContain(
      ".app-shell .message-history-lookup-dialog .chat-history-results.is-scrolling",
    );
    expect(scrollbarBridgeCss).toContain(
      ".app-shell .pc-forward-targets.is-scrolling::-webkit-scrollbar-thumb",
    );
    expect(scrollbarBridgeCss).toContain("background: rgba(156, 163, 175, 0.42) !important");
  });

  it("previews image and video chat history as a thumbnail grid", () => {
    expect(historyLookupDialog).toContain("chatMediaItemsFromMessage");
    expect(historyLookupDialog).toContain("showMediaLookupPreview");
    expect(historyLookupDialog).toContain("groupLookupMediaPreviewItems");
    expect(historyLookupDialog).toContain("lookupMediaPreviewItemsFromMessage");
    expect(historyLookupDialog).toContain("chat-history-media-results");
    expect(historyLookupDialog).toContain("chat-history-media-grid");
    expect(historyLookupDialog).toContain("chat-history-media-tile");
    expect(historyLookupDialog).not.toContain("chat-history-overview-categories");
    expect(historyLookupDialog).not.toContain("overviewCategories");
    expect(historyLookupDialog).toContain("showFileLookup");
    expect(historyLookupDialog).toContain("showDateLookup");
    expect(historyLookupDialog).toContain("LookupFileResultRow");
    expect(historyLookupDialog).toContain("LookupDatePicker");
    expect(historyLookupDialog).toContain("LookupMediaThumbnail");
    expect(historyLookupDialog).toContain("LookupVideoThumbnail");
    expect(historyLookupDialog).toContain("useVideoPosterSource");
    expect(historyLookupDialog).toContain("mediaMaterializationCacheKey");
    expect(historyLookupDialog).toContain("getMaterializedMediaDisplayUrl");
    expect(historyLookupDialog).toContain("subscribeMaterializedMediaDisplayUrl");
    expect(historyLookupDialog).toContain("mediaStableCacheIdentity");
    expect(historyLookupDialog).toContain("LookupImagePreviewViewer");
    expect(historyLookupDialog).toContain("useCachedImageMediaUrl");
    expect(historyLookupDialog).toContain("ImagePreviewViewer");
    expect(historyLookupDialog).toContain("previewUrls");
    expect(historyLookupDialog).toContain("compactUniqueMediaUrls");
    expect(historyLookupDialog).toContain("...(item.imageSourceUrls ?? [])");
    expect(historyLookupDialog).toContain("item.localPreviewUrl");
    expect(historyLookupDialog).toContain("item.localOpenUrl");
    expect(historyLookupDialog).toContain("item.remoteSourceUrl");
    expect(historyLookupDialog).toContain("hasNextPreview");
    expect(historyLookupDialog).toContain('item.kind === "video"');
    expect(historyLookupDialog).toContain("? item.posterUrl");
    expect(historyLookupDialog).toContain("openLookupMediaPreview(item)");
    expect(historyLookupDialog).toContain("cacheKey: item.previewCacheKey");
    expect(historyLookupDialog).toContain("useCachedImageMediaUrl(preview.src, authToken, preview.cacheKey)");
    expect(historyLookupDialog).toContain("src={displaySrc || preview.src}");
    expect(historyLookupDialog).toContain("videoPreviewUrl");
    expect(historyLookupDialog).toContain("media: item.media");
    expect(historyLookupDialog).toContain("sourceUrl: item.sourceUrl");
    expect(historyLookupDialog).toContain("remoteSourceUrl: item.remoteSourceUrl");
    expect(historyLookupDialog).toContain("localOpenUrl: item.localOpenUrl");
    expect(historyLookupDialog).toContain("posterUrl: item.kind === \"video\" ? item.posterUrl : undefined");
    expect(historyLookupDialog).toContain("const src = displaySrc || previewUrl || \"\"");
    expect(historyLookupDialog).toContain("displaySrc: videoDisplaySrc");
    expect(historyLookupDialog).toContain("explicitPoster");
    expect(historyLookupDialog).toContain("mediaCacheContext: { accountId, conversationId }");
    expect(historyLookupDialog).toContain("chat-history-video-frame");
    expect(historyLookupDialog).toContain("chat-history-video-poster");
    expect(historyLookupDialog).toContain("chat-history-video-placeholder");
    expect(historyLookupDialog).toContain("chat-history-video-play");
    expect(historyLookupDialog).not.toContain("<video");
    expect(historyLookupDialog).not.toContain('preload="metadata"');
    expect(historyLookupDialog).toContain("openMessageVideoPlayer(item.message, openUrl, authToken, cacheContext)");
    expect(historyLookupDialog).toContain("openMessageMediaFile(item.message, openUrl, authToken, cacheContext)");
    expect(historyLookupDialog).not.toContain("chat-lookup-image-preview");
    expect(historyLookupDialog).toContain("item.localOpenUrl ||");
    expect(historyLookupDialog).toContain("compactUniqueMediaUrls(item.imageSourceUrls ?? [])[0]");
    expect(historyLookupDialog).not.toContain('key: "video"');
    expect(listPanel).not.toContain("chatMediaItemsFromMessage");
    expect(messageListModel).toContain('filter === "image"');
    expect(messageListModel).toContain("Boolean(body.image || body.video)");
    expect(messageListModel).not.toContain('"video",\n  "link"');
    expect(zhCnMessages).toContain("image: '图片与视频'");
    expect(messageCenterCss).toContain(".chat-history-media-grid");
    expect(messageCenterCss).toContain("padding: 0 18px 18px;");
    expect(messageCenterCss).toContain("grid-template-columns: repeat(auto-fill, minmax(118px, 148px));");
    expect(messageCenterCss).toContain("grid-template-columns: repeat(auto-fill, minmax(220px, 280px));");
    expect(messageCenterCss).toContain(".chat-history-media-tile img");
    expect(messageCenterCss).toContain(".chat-history-video-frame");
    expect(messageCenterCss).toContain(".chat-history-video-frame::before");
    expect(messageCenterCss).toContain(".chat-history-video-poster");
    expect(messageCenterCss).toContain(".chat-history-video-placeholder");
    expect(messageCenterCss).toContain(".chat-history-video-play");
    expect(messageCenterCss).toContain(".chat-history-media-video");
    expect(messageCenterCss).toContain("max-height: min(560px, calc(100vh - 290px));");
  });

  it("previews favorite images and videos from real media fields", () => {
    expect(accountUtilityPages).toContain("favoriteMediaPreviewFromItem");
    expect(accountUtilityPages).toContain("chatMediaItemsFromMessage({ assetBaseUrl, message })");
    expect(accountUtilityPages).toContain("favorite-media-preview");
    expect(accountUtilityPages).toContain("FavoriteImagePreviewViewer");
    expect(accountUtilityPages).toContain("useCachedImageMediaUrl(preview.src, authToken, preview.cacheKey)");
    expect(accountUtilityPages).toContain("ImagePreviewViewer");
    expect(accountUtilityPages).toContain("cacheKey: preview.cacheKey");
    expect(accountUtilityPages).toContain('cacheKey: mediaItem.kind === "image" ? mediaItem.imageCacheKey : undefined');
    expect(accountUtilityPages).toContain("openMessageVideoPlayer(preview.message, openUrl, authToken, cacheContext)");
    expect(accountUtilityPages).toContain("openMessageMediaFile(preview.message, openUrl, authToken, cacheContext)");
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

  it("keeps ordinary IM profile data on friend/profile sources instead of customer-service profile-card", () => {
    expect(messageCenter).toContain("useMessageContactProfileController");
    expect(messageCenter).toContain("contactProfileController.profileQuery.data");
    expect(contactProfileController).not.toContain('getThreadProfileCard(');
    expect(contactProfileController).not.toContain('"im_direct"');
    expect(contactProfileController).not.toContain("pcQueryKeys.customerServiceThreadProfile");
    expect(contactProfileController).toContain("pcQueryKeys.friendProfileExtra");
    expect(contactProfileController).toContain("activeFriend");
    expect(contactProfileController).toContain("enabled: false");
    expect(contactProfileController).not.toContain("getFriendProfileExtra(activeFriendUserId)");
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
    expect(contactProfileController).not.toContain("getFriendProfileExtra(activeFriendUserId)");
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
    expect(messageContextRail).toContain("Sparkles");
    expect(messageContextRail).not.toContain('src="/ai-draft-entry.svg"');
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

  it("keeps direct read receipts as an icon without inline text", () => {
    expect(chatMessageBubble).toContain("const groupReadReceipt =");
    expect(chatMessageBubble).toContain("const directReadReceipt =");
    expect(chatMessageBubble).toContain('model.status.receipt === "read"');
    expect(chatMessageBubble).toContain("DirectReadReceiptIcon");
    expect(chatMessageBubble).toContain("pc-chat-direct-read-receipt");
    expect(chatMessageBubble).not.toContain("pc-chat-inline-read-receipt");
  });

  it("fast-tracks direct read receipt polling only while own sent messages are pending", () => {
    expect(directReadReceiptSync).toContain("latestPendingDirectReadReceiptSeq");
    expect(directReadReceiptSync).toContain("pendingDirectReadSeq");
    expect(directReadReceiptSync).toContain("directReadStatusRefetch");
    expect(directReadReceiptSync).toContain("activeDirectReadStatusFastTrackIntervalMs");
    expect(directReadReceiptSync).toContain("activeDirectReadStatusFastTrackWindowMs");
  });

  it("opens group read receipts as a message-anchored popover", () => {
    expect(chatMessageBubble).toContain("onGroupReadReceiptClick");
    expect(chatMessageBubble).toContain("{ ...viewModel, actions: computedModel.actions }");
    expect(chatMessageBubble).not.toContain("status: computedModel.status");
    expect(chatMessageBubble).toContain("pc-chat-group-read-pie-button");
    expect(chatMessageBubble).toContain("GroupReadPieIcon");
    expect(chatMessageBubble).toContain("groupReadPiePath");
    expect(chatMessageBubble).toContain("model.status.groupReadReceipt");
    expect(chatMessageBubble).toContain("model.status.groupReadReceipt?.ratio");
    expect(chatMessageBubble).toContain('groupReadVisualRatio > 0 ? "has-read" : "empty"');
    expect(chatMessageBubble).not.toContain('model.status.receipt !== "group_all"');
    expect(chatMessageBubble).not.toContain("title={groupReadLabel}");
    expect(chatMessageBubble).toContain("model.status.groupReadReceiptClickable");
    expect(chatMessageBubble).toContain("groupReadVisualRatio");
    expect(chatMessageBubble).not.toContain("const groupReadVisualRatio = 0.42");
    expect(chatMessageBubble).not.toContain("model.status.groupReadReceipt?.readCount");
    expect(chatMessageBubble).not.toContain('groupReadCount > 0 ? "read" : "unread"');
    expect(listPanel).toContain("GroupReadReceiptPopover");
    expect(listPanel).toContain("pendingGroupReadReceiptSnapshotTargets");
    expect(listPanel).toContain("messages: messageRenderWindow.renderedMessages");
    expect(listPanel).toContain("groupReadReceiptAutoSyncTargets");
    expect(listPanel).toContain("useQueries");
    expect(listPanel).toContain("activeGroupReadReceiptAutoSyncIntervalMs");
    expect(listPanel).toContain("groupReadReceiptQuery");
    expect(listPanel).toContain("useQueryClient");
    expect(listPanel).toContain("syncGroupReadReceiptSnapshotToCache");
    expect(listPanel).toContain("readCount: groupReadReceiptQuery.data.readCount");
    expect(messageCacheMutationModel).toContain("pcQueryKeys.imMessagesForSession");
    expect(messageCacheMutationModel).toContain("syncGroupReadReceiptSnapshot");
    expect(listPanel).toContain("conversation.memberCount");
    expect(listPanel).toContain("readableGroupReadReceiptMemberCount");
    expect(listPanel).toContain("fallbackMemberCount: conversation.memberCount");
    expect(listPanel).toContain("setActiveGroupReadReceipt");
    expect(listPanel).toContain("onGroupReadReceiptClick");
    expect(groupReadReceiptPopover).toContain('role="dialog"');
    expect(groupReadReceiptPopover).toContain('aria-modal="false"');
    expect(groupReadReceiptPopover).toContain("readMembers");
    expect(groupReadReceiptPopover).toContain("unreadMembers");
    expect(messageCenter).toContain("canViewCurrentGroupMemberList");
    expect(messageCenter).toContain("canViewGroupMemberList");
    expect(stage).toContain("canOpenGroupReadReceiptMemberProfile");
    expect(stage).toContain("onOpenGroupMemberProfile={onOpenGroupMemberProfile}");
    expect(listPanel).toContain("groupReadReceiptMemberProfileTarget");
    expect(listPanel).toContain("groupReadReceiptMemberProfileFor");
    expect(listPanel).toContain("canOpenGroupReadReceiptMemberProfileRow");
    expect(listPanel).toContain("openGroupReadReceiptMemberProfile");
    expect(listPanel).toContain("onOpenGroupMemberProfile?.(target, member)");
    expect(listPanel).not.toContain("if (opened) setActiveGroupReadReceipt(null)");
    expect(listPanel).toContain("loading={groupReadReceiptQuery.isLoading && !groupReadReceiptQuery.data}");
    expect(listPanel).not.toContain("loading={groupReadReceiptQuery.isLoading || groupReadReceiptQuery.isFetching}");
    expect(groupReadReceiptPopover).toContain("canOpenMemberProfile");
    expect(groupReadReceiptPopover).toContain("onOpenMemberProfile");
    expect(groupReadReceiptPopover).toContain("canOpenProfile && onOpenProfile");
    expect(groupReadReceiptPopover).toContain("pc-group-read-receipt-member clickable");
    expect(groupReadReceiptPopover).toContain("event.stopPropagation()");
    expect(groupReadReceiptPopover).toContain("isContactCardProfileTarget(target)");
    expect(groupReadReceiptPopover).toContain('target.closest(".contact-card-profile-dialog")');
    expect(groupReadReceiptPopover).toContain("onRetry");
    expect(groupReadReceiptPopover).toContain("Escape");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-icon");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-empty");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-ring");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-track");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-fill");
    expect(messageCenterCss).not.toContain(".pc-chat-group-read-pie-button.read");
    expect(messageCenterCss).not.toContain(".pc-chat-group-read-pie-button.unread");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-button.empty");
    expect(messageCenterCss).toContain("color: #8fa0b3");
    expect(messageCenterCss).toContain(".pc-chat-group-read-pie-button.has-read");
    expect(messageCenterCss).toContain("color: #13bfa6");
    expect(messageCenterCss).toContain("fill: #ffffff");
    expect(messageCenterCss).toContain("stroke: currentColor");
    expect(chatMessageBubble).toContain('height="13"');
    expect(chatMessageBubble).toContain('width="13"');
    expect(messageCenterCss).toContain(".pc-group-read-receipt-member.clickable");
    expect(messageCenterCss).not.toContain("conic-gradient");
    expect(messageCenterCss).toContain(".pc-group-read-receipt-popover");
    expect(messageCenterCss).toContain(".pc-group-read-receipt-tabs");
    expect(contextMenuCss).toContain("z-index: 190");
    expect(contextMenuCss).toContain("z-index: 260");
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

  it("keeps IM conversation identity lightweight and confined to the title row", () => {
    expect(conversationListIdentityModel).toContain('identityText: "客户"');
    expect(conversationListIdentityModel).toContain('identityText: "内部"');
    expect(conversationListIdentityModel).toContain('kind: "internal"');
    expect(conversationListIdentityModel).not.toContain('sourceText: "@企业"');
    expect(conversationListIdentityModel).not.toContain("用户");
    expect(conversationListParts).toContain("e-conversation-title-line");
    expect(conversationListParts).toContain("e-conversation-title-text");
    expect(conversationListParts).toContain("e-conversation-identity");
    expect(conversationListParts).toContain("e-conversation-source");
    expect(conversationListParts).toContain("conversation.lastMessage?.preview");
    expect(conversationListParts).toContain("<time>{formatChatTime(conversation.lastMessage?.sentAt)}</time>");
    expect(conversationListParts).toContain("<BellOff className=\"e-muted-icon\" size={15} />");
    expect(conversationListParts).not.toContain("identityMark");
  });
});
