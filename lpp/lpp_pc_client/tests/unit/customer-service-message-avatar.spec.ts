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

  it("passes the current staff avatar into online-service outgoing bubbles", () => {
    expect(chatWorkspaceSource).toContain("mineAvatarUrl={session?.avatarUrl}");
    expect(chatWorkspaceSource).toContain("peerAvatarUrl={selectedThread.customerAvatarUrl || selectedThread.avatarUrl}");
    expect(messageStageSource).toContain("mineAvatarUrl?: string | null");
    expect(messageStageSource).toContain("mineAvatarUrl={mineAvatarUrl}");
    expect(messageStageSource).toContain("peerAvatarUrl?: string | null");
    expect(messageStageSource).toContain("message.senderAvatarUrl || message.avatarUrl || peerAvatarUrl");
    expect(serviceMessageBubbleSource).toContain("mineAvatarUrl?: string | null");
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
});
