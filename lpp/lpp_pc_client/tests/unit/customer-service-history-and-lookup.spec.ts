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
    expect(customerServiceHistoryReport).toContain("historyEmptyText");
    expect(customerServiceHistoryReport).toContain("没有找到匹配客户身份的历史对话");
    expect(customerServiceHistoryReport).toContain("historySummary");
    expect(customerServiceHistoryReport).toContain("getWorkbenchThreadDetail(");
    expect(customerServiceHistoryReport).toContain("createCustomerServiceExportTask");
    expect(customerServiceHistoryReport).toContain("historyExportType(report)");
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
  });

  it("keeps history participant ids out of the primary table columns", () => {
    const primaryOrderStart = customerServiceHistoryReport.indexOf("const primaryHistoryFieldOrder = [");
    const primaryOrderEnd = customerServiceHistoryReport.indexOf("];", primaryOrderStart);
    const primaryOrder = customerServiceHistoryReport.slice(primaryOrderStart, primaryOrderEnd);

    expect(primaryOrder).toContain('"staffIdentity"');
    expect(primaryOrder).toContain('"customerIdentity"');
    expect(primaryOrder.indexOf('"lastMessageAt"')).toBeGreaterThan(primaryOrder.indexOf('"durationSeconds"'));
    expect(primaryOrder.indexOf('"createdAt"')).toBeGreaterThan(primaryOrder.indexOf('"lastMessageAt"'));
    expect(primaryOrder).not.toContain('"threadId"');
    expect(primaryOrder).not.toContain('"conversationId"');
    expect(customerServiceHistoryReport).toContain("historyFieldColumnClass");
    expect(customerServiceHistoryReport).toContain("HistoryPartyProfileDialog");
    expect(customerServiceHistoryReport).toContain("HistoryThreadDetailDialog");
    expect(customerServiceHistoryReport).toContain("historyThreadDetailRows");
    expect(customerServiceHistoryReport).toContain("historyThreadDetailSections");
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
    expect(customerServiceHistoryReport).toContain("绿泡泡号");
    expect(customerServiceHistoryReport).toContain('staffIdentity: "客服"');
    expect(customerServiceHistoryReport).toContain("HistoryPartyInlineProfile");
    expect(customerServiceHistoryReport).toContain('className="cs-history-party-avatar"');
    expect(customerServiceHistoryReport).toContain("PcAvatar");
    expect(productPagesCss).toContain(".cs-history-party-mini-avatar");
    expect(productPagesCss).toContain(".cs-history-field-lastMessageAt");
    expect(productPagesCss).toContain(".cs-history-field-createdAt");
    expect(customerServiceHistoryReport).toContain('if (type === "temp_session") return "临时会话"');
    expect(customerServiceHistoryReport).toContain('if (normalized.includes("temp-chat-widget")) return "网页小组件"');
    expect(customerServiceHistoryReport).toContain("function riskLevelLabel");
    expect(customerServiceHistoryReport).toContain("0\" || text === \"normal");
    expect(customerServiceHistoryReport).toContain("1分 · 极差");
    expect(customerServiceHistoryReport).toContain("5分 · 非常满意");
    expect(customerServiceHistoryReport).toContain("cs-history-party-trigger");
    expect(customerServiceHistoryReport).toContain("客户用户 ID");
    expect(customerServiceHistoryReport).toContain("客服 ID");
    expect(productPagesCss).toContain(".cs-history-party-modal");
    expect(productPagesCss).toContain(".cs-history-party-avatar");
    expect(productPagesCss).toContain(".cs-history-info-dialog");
    expect(productPagesCss).toContain(".cs-history-info-sections");
    expect(productPagesCss).toContain(".cs-history-info-section");
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
    expect(threadList).toContain("queued && canUseStaffEndpoints");
    expect(workspaceController).toContain("if (!canUseStaffEndpoints)");
    expect(chatWorkspace).toContain("canUseStaffActions={canUseStaffEndpoints}");
    expect(chatWorkspace).toContain("canClose={canUseStaffEndpoints && closePermission.enabled}");
    expect(threadActionButton).toContain("if (!canUseStaffActions) return null;");
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
    expect(customerServiceConversationStatsReport).toContain("导出统计报表");
    expect(customerServiceConversationStatsReport).toContain("接口未返回 staffPerformance");
    expect(customerServiceConversationStatsReport).toContain("接口未返回 channelDistribution");
    expect(customerServiceConversationStatsReport).not.toContain("接口未返回 localeDistribution");
    expect(customerServiceConversationStatsReport).toContain("今日");
    expect(customerServiceConversationStatsReport).toContain("昨日");
    expect(customerServiceConversationStatsReport).toContain("近7天");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-toolbar");
    expect(customerServiceConversationStatsReport).toContain("cs-stats-range-inline");
    expect(customerServiceConversationStatsReport).toContain("statsRange");
    expect(customerServiceConversationStatsReport).toContain("getTempSessionStats(statsParams)");
    expect(customerServiceConversationStatsReport).toContain("自定义");
    expect(customerServiceConversationStatsReport).toContain('dataCenterView !== "self-service"');
    expect(customerServiceConversationStatsReport).toContain("当前账号无权查看团队统计数据");
    expect(customerServiceConversationStatsReport).toContain("createCustomerServiceExportTask");
    expect(customerServiceConversationStatsReport).toContain("getCustomerServiceExportTasks");
    expect(customerServiceConversationStatsReport).toContain("downloadCustomerServiceExportTask");
    expect(customerServiceConversationStatsReport).toContain("创建 `cs_staff_daily_stats` 导出任务");
    expect(customerServiceConversationStatsReport).toContain("导出结果按所选时间范围生成");
    expect(customerServiceConversationStatsReport).toContain("导出任务");
    expect(customerServiceConversationStatsReport).toContain("刷新状态");
    expect(customerServiceConversationStatsReport).toContain("下载");
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
    expect(customerServiceConversationStatsReport).toContain("width: 760");
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
    expect(productPagesCss).toContain("grid-template-columns: minmax(620px, 1fr) minmax(260px, 300px)");
    expect(productPagesCss).toContain("grid-template-rows: minmax(250px, 0.78fr) minmax(0, 1fr)");
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
    expect(customerServiceMonitorPanel).toContain("getCustomerServiceMonitorThreads(queryFilters)");
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
    expect(workspaceHeader).toContain('t("customerService.transfer.openShort")');
    expect(workspaceHeader).toContain('t("common.close")');
    expect(workspaceHeader).toContain('t("messages.chatHeader.searchMessages")');
    expect(workspaceHeader).toContain("onCloseThread");
    expect(chatWorkspace).toContain("canClose={canUseStaffEndpoints && closePermission.enabled}");
    expect(chatWorkspace).toContain("const canTransferThread = useMemo");
    expect(chatWorkspace).toContain('detailAccessMode === "management_readonly"');
    expect(chatWorkspace).toContain('selectedThreadAccessMode === "management_readonly"');
    expect(chatWorkspace).toContain("canTransfer={canTransferThread}");
    expect(chatWorkspace).toContain("currentCustomerServiceStaffName");
    expect(chatWorkspace).toContain("currentStaffName={currentTransferStaffName}");
    expect(transferDialog).toContain("currentStaffName");
    expect(transferDialog).toContain('t("customerService.transfer.currentStaff")');
    expect(chatWorkspace).toContain("onCloseThread={confirmCloseThread}");
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
    expect(messageStage).toContain("mine={isMineMessage(messageMenu.message)}");
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
      "sourceChannel",
      "country",
      "region",
      "minRiskLevel",
    ].forEach((field) => {
      expect(customerServiceClient).toContain(`"${field}"`);
    });
    expect(customerServiceHistoryReport).toContain("sourceChannel");
    expect(customerServiceHistoryReport).toContain('"sourcePlatform"');
    expect(customerServiceHistoryReport).toContain("sourcePlatformLabel(firstHistoryText(raw.sourcePlatform, thread.platform, thread.provider, thread.source))");
    expect(customerServiceHistoryReport).toContain("slaRisk");
    expect(customerServiceClient).toContain("minRating");
    expect(customerServiceClient).toContain("maxRating");
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
