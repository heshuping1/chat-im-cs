import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-service message avatars", () => {
  const chatWorkspaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
    "utf8",
  );
  const messageStageSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceMessageStage.tsx",
    ),
    "utf8",
  );
  const serviceMessageBubbleSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/ServiceMessageBubble.tsx",
    ),
    "utf8",
  );
  const chatMessageBubbleSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatMessageBubble.tsx"),
    "utf8",
  );
  const messageBodyViewSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/MessageBodyView.tsx"),
    "utf8",
  );
  const customerServiceCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/customer-service/customer-service.css"),
    "utf8",
  );
  const mediaCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/messages/message-media-content.css"),
    "utf8",
  );

  it("passes domain-resolved avatars into online-service customer-service bubbles", () => {
    expect(chatWorkspaceSource).toContain("mineAvatarUrl={session?.avatarUrl}");
    expect(chatWorkspaceSource).toContain("peerAvatarUrl={selectedThread.customerAvatarUrl || selectedThread.avatarUrl}");
    expect(chatWorkspaceSource).toContain("customerServiceStaffSenderProfileTargetIds");
    expect(chatWorkspaceSource).toContain("getTenantMemberProfile(userId)");
    expect(chatWorkspaceSource).toContain("buildUserAvatarRegistry");
    expect(chatWorkspaceSource).toContain("resolveSenderAvatarUrl={resolveServiceSenderAvatarUrl}");
    expect(messageStageSource).toContain("mineAvatarUrl?: string | null");
    expect(messageStageSource).toContain("resolveCustomerServiceMessageAvatarUrl");
    expect(messageStageSource).toContain("resolveCustomerServiceMessageAvatarFallbackName");
    expect(messageStageSource).toContain("currentStaffAvatarUrl: mineAvatarUrl");
    expect(messageStageSource).toContain("senderProfileAvatarUrl: resolveSenderAvatarUrl?.(message)");
    expect(messageStageSource).toContain("staffAvatarUrl: message.staffAvatarUrl");
    expect(messageStageSource).toContain("senderFallbackName={senderFallbackName}");
    expect(messageStageSource).toContain("mineAvatarUrl={mine ? senderAvatarUrl : undefined}");
    expect(messageStageSource).toContain("peerAvatarUrl?: string | null");
    expect(messageStageSource).toContain("senderAvatarUrl={!mine ? senderAvatarUrl : undefined}");
    expect(serviceMessageBubbleSource).toContain("mineAvatarUrl?: string | null");
    expect(serviceMessageBubbleSource).toContain("senderFallbackName?: string | null");
    expect(serviceMessageBubbleSource).toContain("mineSenderName: mine ? senderFallbackName : undefined");
    expect(serviceMessageBubbleSource).toContain("mineAvatarUrl,");
    expect(serviceMessageBubbleSource).toContain("mineAvatarUrl={mineAvatarUrl}");
  });

  it("allows monitor and profile surfaces to open participant cards from message avatars", () => {
    expect(messageStageSource).toContain("onAvatarClick?:");
    expect(messageStageSource).toContain("onAvatarClick={onAvatarClick}");
    expect(serviceMessageBubbleSource).toContain("onAvatarClick?:");
    expect(serviceMessageBubbleSource).toContain("onAvatarClick={onAvatarClick}");
    expect(serviceMessageBubbleSource).toContain("senderAvatarUrl?: string | null");
    expect(serviceMessageBubbleSource).toContain("senderAvatarUrl={senderAvatarUrl}");
  });

  it("exposes stable render keys for customer-service message bottom follow", () => {
    expect(messageStageSource).toContain("data-message-render-key");
    expect(messageStageSource).toContain("message.conversationSeq");
  });

  it("keeps customer-service message metadata visual instead of inline read text", () => {
    expect(serviceMessageBubbleSource).toContain("formatFullDateTime(message.sentAt)");
    expect(messageStageSource).toContain("formatFullDateTime(message.sentAt)");
    expect(serviceMessageBubbleSource).not.toContain("customerServiceMessageReadReceiptState");
    expect(serviceMessageBubbleSource).not.toContain("statusText=");
    expect(serviceMessageBubbleSource).not.toContain("messageReadStatusText");
    expect(serviceMessageBubbleSource).not.toContain("customerMessageReadText");
    expect(serviceMessageBubbleSource).not.toContain("customerReadReceiptText");
  });

  it("keeps online-service media messages on the shared stable chat bubble path", () => {
    expect(serviceMessageBubbleSource).toContain('import { ChatMessageBubble } from "../../components/ChatMessageBubble";');
    expect(serviceMessageBubbleSource).toContain("<ChatMessageBubble");
    expect(serviceMessageBubbleSource).toContain("mediaCacheContext={mediaCacheContext}");
    expect(serviceMessageBubbleSource).toContain("onUploadAction={onUploadAction}");
    expect(serviceMessageBubbleSource).not.toContain("<img");
    expect(serviceMessageBubbleSource).not.toContain("<video");
    expect(serviceMessageBubbleSource).not.toContain("ImagePart");
    expect(serviceMessageBubbleSource).not.toContain("VideoPart");
    expect(serviceMessageBubbleSource).not.toContain("FileMessageContent");
    expect(messageStageSource).toContain("<ServiceMessageBubble");
    expect(chatMessageBubbleSource).toContain("<MessageBodyView");
    expect(chatMessageBubbleSource).toContain("mediaCacheContext={mediaCacheContext}");
    expect(messageBodyViewSource).toContain("normalizeMediaPart({ assetBaseUrl, fallback, part })");
    expect(messageBodyViewSource).toContain("<ImagePart");
    expect(messageBodyViewSource).toContain("<VideoPart");
    expect(messageBodyViewSource).toContain("<FileMessageContent");
    expect(mediaCss).toContain("height: var(--media-preview-height");
    expect(mediaCss).toContain("height: var(--media-preview-video-height");
    expect(mediaCss).toContain("height: var(--media-preview-file-height");
    expect(customerServiceCss).not.toContain("message-image-frame");
    expect(customerServiceCss).not.toContain("message-video-card");
    expect(customerServiceCss).not.toContain("message-file-card");
  });
});
