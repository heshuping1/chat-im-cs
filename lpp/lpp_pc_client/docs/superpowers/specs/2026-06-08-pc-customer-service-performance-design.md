# PC 客服团队服务效率设计

日期：2026-06-08

适用范围：`lpp/lpp_pc_client`

## 背景

API 合同在 2026-06-07 更新了管理端客服统计能力：

- `GET /api/admin/v1/customer-service/temp-sessions/stats` 的 `staffPerformance` 从仅统计 Widget 临时会话，升级为跨渠道合并统计 `temp_session + im_direct`。
- `staffPerformance[].byChannel[]` 新增渠道下钻，渠道值为 `widget` 和 `im_direct`。
- 访客与临时会话新增 `acquisition` 结构化获客来源字段。
- `channelDistribution` 统计口径优先按 `sourcePlatform` 分组，旧数据无该字段时回退 `sourceChannel`。

PC 端当前已有 admin token 获取能力和工作台“客服绩效”入口，但该入口仍主要展示在线客服工作台会话摘要，未接入新统计接口，也未解析 `staffPerformance.byChannel` 或 `acquisition`。

## 分级与边界

本任务按 L2 核心客服链路扩展处理，因为它涉及管理端客服中心 API、权限可见性、React Query key 和客服运营 UI。

本任务不触碰：

- 普通 IM 消息发送、已读、未读、撤回、重试。
- Gateway / SignalR 事件合同。
- 本地消息库、发送队列、媒体缓存。
- 客服会话实时状态机和工作台接待动作。

## 产品目标

管理员和 Owner 在 PC 工作台中能快速判断团队服务效率：

- 今天或当前统计窗口内服务了多少会话。
- 会话来自 Widget 匿名访客还是 IM 注册客户直聊。
- 哪些客服处理量高、首响快、会话时长合理、评价和质检表现稳定。
- 渠道统计口径明确，避免把新 `sourcePlatform` 口径误读为旧 `sourceChannel`。

客服角色不展示团队管理统计；客服仍看到个人接待状态、当前会话和进入在线客服的快捷操作。

## 角色与权限

角色入口按现有 PC `membershipRole`：

- `customer_service`：不请求 admin stats；只展示个人服务状态、当前会话摘要和在线客服入口。
- `admin` / `owner`：请求 admin stats；展示团队服务效率总览、来源平台分布、客服跨渠道绩效榜和渠道下钻。

权限以服务端为准：

- stats 接口需要 `customer_service.temp_stats.view`。
- visitor/acquisition 详情需要 `customer_service.temp_visitor.view` 或对应会话详情权限。
- PC 端只做入口和降级控制，不伪造权限，不用 mock 数据兜底。

如果 admin token 换发失败或接口返回 401/403，UI 展示产品化无权限/加载失败状态，真实错误只进入已有 API error/diagnostics 路径。

## 推荐方案

采用“工作台内升级客服绩效详情面板”的路线。

原因：

- `WorkbenchPage` 已有 `wb-cs-performance` 入口和角色分组，改动集中。
- 该能力是管理端运营统计，不应混入 `OnlineServicePage` 的实时接待布局。
- 可以保持 PC 桌面工作台的信息密度，并降低路由和导航改造范围。

暂不新增独立页面。若后续需要日期筛选、导出、质检明细和客服详情抽屉，再把该面板升级为独立“团队服务效率”页面。

## 数据与领域边界

新增或扩展 owner：

- API endpoint：`src/renderer/data/api/endpoints.ts`
- DTO 类型：`src/renderer/data/api/types.ts`
- API client：`src/renderer/data/api/customer-service-client.ts`
- Query key：`src/renderer/data/query-keys.ts`
- 展示模型：`src/renderer/customer-service/models/servicePerformanceModel.ts`
- UI 装配：`src/renderer/components/WorkbenchPage.tsx`
- 样式：`src/renderer/styles/pages/workbench-knowledge.css`

数据流：

```text
WorkbenchPage
  -> React Query: pc-cs-temp-session-stats
  -> CustomerServiceApiClient.getTempSessionStats()
  -> admin token issue/cache
  -> /api/admin/v1/customer-service/temp-sessions/stats
  -> servicePerformanceModel normalize/presentation
  -> WorkbenchDetail render
```

