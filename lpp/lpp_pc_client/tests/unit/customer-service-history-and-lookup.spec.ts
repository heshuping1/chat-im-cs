import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-service history and lookup surfaces", () => {
  const dataCenterPage = readFileSync(
    resolve(process.cwd(), "src/renderer/components/DataCenterPage.tsx"),
    "utf8",
  );
  const customerServiceHistoryReport = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerServiceHistoryReport.tsx"),
    "utf8",
  );
  const customerServiceConversationStatsReport = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerServiceConversationStatsReport.tsx"),
    "utf8",
  );
  const customerServiceDateRangeFilter = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerServiceDateRangeFilter.tsx"),
    "utf8",
  );
  const customerServiceExportTaskDialog = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerServiceExportTaskDialog.tsx"),
    "utf8",
  );
  const dataCenterReportRegistry = readFileSync(
    resolve(process.cwd(), "src/renderer/components/data-center/dataCenterReportRegistry.tsx"),
    "utf8",
  );
  const productPagesCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/pages/product-pages.css"),
    "utf8",
  );
  const chatWorkspace = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
    "utf8",
  );
  const workspaceHeader = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceWorkspaceHeader.tsx"),
    "utf8",
  );
  const transferDialog = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceTransferDialog.tsx"),
    "utf8",
  );
  const workbenchPage = readFileSync(
    resolve(process.cwd(), "src/renderer/components/WorkbenchPage.tsx"),
    "utf8",
  );
  const staticConfig = readFileSync(
    resolve(process.cwd(), "src/renderer/data/static-config.ts"),
    "utf8",
  );
  const customerServiceMonitorPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceMonitorPanel.tsx"),
    "utf8",
  );
  const workbenchKnowledgeCss = readFileSync(
    resolve(process.cwd(), "src/renderer/styles/pages/workbench-knowledge.css"),
    "utf8",
  );
  const messageStage = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceMessageStage.tsx"),
    "utf8",
  );
  const serviceMessageContextMenu = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/ServiceMessageContextMenu.tsx"),
    "utf8",
  );
  const threadActionButton = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceThreadActionButton.tsx"),
    "utf8",
  );
  const threadList = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ThreadList.tsx"),
    "utf8",
  );
  const customerContextPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerContextPanel.tsx"),
    "utf8",
  );
  const workspaceController = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/hooks/useCustomerServiceWorkspaceController.ts"),
    "utf8",
  );
  const threadActionPolicy = readFileSync(
    resolve(process.cwd(), "src/renderer/data/customer-service/cs-thread-action-policy.ts"),
    "utf8",
  );
  const customerServiceClient = readFileSync(
    resolve(process.cwd(), "src/renderer/data/api/customer-service-client.ts"),
    "utf8",
  );
  const csCacheAdapter = readFileSync(
    resolve(process.cwd(), "src/renderer/data/customer-service/cs-cache-adapter.ts"),
    "utf8",
  );

  it("keeps history search and statistics inside the customer-service history report", () => {
    expect(customerServiceHistoryReport).toContain("cs-history-summary-grid");
    expect(customerServiceHistoryReport).toContain("cs-history-filter-card");
    expect(customerServiceHistoryReport).toContain("cs-history-filter-grid");
    expect(customerServiceHistoryReport).toContain("advancedOpen");
    expect(customerServiceHistoryReport).toContain("更多条件");
    expect(customerServiceHistoryReport).not.toContain("supportedHistoryFilterNames");
    expect(customerServiceHistoryReport).not.toContain("仅展示 API 已支持的筛选字段");
    expect(customerServiceHistoryReport).toContain("客户首次收到回复的平均等待");
    expect(customerServiceHistoryReport).toContain("占比最高的来源渠道");
    expect(customerServiceHistoryReport).toContain("cs-history-thread-table");
    expect(customerServiceHistoryReport).toContain("cs-history-field-table");
    expect(customerServiceHistoryReport).toContain("createHistoryFieldColumns");
    expect(customerServiceHistoryReport).toContain("historyItemRecord");
    expect(customerServiceHistoryReport).toContain("MessageHistoryLookupDialog");
    expect(customerServiceHistoryReport).toContain("useInfiniteQuery");
    expect(customerServiceHistoryReport).toContain("initialPageParam: null as string | null");
    expect(customerServiceHistoryReport).toContain("cursor: pageParam");
    expect(customerServiceHistoryReport).toContain("getNextPageParam: (lastPage) => lastPage.nextCursor || undefined");
    expect(customerServiceHistoryReport).toContain("historyQuery.fetchNextPage()");
    expect(customerServiceHistoryReport).toContain("聊天记录");
    expect(customerServiceHistoryReport).toContain("filterMessagesByKeyword");
    expect(customerServiceHistoryReport).toContain("filterMessagesByHistory");
    expect(customerServiceHistoryReport).toContain("enabled: Boolean(client)");
    expect(customerServiceHistoryReport).not.toContain("请选择客户 ID、访客用户 ID、注册用户 ID、参与客服 ID 或指派客服 ID 后查询历史对话");
    expect(customerServiceHistoryReport).toContain("getCustomerServiceHistoryThreads({");
    expect(customerServiceHistoryReport).toContain("创建时间：");
    expect(customerServiceHistoryReport).toContain("客户关键词");
    expect(customerServiceHistoryReport).toContain("客户名称、客户 ID、手机号、邮箱");
    expect(customerServiceHistoryReport).toContain("客户备注");
    expect(customerServiceHistoryReport).toContain("对话类别");
    expect(customerServiceHistoryReport).toContain("对话评价");
    expect(customerServiceHistoryReport).toContain("good,excellent");
    expect(customerServiceHistoryReport).toContain("value={filters.ratingSegment}");
    expect(customerServiceHistoryReport).toContain("value={exportFilters.ratingSegment}");
    expect(customerServiceHistoryReport).toContain('label="地址"');
    expect(customerServiceHistoryReport).toContain('placeholder="省/市/地区"');
    expect(customerServiceHistoryReport).toContain("ratingSegmentRange");
    expect(customerServiceHistoryReport).toContain("historyEmptyText");
    expect(customerServiceHistoryReport).toContain("没有找到匹配客户身份的历史对话");
    expect(customerServiceHistoryReport).toContain("historySummary");
    expect(customerServiceHistoryReport).toContain("getWorkbenchThreadDetail(");
    expect(customerServiceHistoryReport).toContain("createCustomerServiceExportTask");
    expect(customerServiceHistoryReport).toContain("getCustomerServiceExportTasks");
    expect(customerServiceHistoryReport).toContain("downloadCustomerServiceExportTask");
    expect(customerServiceHistoryReport).toContain("isHistoryExportTaskCompleted");
    expect(customerServiceHistoryReport).toContain("historyExportType(report)");
    expect(customerServiceHistoryReport).toContain("CustomerServiceExportTaskDialog");
    expect(customerServiceHistoryReport).not.toContain("cs-history-export-tasks");
    expect(customerServiceHistoryReport).toContain("currentHistoryExportFilters");
    expect(customerServiceHistoryReport).not.toContain("currentHistoryExportFilterKey");
    expect(customerServiceHistoryReport).not.toContain("historyExportFilterChips(currentHistoryExportFilters)");
    expect(customerServiceHistoryReport).toContain("sortHistoryExportTasks(exportTasksQuery.data ?? [])");
    expect(customerServiceHistoryReport).not.toContain("mergeHistoryExportTasks(localExportTask");
    expect(customerServiceHistoryReport).toContain("recordCountLabel: historyExportRecordCountLabel(task.recordCount)");
    expect(customerServiceHistoryReport).toContain("completedAtLabel: task.completedAt");
    expect(customerServiceHistoryReport).toContain("conversationId: filters.conversationId");
    expect(customerServiceHistoryReport).toContain("assignedStaffUserId: filters.assignedStaffUserId");
    expect(customerServiceHistoryReport).toContain("HistoryStaffPicker");
    expect(customerServiceHistoryReport).toContain("createHistoryStaffPickerMembers");
    expect(customerServiceHistoryReport).toContain("filterHistoryStaffPickerMembers");
    expect(customerServiceHistoryReport).toContain("当前接口仅支持单个参与客服筛选");
    expect(customerServiceHistoryReport).toContain("搜索员工姓名 / ${PUBLIC_ID_LABEL}");
    expect(customerServiceHistoryReport).toContain("setFilters((current) => ({ ...current, staffUserId }))");
    expect(customerServiceHistoryReport).toContain("`${dateText}T${normalizeHistoryTime");
    expect(customerServiceHistoryReport).not.toContain('HistoryInput label="参与客服 ID"');
    expect(customerServiceClient).not.toContain("if (!staffUserId && !hasCustomerFilter) return null");
    expect(customerServiceClient).not.toContain("getAdminTempSessionHistory");
    expect(customerServiceClient).toContain("adminCustomerServiceCenterHistorySessions");
    expect(customerServiceClient).toContain("adminExportTasks");
    expect(productPagesCss).toContain(".cs-history-page");
    expect(productPagesCss).toContain(".cs-history-results-panel");
    expect(productPagesCss).toContain(".cs-history-thread-table");
    expect(productPagesCss).toContain(".cs-history-field-table");
    expect(productPagesCss).toContain("border-collapse: separate");
    expect(productPagesCss).toContain("scrollbar-gutter: stable both-edges");
    expect(productPagesCss).toContain("transform: translateZ(0)");
    expect(productPagesCss).toContain(".cs-history-pagination");
    expect(productPagesCss).toContain(".cs-history-summary-grid");
    expect(productPagesCss).toContain("scrollbar-gutter: stable");
    expect(productPagesCss).toContain(".cs-history-staff-picker");
    expect(productPagesCss).toContain(".cs-history-staff-popover");
    expect(productPagesCss).toContain(".cs-history-staff-list");
  });

  it("keeps customer typing preview as a composer status row outside the message stage", () => {
    expect(messageStage).toContain("cs-message-stage-shell");
    expect(messageStage).toContain('className="h-message-stage"');
    expect(messageStage).not.toContain("cs-composer-typing-preview");
    expect(messageStage).not.toContain("typingPreview");
    expect(chatWorkspace).toContain("CustomerServiceComposerTypingPreview");
    expect(chatWorkspace).toContain("cs-composer-typing-preview");
    expect(chatWorkspace.indexOf("CustomerServiceComposerTypingPreview")).toBeLessThan(
      chatWorkspace.indexOf("<ChatComposerSurface"),
    );
    expect(workbenchKnowledgeCss).toContain(".cs-monitor-window .cs-message-stage-shell");
  });

  it("keeps history participant ids out of the primary table columns", () => {
    const primaryOrderStart = customerServiceHistoryReport.indexOf("const primaryHistoryFieldOrder = [");
    const primaryOrderEnd = customerServiceHistoryReport.indexOf("];", primaryOrderStart);
    const primaryOrder = customerServiceHistoryReport.slice(primaryOrderStart, primaryOrderEnd);

    expect(primaryOrder).toContain('"staffIdentity"');
    expect(primaryOrder).toContain('"customerIdentity"');
    expect(primaryOrder).toContain('"visitTime"');
    expect(primaryOrder).toContain('"conversationTime"');
    expect(primaryOrder).toContain('"conversationCategory"');
    expect(primaryOrder).toContain('"responseSeconds"');
    expect(primaryOrder.indexOf('"visitTime"')).toBeGreaterThan(primaryOrder.indexOf('"customerIdentity"'));
    expect(primaryOrder.indexOf('"conversationTime"')).toBeGreaterThan(primaryOrder.indexOf('"visitTime"'));
    expect(primaryOrder.indexOf('"staffIdentity"')).toBeGreaterThan(primaryOrder.indexOf('"responseSeconds"'));
    expect(primaryOrder).not.toContain('"sourceIdentity"');
    expect(primaryOrder).not.toContain('"rating"');
    expect(primaryOrder).not.toContain('"riskLevel"');
    expect(primaryOrder).not.toContain('"lastMessageAt"');
    expect(primaryOrder).not.toContain('"createdAt"');
    expect(primaryOrder).not.toContain('"durationSeconds"');
    expect(primaryOrder).not.toContain('"threadId"');
    expect(primaryOrder).not.toContain('"conversationId"');
    expect(customerServiceHistoryReport).toContain("historyFieldColumnClass");
    expect(customerServiceHistoryReport).toContain("HistoryPartyProfileDialog");
    expect(customerServiceHistoryReport).toContain("HistoryVisitorSessionList");
    expect(customerServiceHistoryReport).toContain("HistoryVisitorTrajectory");
    expect(customerServiceHistoryReport).toContain("HistoryPartyProfileDetails");
    expect(customerServiceHistoryReport).toContain("expandedThreadKeys");
    expect(customerServiceHistoryReport).toContain("historySessionRangeLabel");
    expect(customerServiceHistoryReport).toContain("historySessionSummaryLabel");
    expect(customerServiceHistoryReport).toContain("dialogPosition");
    expect(customerServiceHistoryReport).toContain("startDrag");
    expect(customerServiceHistoryReport).toContain("HistoryVisitorSessionItem");
    expect(customerServiceHistoryReport).toContain("HistoryVisitorMessageItem");
    expect(customerServiceHistoryReport).toContain("getWorkbenchThreadDetail(thread.threadType, thread.threadId)");
    expect(customerServiceHistoryReport).toContain("readDetailMessages(detailQuery.data).filter(isVisibleHistoryMessage)");
    expect(customerServiceHistoryReport).toContain("historyMessageText");
    expect(customerServiceHistoryReport).toContain("cs-history-visitor-session-toggle");
    expect(customerServiceHistoryReport).toContain("cs-history-visitor-session-detail");
    expect(customerServiceHistoryReport).toContain("historyRelatedVisitorThreads");
    expect(customerServiceHistoryReport).toContain("compareHistoryThreadDesc");
    expect(customerServiceHistoryReport).toContain("HistoryThreadDetailDialog");
    expect(customerServiceHistoryReport).toContain("historyThreadDetailRows");
    expect(customerServiceHistoryReport).toContain("historyThreadDetailSections");
    expect(customerServiceHistoryReport).toContain("shouldShowHistoryDetailField");
    expect(customerServiceHistoryReport).toContain("Object.prototype.hasOwnProperty.call(record, key)");
    expect(customerServiceHistoryReport).not.toContain("visibleKeys");
    expect(customerServiceHistoryReport).not.toContain("hasHistoryDetailValue");
    expect(customerServiceHistoryReport).toContain("会话信息");
    expect(customerServiceHistoryReport).toContain("双方信息");
    expect(customerServiceHistoryReport).toContain("时间与效率");
    expect(customerServiceHistoryReport).toContain("来源与运营");
    expect(customerServiceHistoryReport).toContain("系统标识");
    expect(customerServiceHistoryReport).toContain("getTenantMembers()");
    expect(customerServiceHistoryReport).toContain("createTenantMemberIdentityMap");
    expect(customerServiceHistoryReport).toContain("findTenantMemberByHistoryIdentity");
    expect(customerServiceHistoryReport).toContain("已关联通讯录");
    expect(customerServiceHistoryReport).toContain("未关联通讯录");
    expect(customerServiceHistoryReport).toContain("PUBLIC_ID_LABEL");
    expect(customerServiceHistoryReport).toContain('staffIdentity: "客服"');
    expect(customerServiceHistoryReport).toContain("HistoryPartyInlineProfile");
    expect(customerServiceHistoryReport).toContain('className="cs-history-party-avatar"');
    expect(customerServiceHistoryReport).toContain("PcAvatar");
    expect(productPagesCss).toContain(".cs-history-party-mini-avatar");
    expect(productPagesCss).toContain(".cs-history-field-visitTime");
    expect(productPagesCss).toContain(".cs-history-field-conversationTime");
    expect(productPagesCss).toContain(".cs-history-field-responseSeconds");
    expect(productPagesCss).toContain(".cs-history-stacked-cell");
    expect(productPagesCss).toContain(".cs-history-compact-info-cell");
    expect(productPagesCss).toContain("min-width: 100%");
    expect(productPagesCss).toContain("width: max-content");
    expect(productPagesCss).toContain("grid-template-columns: 22px minmax(0, 1fr)");
    expect(productPagesCss).toContain(".cs-history-party-tabs");
    expect(productPagesCss).toContain("resize: both");
    expect(productPagesCss).toContain(".cs-history-party-dialog.dragging header");
    expect(productPagesCss).toContain(".cs-history-visitor-session-list");
    expect(productPagesCss).toContain(".cs-history-visitor-session-row");
    expect(productPagesCss).toContain(".cs-history-visitor-session-summary");
    expect(productPagesCss).toContain(".cs-history-visitor-session-detail");
    expect(productPagesCss).toContain(".cs-history-visitor-message-list");
    expect(productPagesCss).toContain(".cs-history-visitor-message");
    expect(productPagesCss).toContain(".cs-history-visitor-trajectory");
    expect(productPagesCss).toContain(".cs-history-party-tab-panel::-webkit-scrollbar");
    expect(productPagesCss).toContain(".cs-history-party-dialog dl::-webkit-scrollbar");
    expect(productPagesCss).toContain(".cs-history-visitor-session-list::-webkit-scrollbar");
    expect(productPagesCss).toContain(".cs-history-visitor-trajectory::-webkit-scrollbar");
    expect(productPagesCss).toContain("scrollbar-width: thin");
    expect(productPagesCss).toContain("scrollbar-color: transparent transparent");
    expect(productPagesCss).toContain(".cs-history-party-tab-panel:hover::-webkit-scrollbar-thumb");
    expect(productPagesCss).toContain(".cs-history-party-dialog dl:hover::-webkit-scrollbar-thumb");
    expect(productPagesCss).toContain(".cs-history-visitor-session-list:hover::-webkit-scrollbar-thumb");
    expect(productPagesCss).toContain(".cs-history-visitor-trajectory:hover::-webkit-scrollbar-thumb");
    expect(productPagesCss).toContain("display: flex");
    expect(productPagesCss).toContain(".cs-history-date-filter .cs-history-filter-options");
    expect(customerServiceHistoryReport).toContain("CustomerServiceDateRangeFilter");
    expect(customerServiceConversationStatsReport).toContain("CustomerServiceDateRangeFilter");
    expect(customerServiceDateRangeFilter).toContain('captionLayout="label"');
    expect(customerServiceDateRangeFilter).toContain("formatWeekdayName");
    expect(customerServiceDateRangeFilter).toContain("formatMonthDropdown");
    expect(customerServiceDateRangeFilter).toContain("<span>开始</span>");
    expect(customerServiceDateRangeFilter).toContain("<span>结束</span>");
    expect(productPagesCss).toContain(".cs-history-date-popover .rdp-root");
    expect(productPagesCss).not.toContain(".cs-history-date-popover .rdp {");
    expect(productPagesCss).toContain("--rdp-day_button-height: 28px");
    expect(productPagesCss).toContain(".cs-history-time-grid label span");
    expect(productPagesCss).toContain("grid-template-columns: minmax(380px, 0.42fr) minmax(0, 1fr)");
    expect(productPagesCss).toContain("white-space: nowrap");
    expect(customerServiceHistoryReport).toContain('if (type === "temp_session") return "临时会话"');
    expect(customerServiceHistoryReport).toContain('if (normalized.includes("temp-chat-widget")) return "网页小组件"');
    expect(customerServiceHistoryReport).toContain("function riskLevelLabel");
    expect(customerServiceHistoryReport).toContain("function conversationCategoryLabel");
    expect(customerServiceHistoryReport).toContain("HistoryStackedCell");
    expect(customerServiceHistoryReport).toContain("HistoryCompactInfoCell");
    expect(customerServiceHistoryReport).toContain("historyElapsedSeconds");
    expect(customerServiceHistoryReport).toContain("historyDateTimePlusSeconds");
    expect(customerServiceHistoryReport).toContain("historyTableDateTimeText");
    expect(customerServiceHistoryReport).toContain("historyCustomerInlineLines");
    const inlineLines = customerServiceHistoryReport.match(
      /function historyCustomerInlineLines[\s\S]*?function responseSecondsLabel/,
    )?.[0] ?? "";
    expect(inlineLines).not.toContain("raw.visitorUserId");
    expect(inlineLines).toContain("historyLocationLine(location, ip)");
    expect(inlineLines).toContain("[sourceChannel, sourcePlatform].filter(Boolean).join");
    expect(inlineLines).toContain("].filter(Boolean)");
    expect(customerServiceHistoryReport).toContain("function historyLocationLine");
    expect(inlineLines).toContain("raw.sourceChannel");
    expect(inlineLines).toContain("raw.sourcePlatform");
    const customerProfile = customerServiceHistoryReport.match(
      /function historyCustomerProfile[\s\S]*?function historyStaffProfile/,
    )?.[0] ?? "";
    expect(customerProfile).toContain("raw.customerRemark");
    expect(customerProfile).toContain("raw.visitorUserId");
    expect(customerProfile).toContain("raw.customerId");
    expect(customerProfile).toContain("raw.customerUserId");
    expect(customerProfile).toContain("raw.ipMasked");
    expect(customerProfile).toContain("raw.ipAddress");
    expect(customerProfile).toContain("thread.sourceChannel");
    expect(customerProfile).toContain("thread.platform");
    expect(customerServiceHistoryReport).toContain("accessSeconds");
    expect(customerServiceHistoryReport).toContain("totalResponseSeconds");
    expect(customerServiceHistoryReport).toContain("customerRemark");
    expect(customerServiceHistoryReport).toContain("0\" || text === \"normal");
    expect(customerServiceHistoryReport).toContain("1分 · 极差");
    expect(customerServiceHistoryReport).toContain("5分 · 非常满意");
    expect(customerServiceHistoryReport).toContain("cs-history-party-trigger");
    expect(customerServiceHistoryReport).toContain("客户用户 ID");
    expect(customerServiceHistoryReport).toContain("客服 ID");
    expect(productPagesCss).toContain(".cs-history-party-modal");
    expect(customerServiceHistoryReport).not.toContain('className="cs-history-party-modal" role="presentation" onClick={onClose}');
    expect(customerServiceHistoryReport).not.toContain('className="cs-history-info-modal" role="presentation" onClick={onClose}');
    expect(productPagesCss).toContain(".cs-history-party-avatar");
    expect(productPagesCss).toContain(".cs-history-info-dialog");
    expect(productPagesCss).toContain(".cs-history-info-sections");
    expect(productPagesCss).toContain(".cs-history-info-section");
    expect(customerServiceHistoryReport).toContain("assignedStaffDisplayName:");
    expect(customerServiceHistoryReport).toContain('className="cs-history-info-label"');
    expect(customerServiceHistoryReport).toContain('className="cs-history-info-value"');
    expect(productPagesCss).toContain("grid-template-columns: minmax(104px, 36%) minmax(0, 1fr)");
    expect(productPagesCss).toContain("overflow-wrap: anywhere");
  });

  it("keeps owner readonly live conversations in the current service list", () => {
    expect(threadList).toContain("function isCustomerServiceHistoryThread");
    expect(threadList).toContain("return isTerminalCustomerServiceThreadStatus(thread.status);");
    expect(threadList).not.toContain('thread.accessMode === "management_readonly"');
    expect(threadList).toContain("canReadCustomerServiceHistory");
    expect(threadList).toContain("getCustomerServiceHistoryThreads({");
    expect(threadList).not.toContain("getStaffServiceHistory({");
    expect(workspaceController).toContain("canReadCustomerServiceHistory");
    expect(workspaceController).toContain("getCustomerServiceHistoryThreads({");
    expect(workspaceController).not.toContain("getStaffServiceHistory({");
    expect(customerContextPanel).toContain("canReadCustomerServiceHistory");
    expect(customerContextPanel).toContain("getCustomerServiceHistoryThreads({");
    expect(customerContextPanel).not.toContain("getStaffServiceHistory({");
    expect(threadList).not.toContain("canUseCustomerServiceManagementReadonly");
    expect(threadList).toContain("canClaimQueuedThread");
    expect(threadList).toContain("resolveCustomerServiceThreadActionPolicy");
    expect(threadList).toContain("queued && threadActionPolicy.claim.enabled");
    expect(threadList).toContain("executeCustomerServiceThreadAction({");
    expect(threadList).toContain('mode: "staff"');
    expect(threadActionPolicy).toContain("canSuperviseCustomerServiceClose");
    expect(threadActionPolicy).toContain("canSuperviseCustomerServiceTransfer");
    expect(workspaceController).toContain('if (action === "close")');
    expect(workspaceController).toContain("resolveCustomerServiceThreadActionPolicy");
    expect(workspaceController).toContain("Only customer service staff can perform this action.");
    expect(workspaceController).toContain('actionPolicy.transferDialog.mode === "assign" ? "management" : "staff"');
    expect(chatWorkspace).toContain("const threadActionPolicy = useMemo");
    expect(chatWorkspace).toContain("policy={threadActionPolicy}");
    expect(chatWorkspace).toContain("transferMode={threadActionPolicy.transferDialog.mode}");
    expect(chatWorkspace).toContain("canClose={threadActionPolicy.close.enabled}");
    expect(threadActionButton).toContain("policy: CustomerServiceThreadActionPolicy");
  });

  it("keeps Data Center extensible through domain and report registration", () => {
    expect(dataCenterPage).toContain("data-center-domain-nav");
    expect(dataCenterPage).toContain("data-center-report-tabs");
    expect(dataCenterPage).not.toContain("--data-center-active-domain-center");
    expect(dataCenterPage).not.toContain("--data-center-report-tabs-shift");
    expect(dataCenterPage).not.toContain("data-center-report-parent-bubble");
    expect(dataCenterPage).not.toContain("data-center-report-nav");
    expect(dataCenterPage).not.toContain("reportNavCollapsed");
    expect(dataCenterPage).toContain("ActiveReportComponent");
    expect(dataCenterPage).toContain("reportsForDataCenterDomain");
    expect(dataCenterReportRegistry).toContain('domainId: "customer-service"');
    expect(dataCenterReportRegistry).toContain('reportId: "cs-history"');
    expect(dataCenterReportRegistry).toContain('exportTypes: ["cs_sessions"]');
    expect(dataCenterReportRegistry).toContain('reportId: "cs-conversation-stats"');
    expect(dataCenterReportRegistry).toContain('title: "统计对话"');
    expect(dataCenterReportRegistry).toContain('requiredPermission: "customer-service-admin"');
    expect(dataCenterReportRegistry).toContain('exportTypes: ["cs_staff_daily_stats"]');
    expect(dataCenterReportRegistry).toContain("CustomerServiceConversationStatsReport");
    expect(dataCenterReportRegistry).not.toContain('reportId: "cs-sla-risk"');
    expect(dataCenterReportRegistry).not.toContain('reportId: "cs-source-region"');
    expect(dataCenterReportRegistry).not.toContain('reportId: "cs-export-tasks"');
    expect(dataCenterReportRegistry).not.toContain('reportId: "cs-agent-performance"');
    expect(dataCenterReportRegistry).toContain("DataCenterPlaceholderReport");
    expect(productPagesCss).toContain(".data-center-shell");
    expect(productPagesCss).toContain(".data-center-report-tabs");
    expect(productPagesCss).toContain(".data-center-report-surface");
  });

  it.skip("implements Data Center customer-service conversation statistics", () => {
    expect(customerServiceConversationStatsReport).toContain("统计对话");
    expect(customerServiceConversationStatsReport).toContain("每日");
    expect(customerServiceConversationStatsReport).toContain("每周");
    expect(customerServiceConversationStatsReport).toContain("每月");
    expect(customerServiceConversationStatsReport).toContain("坐席效率");
    expect(customerServiceConversationStatsReport).toContain("来源渠道分布");
    expect(customerServiceConversationStatsReport).toContain('dataCenterView !== "self-service"');
    expect(customerServiceConversationStatsReport).toContain("统计对话需要管理员或所有者权限");
    expect(customerServiceConversationStatsReport).toContain("getTempSessionStats()");
    expect(customerServiceConversationStatsReport).toContain("createCustomerServiceExportTask");
    expect(customerServiceConversationStatsReport).toContain("const exportType = statsExportType(report)");
    expect(customerServiceConversationStatsReport).toContain("exportType,");
    expect(customerServiceConversationStatsReport).toContain('"cs_staff_daily_stats"');
    expect(customerServiceConversationStatsReport).not.toContain("stats?.aiHandoffSessions");
    expect(customerServiceConversationStatsReport).toContain("staff.excellentRate");
    expect(customerServiceConversationStatsReport).not.toContain("transferCount");
    expect(customerServiceConversationStatsReport).not.toContain("transferredCount");
    expect(customerServiceConversationStatsReport).not.toContain("transferSessions");
    expect(customerServiceConversationStatsReport).not.toContain("grain: input.grain");
    expect(productPagesCss).toContain(".cs-stats-page");
    expect(productPagesCss).toContain(".cs-stats-kpi-grid");
    expect(productPagesCss).toContain(".cs-stats-staff-table");
  });

  it("implements the API-supported customer-service conversation stats report", () => {
    expect(customerServiceConversationStatsReport).toContain("统计对话");
    expect(customerServiceConversationStatsReport).not.toContain("按服务端统计接口展示总量、趋势、来源和坐席效能");
    expect(customerServiceConversationStatsReport).toContain("对话总量");
    expect(customerServiceConversationStatsReport).toContain("已接待");
    expect(customerServiceConversationStatsReport).toContain("排队中");
    expect(customerServiceConversationStatsReport).toContain("放弃会话");
    expect(customerServiceConversationStatsReport).toContain("平均等待");
    expect(customerServiceConversationStatsReport).toContain("平均首响");
    expect(customerServiceConversationStatsReport).toContain("平均处理");
    expect(customerServiceConversationStatsReport).toContain("满意度");
    expect(customerServiceConversationStatsReport).toContain("对话量趋势");
    expect(customerServiceConversationStatsReport).toContain("来源渠道");
    expect(customerServiceConversationStatsReport).toContain("会话分类");
    expect(customerServiceConversationStatsReport).not.toContain("语言分布");
    expect(customerServiceConversationStatsReport).toContain("坐席效率");
    expect(customerServiceConversationStatsReport).not.toContain("AI 辅助");
    expect(customerServiceConversationStatsReport).toContain("CustomerServiceExportTaskDialog");
    expect(customerServiceConversationStatsReport).toContain("导出统计对话");
    expect(customerServiceConversationStatsReport).toContain("暂无坐席效率数据");
    expect(customerServiceConversationStatsReport).toContain("resolveServicePerformanceStaff(stats)");
    expect(customerServiceConversationStatsReport).not.toContain("接口未返回 staffPerformance");
    expect(customerServiceConversationStatsReport).toContain("接口未返回 channelDistribution");
    expect(customerServiceConversationStatsReport).not.toContain("接口未返回 localeDistribution");
    expect(customerServiceConversationStatsReport).toContain("今日");
    expect(customerServiceConversationStatsReport).toContain("昨日");
    expect(customerServiceConversationStatsReport).toContain("近7天");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-toolbar");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-range-inline");
    expect(customerServiceConversationStatsReport).toContain("statsRange");
    expect(customerServiceConversationStatsReport).toContain("getTempSessionStats(statsParams)");
    expect(customerServiceConversationStatsReport).toContain('{ label: "全部", value: "all" }');
    expect(customerServiceConversationStatsReport).toContain('if (input.preset === "all") return {};');
    expect(customerServiceConversationStatsReport).toContain('preset === "all" || Boolean(input.from && input.to)');
    expect(customerServiceConversationStatsReport).toContain("自定义");
    expect(customerServiceConversationStatsReport).toContain('dataCenterView !== "self-service"');
    expect(customerServiceConversationStatsReport).toContain("当前账号无权查看团队统计数据");
    expect(customerServiceConversationStatsReport).toContain("createCustomerServiceExportTask");
    expect(customerServiceConversationStatsReport).toContain("filters: exportFilters");
    expect(customerServiceConversationStatsReport).not.toContain("statsExportFilterKey");
    expect(customerServiceConversationStatsReport).not.toContain("exportTaskFilterChips(exportParams)");
    expect(customerServiceConversationStatsReport).toContain("sortExportTasks(exportTasksQuery.data ?? [])");
    expect(customerServiceConversationStatsReport).not.toContain("mergeExportTasks(localExportTask");
    expect(customerServiceExportTaskDialog).toContain("cs-stats-export-current-filter");
    expect(customerServiceConversationStatsReport).not.toContain("exportTaskFilterLabel");
    expect(customerServiceConversationStatsReport).not.toContain("exportTaskFilters(task, exportTaskFiltersById)");
    expect(customerServiceConversationStatsReport).toContain("recordCountLabel: exportRecordCountLabel(task.recordCount)");
    expect(customerServiceConversationStatsReport).toContain("completedAtLabel: task.completedAt");
    expect(customerServiceConversationStatsReport).toContain("statsExportFilters(exportRange)");
    expect(customerServiceConversationStatsReport).toContain("setExportRange");
    expect(customerServiceConversationStatsReport).toContain("getCustomerServiceExportTasks");
    expect(customerServiceConversationStatsReport).toContain("downloadCustomerServiceExportTask");
    expect(customerServiceConversationStatsReport).not.toContain("创建统计对话异步导出任务");
    expect(customerServiceConversationStatsReport).not.toContain("默认带入当前统计日期条件");
    expect(customerServiceExportTaskDialog).not.toContain("导出条件");
    expect(customerServiceExportTaskDialog).toContain("<span>文件名</span>");
    expect(customerServiceExportTaskDialog).toContain("<span>记录数</span>");
    expect(customerServiceExportTaskDialog).toContain("<span>创建时间</span>");
    expect(customerServiceExportTaskDialog).toContain("<span>完成时间</span>");
    expect(customerServiceExportTaskDialog).not.toContain("cs-stats-export-task-size");
    expect(customerServiceExportTaskDialog).not.toContain("文件 / 条件");
    expect(customerServiceExportTaskDialog).not.toContain("未返回查询条件");
    expect(customerServiceExportTaskDialog).not.toContain("<h3>导出任务</h3>");
    expect(customerServiceExportTaskDialog).not.toContain("onRefresh");
    expect(customerServiceExportTaskDialog).not.toContain("onRetry");
    expect(customerServiceExportTaskDialog).toContain("下载");
    expect(customerServiceConversationStatsReport).toContain('"cs_staff_daily_stats"');
    expect(customerServiceConversationStatsReport).not.toContain("导出 cs_staff_daily_stats");
    expect(customerServiceConversationStatsReport).not.toContain("StatsGrain");
    expect(customerServiceConversationStatsReport).not.toContain("grain");
    expect(customerServiceConversationStatsReport).toContain("sessionTrend");
    expect(customerServiceConversationStatsReport).toContain("filterTrendByRange");
    expect(customerServiceConversationStatsReport).toContain("parseTrendPointDate");
    expect(customerServiceConversationStatsReport).toContain("trendRangeDays");
    expect(customerServiceConversationStatsReport).toContain("valuesByDate");
    expect(customerServiceConversationStatsReport).not.toContain("cs-stats-panel-badge");
    expect(customerServiceConversationStatsReport).toContain("ConversationTrendChart");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-trend-chart");
    expect(customerServiceConversationStatsReport).toContain("width: 1280");
    expect(customerServiceConversationStatsReport).toContain("const rawMax = Math.max(...values, 0)");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-trend-y-label");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-trend-average");
    expect(customerServiceConversationStatsReport).toContain('point.isZero ? "zero" : ""');
    expect(customerServiceConversationStatsReport).toContain('point.isPeak ? "peak" : ""');
    expect(customerServiceConversationStatsReport).toContain("labelStride");
    expect(customerServiceConversationStatsReport).toContain("point.showLabel");
    expect(customerServiceConversationStatsReport).toContain("hoveredIndex");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-trend-tooltip");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-trend-hit");
    expect(customerServiceConversationStatsReport).not.toContain("distributionRows(model.trend)");
    expect(customerServiceConversationStatsReport).not.toContain("localeDistribution");
    expect(customerServiceConversationStatsReport).toContain('variant="pie"');
    expect((customerServiceConversationStatsReport.match(/variant="pie"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(customerServiceConversationStatsReport).toContain("DistributionPieChart");
    expect(customerServiceConversationStatsReport).toContain("pieDistributionRows");
    expect(customerServiceConversationStatsReport).not.toContain("cs-stats-granularity");
    expect(customerServiceConversationStatsReport).not.toContain("查看导出报表");
    expect(customerServiceConversationStatsReport).not.toContain("stats?.aiHandoffSessions");
    expect(customerServiceConversationStatsReport).toContain("staff.excellentRate");
    expect(customerServiceConversationStatsReport).not.toContain("transferCount");
    expect(customerServiceConversationStatsReport).not.toContain("transferredCount");
    expect(customerServiceConversationStatsReport).not.toContain("transferSessions");
    expect(customerServiceConversationStatsReport).not.toContain("completionRate");
    expect(productPagesCss).toContain(".cs-stats-page");
    expect(productPagesCss).toContain(".cs-stats-toolbar");
    expect(productPagesCss).toContain(".cs-stats-range-inline");
    expect(productPagesCss).not.toContain(".cs-stats-panel-badge");
    expect(productPagesCss).toContain(".cs-stats-trend-chart");
    expect(productPagesCss).toContain(".cs-stats-trend-svg");
    expect(productPagesCss).toContain(".cs-stats-trend-head-actions");
    expect(productPagesCss).toContain(".cs-stats-trend-summary");
    expect(productPagesCss).toContain(".cs-stats-trend-tooltip");
    expect(productPagesCss).toContain(".cs-stats-trend-hit");
    expect(productPagesCss).toContain(".cs-stats-trend-y-label");
    expect(productPagesCss).toContain(".cs-stats-trend-average");
    expect(productPagesCss).toContain(".cs-stats-trend-point.zero");
    expect(productPagesCss).toContain(".cs-stats-trend-point.peak");
    expect(productPagesCss).toContain("grid-template-columns: minmax(620px, 1fr) minmax(260px, 300px)");
    expect(productPagesCss).toContain("grid-template-rows: minmax(300px, 0.86fr) minmax(0, 1fr)");
    expect(productPagesCss).toContain("height: clamp(238px, 28vh, 300px)");
    expect(productPagesCss).toContain("grid-column: 1 / -1");
    expect(productPagesCss).toContain("grid-template-rows: repeat(2, minmax(0, 1fr))");
    expect(productPagesCss).toContain(".cs-stats-pie");
    expect(productPagesCss).toContain(".cs-stats-pie-legend");
    expect(productPagesCss).not.toContain(".cs-stats-capability-strip");
    expect(productPagesCss).toContain(".cs-stats-export-tasks");
    expect(productPagesCss).toContain(".cs-stats-export-task-list");
    expect(productPagesCss).toContain("grid-template-columns: repeat(8");
    expect(productPagesCss).toContain(".cs-stats-kpi-grid");
    expect(productPagesCss).toContain(".cs-stats-staff-table");
    expect(productPagesCss).toContain(".cs-stats-export-dialog");
  });

  it("adds current customer-service chat lookup by reusing the IM history dialog", () => {
    expect(workspaceHeader).toContain("onOpenLookup");
    expect(workspaceHeader).toContain('t("messages.chatHeader.searchMessages")');
    expect(workspaceHeader).toContain("<Search");
    expect(chatWorkspace).toContain("MessageHistoryLookupDialog");
    expect(chatWorkspace).toContain("getHistoryFilterCounts(displayMessages)");
    expect(chatWorkspace).toContain("filterMessagesByHistory(displayMessages, lookupHistoryFilter)");
    expect(chatWorkspace).toContain("filterVisibleMessages(");
    expect(chatWorkspace).toContain("createMessageLookupScope(\"hot\")");
    expect(chatWorkspace).toContain("isMineMessage={(message) => isMineMessage(message, session)}");
    expect(chatWorkspace).toContain("currentUserDisplayName={session?.displayName}");
    expect(customerServiceHistoryReport).toContain("isMineMessage={(message) => isMineHistoryMessage(message, session)}");
    expect(chatWorkspace).toContain("scrollToServiceMessage");
    expect(messageStage).toContain("data-message-id={message.messageId}");
  });

  it("keeps the role workbench dense and defaults managers to live service monitoring", () => {
    expect(workbenchPage).toContain("defaultWorkbenchShortcutId");
    expect(workbenchPage).toContain('return role === "admin" || role === "owner" ? "wb-admin-service-center" : "wb-cs-notices"');
    expect(staticConfig).toContain("currentTenantMembershipRole(session)");
    expect(staticConfig).toContain('if (membershipRole === 4) return "owner"');
    expect(staticConfig).toContain('if (membershipRole === 3) return "admin"');
    expect(workbenchPage).toContain("workbench-main-grid");
    expect(workbenchPage).toContain("workbench-tabs");
    expect(workbenchPage).not.toContain("Object.entries(grouped)");
    expect(workbenchPage).not.toContain("workbench-card");
    expect(workbenchPage).not.toContain("workbench-section");
    expect(workbenchPage).not.toContain("ROLE WORKBENCH");
    expect(workbenchPage).not.toContain("role-card");
    expect(workbenchPage).toContain("CustomerServiceMonitorPanel");
    expect(staticConfig).toContain('"wb-admin-service-center"');
    expect(staticConfig.indexOf('"wb-cs-notices"')).toBeLessThan(
      staticConfig.indexOf('"wb-admin-service-center"'),
    );
    expect(staticConfig.indexOf('"wb-admin-service-center"')).toBeLessThan(
      staticConfig.indexOf('"wb-cs-performance"'),
    );
    expect(staticConfig.indexOf('"wb-cs-performance"')).toBeLessThan(
      staticConfig.indexOf('"wb-cs-quick-replies"'),
    );
    expect(staticConfig).not.toContain('"wb-admin-customers"');
    expect(staticConfig).not.toContain('"wb-admin-groups"');
    expect(staticConfig).not.toContain('"wb-owner-broadcast"');
    expect(staticConfig).not.toContain('state: "pending_api"');
    expect(customerServiceMonitorPanel).toContain("getCustomerServiceMonitorDashboard()");
    expect(customerServiceMonitorPanel).toContain("getCustomerServiceMonitorStaffStatuses()");
    expect(customerServiceMonitorPanel).toContain("getCustomerServiceMonitorSlaDashboard()");
    expect(customerServiceMonitorPanel).toContain("loadMonitorThreadItems(client!, queryFilters)");
    expect(customerServiceMonitorPanel).toContain("getCustomerServiceMonitorThreadDetail");
    expect(customerServiceMonitorPanel).toContain("assignedStaffUserId");
    expect(customerServiceMonitorPanel).toContain("status");
    expect(customerServiceMonitorPanel).toContain("threadType");
    expect(customerServiceMonitorPanel).toContain("keyword");
    expect(customerServiceMonitorPanel).toContain("useQueries");
    expect(customerServiceMonitorPanel).toContain("monitorLayoutCapacity(layoutMode)");
    expect(customerServiceMonitorPanel).toContain("watchedThreadKeys");
    expect(customerServiceMonitorPanel).toContain("cs-monitor-wall-grid");
    expect(workbenchKnowledgeCss).toContain("grid-template-columns: minmax(0, 1fr) !important");
    expect(workbenchKnowledgeCss).toContain(".workbench-main-grid");
    expect(workbenchKnowledgeCss).toContain(".workbench-tabs");
    expect(workbenchKnowledgeCss).toContain("min-height: 0 !important");
    expect(workbenchKnowledgeCss).toContain(".cs-monitor-wall.layout-3-3");
    expect(workbenchKnowledgeCss).toContain(".cs-monitor-window");
  });

  it("keeps customer-service conversation actions in the chat header", () => {
    expect(workspaceHeader).toContain('className="h-chat-head-actions"');
    expect(workspaceHeader).toContain('t("composer.translate")');
    expect(workspaceHeader).toContain("transferMode === \"assign\"");
    expect(workspaceHeader).toContain("customerService.transfer.assignShort");
    expect(workspaceHeader).toContain("customerService.transfer.openShort");
    expect(workspaceHeader).toContain('t("common.close")');
    expect(workspaceHeader).toContain('t("messages.chatHeader.searchMessages")');
    expect(workspaceHeader).toContain("onCloseThread");
    expect(chatWorkspace).toContain("const threadActionPolicy = useMemo");
    expect(threadActionPolicy).toContain("canSuperviseCustomerServiceClose");
    expect(chatWorkspace).toContain("canClose={threadActionPolicy.close.enabled}");
    expect(chatWorkspace).toContain('onCloseThread={() => handleThreadAction("close")}');
    expect(threadActionPolicy).toContain("canSuperviseCustomerServiceTransfer");
    expect(threadActionPolicy).toContain("liveThread && canSuperviseTransfer");
    expect(chatWorkspace).toContain("canTransfer={threadActionPolicy.transferDialog.enabled}");
    expect(chatWorkspace).toContain("currentCustomerServiceStaffName");
    expect(chatWorkspace).toContain("currentStaffName={currentTransferStaffName}");
    expect(transferDialog).toContain("currentStaffName");
    expect(transferDialog).toContain('t("customerService.transfer.currentStaff")');
    expect(threadActionButton).not.toContain('onAction("close")');
  });

  it("supports silent customer-service message recall for sent agent messages", () => {
    expect(serviceMessageContextMenu).toContain('"recall"');
    expect(serviceMessageContextMenu).toContain("createMessageContextMenuState");
    expect(serviceMessageContextMenu).toContain("recallWindowMinutes: Number.POSITIVE_INFINITY");
    expect(serviceMessageContextMenu).toContain('t("messages.contextMenu.action.silentRecall")');
    expect(serviceMessageContextMenu).toContain("isServiceSilentRecallableMessage");
    expect(serviceMessageContextMenu).toContain("availability.save_media_as");
    expect(chatWorkspace).toContain("canSilentRecallMessage");
    expect(chatWorkspace).toContain("isServiceSilentRecallableMessage(message, mine)");
    expect(messageStage).toContain("mine={isCustomerServiceMineMessage(messageMenu.message, isMineMessage)}");
    expect(chatWorkspace).toContain("recallCustomerServiceMessage");
    expect(chatWorkspace).toContain("removeCustomerServiceMessage");
    expect(chatWorkspace).toContain("requestMessageDangerConfirmation");
    expect(chatWorkspace).not.toContain('setNotice(t("messages.actionMutations.recallSuccess"))');
    expect(customerServiceClient).toContain("recallCustomerServiceMessage(messageId: string)");
    expect(customerServiceClient).toContain("endpointPlan.messageRecallSilent");
    expect(csCacheAdapter).toContain("removeCustomerServiceMessage");
    expect(csCacheAdapter).toContain("messages.filter((message) => message.messageId !== messageId)");
  });

  it("passes complete history filters through the customer-service API client", () => {
    expect(customerServiceClient).toContain("getCustomerServiceHistoryThreads");
    expect(customerServiceClient).toContain("endpointPlan.adminCustomerServiceCenterHistorySessions");
    [
      "customerId",
      "customerUserId",
      "visitorUserId",
      "keyword",
      "staffUserId",
      "locale",
      "sourcePlatform",
      "country",
      "region",
      "minRiskLevel",
    ].forEach((field) => {
      expect(customerServiceClient).toContain(`"${field}"`);
    });
    expect(customerServiceHistoryReport).not.toContain("createSourceChannelOptionsFromThreads");
    expect(customerServiceHistoryReport).not.toContain("filters.sourceChannel");
    expect(customerServiceHistoryReport).toContain("value={filters.region}");
    expect(customerServiceHistoryReport).toContain("value={exportFilters.region}");
    expect(customerServiceHistoryReport).toContain('"sourcePlatform"');
    expect(customerServiceHistoryReport).toContain("sourcePlatformLabel(firstHistoryText(raw.sourcePlatform, thread.platform, thread.provider, thread.source))");
    expect(customerServiceHistoryReport).toContain("slaRisk");
    expect(customerServiceClient).toContain("minRating");
    expect(customerServiceClient).toContain("maxRating");
    expect(customerServiceHistoryReport).toContain('if (segment === "negative") return { minRating: 1, maxRating: 2 }');
    expect(customerServiceHistoryReport).toContain('if (segment === "neutral") return { minRating: 3, maxRating: 3 }');
    expect(customerServiceHistoryReport).toContain('if (segment === "positive") return { minRating: 4, maxRating: 5 }');
    expect(customerServiceHistoryReport).toContain("...(rating ? { minRating: rating, maxRating: rating } : ratingRange)");
    expect(customerServiceHistoryReport).toContain("rating");
  });

  it("paginates the customer-service pool history with the server cursor", () => {
    expect(threadList).toContain("useInfiniteQuery");
    expect(threadList).toContain("initialPageParam: null as string | null");
    expect(threadList).toContain("cursor: pageParam");
    expect(threadList).toContain("getNextPageParam: (lastPage) => lastPage.nextCursor || undefined");
    expect(threadList).toContain("historyQuery.fetchNextPage()");
    expect(threadList).toContain("historyQuery.hasNextPage ? \"+\" : \"\"");
    expect(threadList).toContain('t("customerService.threadList.loadMore")');
    expect(workspaceController).toContain("useInfiniteQuery");
    expect(workspaceController).toContain("historyQuery.data?.pages.flatMap((page) => page.items) ?? []");
  });
});
