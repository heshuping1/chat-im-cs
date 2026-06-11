import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer service monitor wall", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceMonitorPanel.tsx",
    ),
    "utf8",
  );
  const styles = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/pages/workbench-knowledge.css"),
    "utf8",
  );

  it("reuses the online customer-service message stage instead of monitor-only cards", () => {
    expect(source).toContain("CustomerServiceMessageStage");
    expect(source).toContain("<CustomerServiceMessageStage");
    expect(source).not.toContain("ServiceMessageBubble");
    expect(source).not.toContain("cs-monitor-message-card");
    expect(source).not.toContain("cs-monitor-message-list");
    expect(styles).not.toContain(".cs-monitor-message-card");
    expect(styles).not.toContain(".cs-monitor-message-list");
  });

  it("keeps monitor windows read-only and free of chat side-effect controls", () => {
    expect(source).not.toContain("ChatComposerSurface");
    expect(source).not.toContain("sendTextMutation");
    expect(source).not.toContain("sendMediaMutation");
    expect(source).not.toContain("markCustomerService");
    expect(source).not.toContain("markRead");
    expect(source).not.toContain("ackRead");
    expect(source).not.toContain("typingPreviewQuery");
    expect(source).toContain("messageMenu={null}");
    expect(source).toContain("onUploadAction={noop}");
  });

  it("follows the bottom of monitor messages without enabling chat side effects", () => {
    expect(source).toContain("useWechatBottomFollow");
    expect(source).toContain("handleScroll: handleMessageStageScroll");
    expect(source).toContain("pendingNewMessageCount={pendingNewMessageCount}");
    expect(source).toContain("jumpToLatest={jumpToLatest}");
    expect(source).toContain("onScroll={handleMessageStageScroll}");
    expect(source).not.toContain("pendingNewMessageCount={0}");
    expect(source).not.toContain("jumpToLatest={noop}");
  });

  it("renders readonly monitor read status from detail snapshots", () => {
    expect(source).toContain("createMonitorReadSnapshot");
    expect(source).toContain("readDetailReadStatus");
    expect(source).toContain("applyMonitorReadStatusToMessages");
    expect(source).toContain("lastReadSeq >= seq");
    expect(source).toContain("visitorUserId");
    expect(source).toContain("monitorReadStatusChip({");
    expect(source).toContain("readerLabel");
    expect(source).toContain('className: read ? "read" : "unread"');
    expect(styles).toContain(".cs-monitor-chat-chips span.read");
    expect(styles).toContain(".cs-monitor-chat-chips span.unread");
    expect(styles).toContain(".cs-monitor-chat-chips span.unknown");
  });

  it("keeps the monitor window header focused on customer channel and tags", () => {
    expect(source).toContain("monitorCustomerTags");
    expect(source).toContain("customerTags.map");
    expect(source).toContain('className="customer-tag"');
    expect(source).toContain('className="cs-monitor-chat-line"');
    expect(source).not.toContain("<strong>{customerName}</strong>");
    expect(source).not.toContain("threadMonitorSummary");
    expect(source).not.toContain("readStatusChips.map");
    expect(source).not.toContain('className="cs-monitor-window-meta"');
    expect(source).not.toContain('{unassigned && <span className="warning">{t("workbench.monitor.unassigned")}</span>}');
    expect(styles).toContain(".cs-monitor-chat-line span.customer-tag");
    expect(styles).not.toContain(".cs-monitor-window-meta");
  });

  it("shows participant avatars and lightweight read-only profile entry points", () => {
    expect(source).toContain("PcAvatar");
    expect(source).toContain("createCustomerServiceIdentityViewModel");
    expect(source).toContain("cs-monitor-avatar-button customer");
    expect(source).toContain("cs-monitor-avatar-button staff");
    expect(source).toContain("cs-monitor-avatar-pair");
    expect(source).toContain("cs-monitor-chat-main");
    expect(source).toContain("openMessageAvatarPopover");
    expect(source).toContain("onAvatarClick={openMessageAvatarPopover}");
    expect(source).toContain("mineAvatarUrl={staffProfile.avatarUrl}");
    expect(source).toContain("peerAvatarUrl={customerAvatarUrl}");
    expect(source).toContain("customerIdentity.avatarTone");
    expect(source).toContain("customerIdentity.avatarName");
    expect(source).toContain("MonitorProfilePopover");
    expect(source).toContain('t("workbench.monitor.openCustomerProfile")');
    expect(source).toContain('t("workbench.monitor.openStaffProfile")');
    expect(source).toContain('t("workbench.monitor.openReadonlyDetail")');
  });

  it("falls back to staff identity from readonly message snapshots", () => {
    expect(source).toContain("createCustomerServiceStaffProfileViewModel");
    expect(source).toContain("threadStaffProfile(thread, staffItems, messages)");
    expect(source).not.toContain("latestStaffMessageProfile");
    expect(source).not.toContain("cs-monitor-status-dot");
    expect(styles).not.toContain("cs-monitor-status-dot");
    expect(source).toContain('className={`cs-monitor-thread-avatars ${unassigned ? "single" : ""}`}');
    expect(source).toContain("{!unassigned && (");
  });

  it("keeps manager actions to transfer and open without exposing intervention copy", () => {
    expect(source).toContain("CustomerServiceTransferDialog");
    expect(source).toContain("transferCustomerServiceThread");
    expect(source).toContain('t("customerService.transfer.open")');
    expect(source).toContain("monitorTransferTargets");
    expect(source).toContain("monitorTransferCurrentStaffName");
    expect(source).toContain("transferThreadMessages");
    expect(source).toContain("monitorTransferTargets(transferThread, staffItems, transferThreadMessages)");
    expect(source).toContain("currentStaffName={monitorTransferCurrentStaffName");
    expect(source).toContain("profile.isAssigned ? profile.displayName : unassignedLabel");
    expect(source).not.toContain('t("workbench.monitor.assistThread")');
  });

  it("does not hard-scope realtime monitor results to one thread type", () => {
    expect(source).not.toContain('threadType: "temp_session"');
    expect(source).not.toContain("rawThreads.filter");
    expect(source).not.toContain("allTempSessionThreads");
    expect(source).not.toContain('<option value="im_direct">IM Direct</option>');
  });

  it("filters the monitor thread pool locally with searchable multi-select staff", () => {
    expect(source).toContain("filterMonitorThreads");
    expect(source).toContain("visiblePoolThreads");
    expect(source).toContain("allMonitorThreads");
    expect(source).toContain("assignedStaffUserIds");
    expect(source).toContain("MonitorStaffMultiSelect");
    expect(source).toContain("selectedNames.length");
    expect(source).toContain("monitorThreadSearchText");
    expect(source).toContain("visibleThreads={visiblePoolThreads.length}");
    expect(source).toContain("pruneWatchedThreadKeys(current, allThreadKeys, layoutMode)");
  });

  it("shows two avatars in the thread pool and supports dragging sessions onto the wall", () => {
    expect(source).toContain("cs-monitor-thread-avatars");
    expect(source).toContain("cs-monitor-thread-avatar staff");
    expect(source).toContain("cs-monitor-thread-avatar customer");
    expect(source).toContain("monitorThreadDragMime");
    expect(source).toContain("draggable");
    expect(source).toContain("onDragStart");
    expect(source).toContain("onDropThreadToSlot");
    expect(source).toContain("dropWatchedThreadKeyAtIndex");
    expect(source).toContain("readMonitorThreadDragData");
    expect(styles).toContain(".cs-monitor-thread-avatars");
    expect(styles).toContain(".cs-monitor-staff-filter-menu");
  });

  it("defaults the monitor wall to the two-column one-row layout", () => {
    expect(source).toContain('useState<MonitorLayoutMode>("2x1")');
  });

  it("uses a short fallback poll interval for owner monitor snapshots", () => {
    expect(source).toContain("const monitorPollIntervalMs = 5_000");
    expect(source).toContain("const monitorStaleMs = 2_500");
  });

  it("filters duplicate unknown source labels from the monitor title summary", () => {
    expect(source).toContain("usefulSourceLabel");
    expect(source).toContain('normalized === "unknownsource"');
  });

  it("keeps the monitor session pool compact", () => {
    expect(styles).toContain("grid-template-columns: 200px minmax(0, 1fr)");
  });

  it("supports a single-window monitor layout", () => {
    expect(source).toContain("monitorLayoutModes.map");
    expect(styles).toContain(".cs-monitor-wall.layout-1-1 .cs-monitor-wall-grid");
    expect(styles).toContain("grid-template-rows: minmax(360px, 1fr)");
  });

  it("supports a two-column one-row monitor layout", () => {
    expect(styles).toContain(".cs-monitor-wall.layout-2-1 .cs-monitor-wall-grid");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("only adapts the shared message stage inside the monitor grid", () => {
    expect(styles).toContain(".cs-monitor-window .h-message-stage");
    expect(styles).toContain(".cs-monitor-window .h-message-stage .cs-message-row");
    expect(styles).toContain("container-type: inline-size");
    expect(styles).toContain("@container (max-width: 430px)");
    expect(styles).toContain(".cs-monitor-chat-line");
    expect(styles).toContain("grid-template-columns: 58px minmax(0, 1fr) auto");
    expect(styles).toContain(".cs-monitor-wall.layout-3-3 .cs-monitor-chat-line span:nth-of-type(n+2)");
    expect(styles).not.toContain("cs-monitor-agent-brief");
    expect(styles).toContain(".cs-monitor-profile-popover");
    expect(styles).not.toContain(".cs-monitor-readonly-badge");
    expect(styles).not.toContain(".cs-monitor-readonly-strip");
  });
});