页面只消费展示模型，不直接解释 raw DTO 的渠道枚举、百分比、秒数或空字段。

## UI 设计

`wb-cs-performance` 详情区升级为四块：

1. 团队总览 KPI
   - 总会话、已服务、平均首响、平均会话时长。
   - AI 指标可先不展开，只保留服务效率主指标。

2. 来源平台分布
   - 使用 `channelDistribution`。
   - 标题和提示明确：优先 `sourcePlatform`，旧数据回退 `sourceChannel`。
   - 无数据时显示空态，不造默认渠道。

3. 客服效率榜
   - 每行展示客服姓名、合并服务会话数、首响、时长、评分、质检合格率。
   - 按 `sessionsServed` 降序，空值显示 `--`。

4. 渠道下钻
   - 每个客服行内展示 `Widget 访客` 和 `IM 直聊` 两个小分段。
   - 分段展示该渠道会话数、首响、评分或合格率。
   - 缺少某渠道时显示 `0` 或 `--`，不把缺失解释成另一个渠道。

布局保持桌面高密度，使用已有工作台白瓷视觉，但避免新增大块营销式卡片。

## Acquisition 展示策略

第一步补齐模型解析和只读展示基础：

- 在 temp session / visitor 相关 DTO 中保留 `acquisition`。
- 管理只读详情或客户画像入口可展示：
  - 应用/站点：`applicationId`
  - 来源平台：`sourcePlatform`
  - 聊天工具：`chatTool`
  - 设备/系统：`deviceType`、`os`、`osVersion`
  - 营销归因：`utmSource`、`utmMedium`、`utmCampaign`
  - App 版本、地区、时区

本次不把 `acquisition` 写入 IM 消息模型，不改变会话列表核心排序和缓存归约。

## 异常状态

必须覆盖：

- Loading：显示骨架或轻量同步中状态，不遮挡已有工作台基础数据。
- Empty：stats 返回空数组时显示“暂无团队统计”。
- 401/403：显示“当前身份暂无团队统计权限”。
- 其它错误：显示“团队效率数据加载失败”，带重试入口。
- admin token 缺失：显示需要管理员/Owner 身份进入。

## 测试计划

先写失败测试，再实现：

1. `service-performance-model.spec.ts`
   - 规范化 `staffPerformance.byChannel`。
   - 校验顶层合并会话数和渠道会话数展示。
   - 校验秒数、评分、百分比、空值展示。
   - 校验 `channelDistribution` 新口径提示模型。

2. `customer-service-client.spec.ts` 或相邻 API 测试
   - stats 请求走 admin endpoint。
   - admin stats 不使用普通 client endpoint。

3. `query-keys.spec.ts`
   - 新 query key 带 session scope，不混用其它客服线程 key。

4. 轻量静态验证
   - `npx vitest --configLoader runner run tests/unit/service-performance-model.spec.ts tests/unit/customer-service-client.spec.ts tests/unit/query-keys.spec.ts`
   - 之后运行 `npm run lint:core` 或更高一级可用门禁。

## 验收标准

- admin/owner 能在工作台“客服绩效”详情区看到真实 stats 数据。
- customer_service 不请求 admin stats，不看到团队数据。
- `staffPerformance` 顶层指标按跨渠道合并展示。
- `byChannel` 明确区分 Widget 访客和 IM 直聊。
- `channelDistribution` 文案解释新口径。
- 运行时没有 mock、sample 或硬编码业务统计数据。
- 未触碰普通 IM、Gateway、本地消息库、发送队列和已读账本。

## 遗留风险

- 当前 PC `AuthSession` 尚未持久化 `permissionCodes`，首版只能按 `membershipRole` 控制入口，最终权限仍由服务端 401/403 裁决。
- stats 接口无请求参数，首版不做日期筛选。
- `acquisition` 的完整详情落点取决于 PC 当前管理只读详情组件承载能力；若缺少合适详情页，首版先完成 DTO 和展示模型，UI 展示可限于当前能稳定取得的数据。
