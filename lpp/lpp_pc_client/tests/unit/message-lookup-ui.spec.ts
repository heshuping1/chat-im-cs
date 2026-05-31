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
    expect(stage).toContain("onOpenStandaloneProfile={() => {");
    expect(stage).toContain("setHistoryOpen(false)");
    expect(stage).toContain("setMessageSearchOpen(false)");
    expect(stage).toContain("setProfileStandaloneOpen(true)");
  });

  it("renders one unified lookup panel with search, type filters and a close action", () => {
    expect(listPanel).toContain("const lookupOpen = messageSearchOpen || historyOpen");
    expect(listPanel).toContain("chat-lookup-panel");
    expect(listPanel).toContain("关闭查找");
    expect(listPanel).toContain("没有匹配的聊天记录");
    expect(listPanel).not.toContain("chat-inline-panel");
  });

  it("loads im_direct profile-card for ordinary IM customer info and refreshes existing caches after edits", () => {
    expect(messageCenter).toContain("activeConversationProfileQuery");
    expect(messageCenter).toContain('getThreadProfileCard(');
    expect(messageCenter).toContain('"im_direct"');
    expect(messageCenter).toContain("pcQueryKeys.customerServiceThreadProfile");
    expect(messageCenter).toContain("updateFriendProfileMutation");
    expect(messageCenter).toContain('queryClient.invalidateQueries({ queryKey: ["pc-friends"] })');
    expect(messageCenter).toContain("pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken)");
  });
});
