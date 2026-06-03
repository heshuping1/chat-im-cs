# PC 端 P19 文件职责与 AI 上下文治理清单

状态：已完成

日期：2026-05-30

目标：让 PC 端代码在不制造文件爆炸的前提下，保持职责清楚、文件不过大、入口稳定、上下文友好，后续 AI 或工程师能按 owner 快速定位、修改和验证。

边界：

1. 不新增依赖。
2. 不替换技术栈。
3. 不为了行数机械拆分。
4. 不制造只转发一个函数的无意义 facade。
5. 不删除核心旧 store facade。
6. 不改变 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract。

## 1. 治理标准

优先级：

```text
职责清晰优先；
AI 上下文可读性第二；
文件数量克制第三；
功能稳定和测试可验证兜底。
```

文件偏大只触发审查，不直接触发拆分。拆分必须同时满足至少一个收益：职责更清楚、阅读路径更短、测试更容易定位、后续需求落点更明确。

## 2. AI 上下文预算线

| 文件类型 | 理想范围 | 审查线 | 处理原则 |
| --- | ---: | ---: | --- |
| 页面文件 | 200-450 行 | 600 行 | 页面只做装配；超过后优先迁出 query、mutation、复杂 UI 状态。 |
| 业务组件 | 120-350 行 | 500 行 | 展示和交互事件抛出；超过后检查是否混入业务规则。 |
| hook/controller | 120-300 行 | 400 行 | 行为编排可以稍长；超过后检查是否混入纯规则或协议解析。 |
| model/domain | 150-400 行 | 500 行 | 纯规则集合可偏大；超过后按规则域拆。 |
| data/api/cache | 200-450 行 | 550 行 | 协议和 cache owner 可偏大；超过后按 DTO、normalizer、cache action 拆。 |
| main/preload/runtime | 150-400 行 | 500 行 | 系统能力边界要集中但可测；超过后抽 validation、template、window options。 |
| CSS | 300-1200 行 | 1600 行 | 按 token/base/shell/feature/primitive owner 判断；不按行数机械拆。 |
| 纯类型/配置表 | 可偏大 | 700 行 | 允许例外，但必须 owner 单一、无副作用、导出稳定。 |

## 3. 任务表

| 任务编号 | 目标 | 说明 | 验收 | 验证记录 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P19-GOV-001 | 建立 P19 上下文预算治理清单 | 记录 owner、职责、行数、AI 阅读风险、处理结论。 | 后续任务可追踪，不依赖聊天上下文。 | `validation/P19-GOV-001-context-ledger-2026-05-30.md` | 已完成 |
| P19-ROUTE-001 | 建立 AI 文件路由表 | 按 IM、客服、Gateway、媒体、Electron、CSS、设置等场景列先读入口、禁止边界和验证命令。 | AI 能按任务只读必要文件。 | `validation/P19-ROUTE-001-ai-file-routing-2026-05-30.md` | 已完成 |
| P19-AUDIT-001 | 全量文件职责和上下文审查 | 审查页面、组件、hook、model、data、runtime、main/preload、CSS。 | 重点文件标记为保留、拆分、合并、例外、观察。 | `validation/P19-AUDIT-001-context-audit-2026-05-30.md` | 已完成 |
| P19-SPLIT-001 | 大文件最小拆分 | 只拆超过审查线且职责混杂或 AI 阅读成本高的文件。 | 拆后 owner 更清楚，原入口稳定，测试通过。 | `validation/P19-SPLIT-001-message-body-media-context-2026-05-30.md` | 已完成 |
| P19-MERGE-001 | 过碎文件反治理 | 找出无意义 wrapper、过度 facade、只服务一个调用点的小文件。 | 能合并则合并；不能合并则写明理由。 | `validation/P19-MERGE-001-over-split-audit-2026-05-30.md` | 已完成 |
| P19-CSS-001 | CSS 职责与上下文治理 | CSS 按 owner 和作用域治理；大 CSS 只在跨 owner、难删除、深层覆盖时拆。 | 无跨 feature 污染，CSS 修改路径可预测。 | `validation/P19-CSS-001-css-context-owner-2026-05-30.md` | 已完成 |
| P19-GUARD-001 | 结构守卫补强 | 新增 P19 审计命令，并在结构测试中守卫 P19 文档和上下文预算入口。 | 新增超预算文件必须登记；核心职责回流会失败。 | `validation/P19-GUARD-001-context-guard-2026-05-30.md` | 已完成 |
| P19-DOC-001 | 文档和矩阵同步 | 更新 README、任务矩阵、P19 清单、AI 文件路由和验证记录。 | 新会话 AI 可恢复判断标准。 | `validation/P19-DOC-001-doc-matrix-sync-2026-05-30.md` | 已完成 |

## 4. 上下文预算审计结论

| 文件 | owner | 职责 | 不负责 | 当前行数 | AI 阅读风险 | 稳定入口 | 处理结论 |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| `src/renderer/styles/shared/porcelain-shell.css` | shared CSS shell | app shell、账号弹层、客服外壳 skin 的 shared shell 样式 | 单个 feature 的消息/客服业务样式 | 1841 | 偏大，但 token/shell owner 清楚，当前拆分会增加跨文件跳转 | CSS owner 入口不变 | 例外保留；后续只有出现跨 feature 污染或难删除覆盖时再拆 |
| `src/renderer/styles/messages/message-center.css` | messages CSS | IM 页面布局、会话区域、消息中心结构样式、消息状态外置 marker | composer rich input、媒体内容 primitive、客服样式 | 1994 | 接近 P12 CSS 2000 行硬线，但当前新增 spinner 与失败 marker 同 owner；另拆会增加状态样式跳转 | message center 样式入口不变 | 例外保留；后续新增状态样式前优先评估迁出 message status CSS owner |
| `src/renderer/components/MessageComposer.tsx` | message composer presentation | composer 装配、输入区域、附件/emoji/screenshot 操作连接 | raw DTO、cache merge、Electron 直接 IPC | 692 | 组件较长，但已由 composer 子组件和 runtime owner 承担复杂职责 | `MessageComposer` props 入口不变 | 观察保留；下一次新增 composer 功能时优先迁到 existing composer owner |
| `src/renderer/components/LexicalChatInput.tsx` | rich input presentation | Lexical editor wiring、粘贴/附件节点、输入事件 | 发送规则、API、cache、Electron IPC | 657 | Lexical 桥接代码集中，拆太碎会降低编辑器上下文完整性 | `LexicalChatInput` 入口不变 | 观察保留；只在新增 plugin 逻辑时抽 plugin owner |
| `src/renderer/components/MessageCenter.tsx` | IM page assembly | 页面装配、布局、view model 连接、弹层组合 | 消息规则、raw DTO、cache 写入、desktopApi | 621 | 接近页面审查线，主要是装配导线；无新增拆分收益 | `MessageCenter` 路由入口不变 | 例外保留；功能变更必须先读 view model/hooks |
| `src/renderer/components/ChatWorkspace.tsx` | customer-service workspace assembly | 客服会话页装配、消息舞台、输入区、关闭确认和工作台 hooks 连接 | 客服协议 normalizer、Gateway raw event、thread cache 写入规则 | 651 | 页面重新超过审查线，当前增长来自关闭确认装配；规则已下沉到 model，仍需观察 | `ChatWorkspace` 路由入口不变 | 观察保留；下一次客服工作台增长优先拆 workspace commands/confirmation layer |
| `src/renderer/components/ContactsPage.tsx` | contacts page assembly | 通讯录页面装配、入口状态、添加好友弹窗和详情区组合 | API DTO 解释、好友关系纯规则、头像 fallback | 634 | 刚过页面审查线；近期客户/客服双模式入口和添加好友闭环增加装配线，但规则已在 controller/model | `ContactsPage` 路由入口不变 | 观察保留；下一次通讯录功能增长优先迁到 contacts owner 子组件 |
| `src/renderer/messages/components/MessageCenterConversationStage.tsx` | IM conversation stage assembly | 会话主舞台、资料 dock、composer、overlay 和 dialogs 的纯展示装配 | API client、cache 写入、消息发送规则、Electron IPC | 526 | 刚过组件审查线，新增增长来自名片资料弹层导线；当前仍是稳定 stage props 汇聚点 | `MessageCenterConversationStage` props 入口不变 | 观察保留；后续若继续增长，优先拆 contact-card profile overlay owner |
| `src/renderer/components/Sidebar.tsx` | app sidebar assembly | 顶部导航、账号入口、在线状态、提醒入口 | 业务规则、API DTO、Electron IPC | 604 | 页面 shell 类装配偏长，但 owner 单一 | `Sidebar` 入口不变 | 观察保留；新增账号面板功能时优先沉到 `SidebarAccountPanels` |
| `src/renderer/messages/models/messageCacheMutationModel.ts` | message cache mutation facade | 消息 cache 写入 facade、兼容旧调用、query cache 更新规则 | 页面交互、API client、React component | 725 | model 较长，P18/P20 已拆 application service 和 outbox owner；facade 为稳定入口 | 原导出不变 | 例外保留；删除旧 facade 需单独确认 |
| `src/renderer/messages/models/messageDisplayModel.ts` | message display model | 消息展示派生、菜单/状态展示判断、格式化前规则 | React hook、组件渲染、API client | 526 | 规则集合偏大但 owner 单一，已有结构测试防反向依赖 | 原导出不变 | 例外保留；新增媒体展示规则优先迁到 media owner |
| `src/renderer/data/im-read-model.ts` | IM read compatibility facade | 已读模型兼容入口、view model 和旧 import 过渡 | 组件、Gateway raw event、API client UI 逻辑 | 512 | 兼容 facade 偏大；删除旧核心链路需确认 | 原导出不变 | 例外保留；后续只在确认旧链路删除窗口处理 |
| `src/renderer/data/api/types.ts` | API DTO contract types | client API DTO 聚合、消息/联系人/客服/账号只读 wire shape 类型 | UI 展示模型、运行时转换 helper、React 状态 | 753 | 纯类型聚合超过 700 行；拆分会造成 re-export 和 import churn，当前保持合同入口稳定 | `src/renderer/data/api-client.ts` re-export 入口不变 | 例外保留；新增非 DTO helper 必须下沉到对应 model |
| `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts` | CS send controller | 客服发送编排、媒体 poster、队列状态、outbox 和线程 cache 协调 | 纯规则、DTO normalizer、组件渲染 | 769 | 行为编排长但流程完整，拆错会影响客服发送稳定性；后续应按 text/media send command 分批拆 | hook 名称和返回值不变 | 观察保留；下一步可按 text/media send command 再拆 |
| `src/renderer/messages/hooks/useMessageMediaSendController.ts` | IM media send controller | IM 媒体发送编排、上传状态、poster 和本地 echo | 纯 display 规则、组件渲染、Electron 直接 IPC | 447 | 行为编排长但 owner 单一；已有 send queue/domain 测试 | hook 名称和返回值不变 | 观察保留；新增媒体类型时优先抽 command helper |
| `src/renderer/messages/hooks/useMessageTextSendController.ts` | IM text send controller | IM 文本发送、本地 echo、失败重发、outbox 状态和 send diagnostics | 媒体上传、组件展示、API DTO normalizer | 404 | 刚过 hook 审查线，但 owner 单一；失败重发与首次发送共享同一闭环，强拆会增加跳转成本 | hook 名称和返回值不变 | 例外保留；若后续继续增长，优先抽纯 text retry command helper |
| `src/renderer/styles/customer-service/customer-service.css` | customer-service CSS layout | 在线客服工作台布局、列表、详情、工单与业务面板样式 | IM 消息中心样式、shared shell token | 3743 | 明显超 CSS 审查线，但当前仍是客服 feature 主样式入口；机械拆分会增加覆盖顺序风险 | 客服样式入口不变 | 观察保留；下一次客服 UI 大改优先按 workbench/list/detail/action drawer 拆 owner |
| `src/renderer/styles/customer-service/customer-service-skin.css` | customer-service CSS skin | 在线客服视觉皮肤、状态色、AI 辅助区和细节 polish | 结构布局、IM 样式、shared shell token | 1776 | 刚过 CSS 审查线，皮肤 owner 清楚但需要防止继续承载布局 | 客服 skin 入口不变 | 观察保留；新增结构样式必须回到 `customer-service.css` 或 feature owner |
| `src/renderer/styles/settings/settings.css` | settings CSS | 设置页分区、设置行、诊断/连接体检/聊天归档/背景设置样式 | IM 消息、客服工作台、shared shell token | 1691 | 刚过 CSS 审查线，当前仍是设置 feature 主样式入口；拆分需按 settings section owner 避免覆盖顺序漂移 | 设置样式入口不变 | 观察保留；新增设置大区前优先评估拆为 section CSS owner |
| `src/renderer/components/OnlineServicePage.tsx` | online-service page assembly | 在线客服页面装配、工作台区域、右侧上下文和弹层组合 | 客服协议 normalizer、Gateway 分流、cache 写入 | 970 | 页面偏大，主要是多区域装配；继续增长会影响 AI 定位 | `OnlineServicePage` 路由入口不变 | 观察保留；新增工作台行为优先迁到 controller/model，新增面板优先拆组件 |
| `src/renderer/components/CustomerProfileWorkspace.tsx` | customer profile workspace | 客户资料工作区装配、资料卡、行为入口和上下文展示 | 客服会话分流、API DTO 解析、全局导航 | 959 | 页面偏大但 owner 单一；资料展示与动作入口耦合较多 | `CustomerProfileWorkspace` 入口不变 | 观察保留；下一次资料功能增长优先拆 profile sections |
| `src/renderer/data/api/customer-service-client.ts` | customer-service API client | 客服接口请求、路径拼接、response normalize、合同诊断 | Gateway 分流、UI 展示模型、React Query cache 合并 | 931 | API client 明显偏大，当前仍围绕客服 API 防腐层；继续增长会压低可读性 | `CustomerServiceApiClient` 入口不变 | 观察保留；新增 normalizer 前优先抽 `customer-service-response-normalizers` |
| `src/renderer/data/api/messages-client.ts` | messages API client | 普通 IM 会话、消息、群组、媒体和收藏相关 client API 请求与 response normalize | 页面展示、Gateway 分流、React Query cache 合并 | 611 | API client 超 data 审查线，当前仍是普通 IM API 防腐层聚合；继续增长会影响 AI 定位 | `MessagesApiClient` 入口不变 | 观察保留；新增大块 normalizer 前优先迁到 message API normalizer owner |
| `src/renderer/components/MePage.tsx` | me page assembly | 我的页面装配、账号信息、设置入口和状态展示 | 认证存储、runtime IPC、设置模型规则 | 774 | 页面偏长但 owner 单一；新增设置项容易继续膨胀 | `MePage` 路由入口不变 | 观察保留；新增设置/账号子区优先拆 section 组件 |
| `src/renderer/messages/components/ConversationInfoPanel.tsx` | conversation info panel | IM 会话资料、成员、通知状态和详情操作展示 | API client、消息 cache、发送/已读规则 | 722 | 组件偏大，主要是资料面板多状态聚合 | `ConversationInfoPanel` props 入口不变 | 观察保留；新增成员管理或媒体区时拆独立 panel section |
| `src/renderer/data/workspace-ui/workspace-store-core.ts` | workspace UI store core | 工作台 UI 状态、导航持久化和 tray 状态核心 store | 业务 API、Gateway raw event、页面展示细节 | 690 | store core 超 data 审查线；状态 owner 清楚但需防止业务规则回流 | workspace store 导出入口不变 | 观察保留；新增业务状态前先建 feature store/model |
| `src/renderer/components/AccountUtilityPages.tsx` | account utility pages | 账号相关辅助页面、表单装配和状态展示 | AuthSession 存储、API DTO normalizer、runtime IPC | 658 | 组件偏大但聚合的是账号辅助页；拆分需按页面入口做 | 账号辅助页入口不变 | 观察保留；新增账号页面优先独立组件 |
| `src/renderer/data/gateway/message-delivery-service.ts` | gateway delivery coordination | Gateway 消息投递 guard、gap sync 触发、IM/客服 cache-write handoff、trace 采样 | UI 展示、发送 runtime、API 字段兼容、已读展示规则 | 592 | 刚过 data 审查线；本轮新增 IM/客服归属边界仍属于 delivery coordination | `createMessageDeliveryService` 入口不变 | 观察保留；继续增长优先抽 `message-delivery-trace` 或 `message-delivery-ownership-guard` |
| `src/renderer/data/customer-service/cs-cache-adapter.ts` | customer-service cache adapter | 客服 thread/message/query cache 合并入口、列表详情快照更新 | Gateway route 判断、UI 展示、API 请求 | 553 | 刚过 data 审查线，cache owner 清楚 | cache adapter 导出入口不变 | 观察保留；新增非 cache 规则必须迁出 |
| `src/renderer/data/customer-service/cs-conversation-index.ts` | customer-service conversation index | 客服 conversation/thread scope 索引、Gateway overlay、server-session alias reconcile | UI 展示、发送 runtime、API 请求、已读可见性判断 | 562 | 刚过 data 审查线；本轮增长来自 threadId/conversationId 新旧 overlay 仲裁，仍属于索引防腐层 | conversation index 导出入口不变 | 观察保留；继续增长优先拆 `cs-conversation-overlay-resolver` |
| `src/renderer/customer-service/components/CustomerServiceQuickReplyDrawer.tsx` | quick reply drawer | 客服快捷回复抽屉展示、搜索、分类和插入交互 | 快捷回复 API normalizer、发送 runtime、权限模型 | 547 | 刚过组件审查线，交互状态集中；继续增长会影响抽屉可读性 | drawer props 入口不变 | 观察保留；新增管理能力时拆 picker/list/editor |
| `src/renderer/settings/models/settingsCatalog.ts` | settings catalog model | 设置项 catalog、分组、搜索和展示元数据 | 设置页面组件、runtime IPC、业务 API | 544 | model 偏大但为纯配置/模型入口，拆分会增加配置跳转 | settings catalog 入口不变 | 观察保留；新增大类设置时按 category 拆配置 |
| `src/main/main.ts` | electron main bootstrap | Electron app/window lifecycle、主进程 IPC handler 注册、托盘和运行时诊断编排 | renderer 业务状态、API DTO normalizer、消息/客服领域规则 | 517 | 刚过 main/preload 审查线；当前仍是主进程启动和能力注册入口，继续增长容易让平台能力回流 | main process bootstrap 入口不变 | 观察保留；新增主进程能力前优先拆 runtime owner 并仅在 main 注册 |
| `src/renderer/messages/hooks/useImReadCommandExecutor.ts` | IM read command executor | IM 已读命令编排、批量同步、可见性和 read command 调度 | 消息展示、API DTO normalizer、客服已读规则 | 417 | 刚过 hook 审查线，行为链路完整；强拆会增加已读 race 排查成本 | hook 入口不变 | 观察保留；新增已读来源时优先抽 command helper |

## 5. 本轮最小拆分

| 原文件 | 新 owner | 迁出职责 | 保留职责 | 边界变化 |
| --- | --- | --- | --- | --- |
| `src/renderer/components/MessageBodyView.tsx` | `src/renderer/messages/components/message-content/MessageMediaParts.tsx` | image/voice/video 的加载、缓存、预览、poster、上传控件连接 | message part 分发、text/markdown/event/contact/location/call 装配 | 不改变 props、DTO、query key、Gateway event、Electron IPC |

拆分后：

1. `MessageBodyView.tsx` 从 569 行降到 190 行，只保留消息内容分发和非媒体小内容。
2. `MessageMediaParts.tsx` 为 390 行，专门承载媒体展示 owner。
3. `FileMessageContent.tsx` 保持原入口，不扩大公共抽象。

## 6. 过碎文件审查结论

`npm run p19:audit` 会列出 25 行以内的 runtime/component/hook 小文件作为过碎信号。本轮审查后不合并以下文件：

| 文件 | 保留理由 |
| --- | --- |
| `src/renderer/data/workspace-ui/workspaceTrayStatusEffect.ts` | 隔离旧 workspace store 的 tray 副作用，避免 store core 直接访问 desktopApi。 |
| `src/renderer/settings/runtime/diagnosticsExport.ts` | settings runtime owner，避免页面直接访问 desktopApi。 |
| `src/renderer/messages/runtime/screenshotCapture.ts` | composer 截图能力 owner，避免组件直接 IPC。 |
| `src/renderer/messages/hooks/useSerialTaskQueue.ts` | IM 页面串行命令队列 owner，命名表达行为，合并会让页面重新承担行为细节。 |
| `src/renderer/messages/components/ChatToastNotice.tsx` | 消息/客服复用的 toast 展示 primitive，调用点超过一个。 |
| `src/renderer/media/runtime/videoPosterMedia.ts` | 媒体 poster 合并规则 owner，被 IM 与客服发送复用。 |
| `src/renderer/components/CustomerProfileBits.tsx` | 客户资料展示 primitive，避免工作台页面重复写 metric/tag。 |
| `src/renderer/messages/hooks/useWindowDismiss.ts` | 弹层关闭行为 owner，被消息弹层复用，保持页面只声明交互。 |
| `src/renderer/data/api/admin-client.ts` | admin API client 分层 owner，合并会扩大 customer-service client 职责。 |
| `src/renderer/data/api-client.ts` | 兼容导出 facade，删除或合并会造成大面积 import 震荡。 |
| `src/renderer/lib/openExternal.ts` | 外部链接打开 owner，隔离 desktopApi 能力。 |
| `src/renderer/components/CustomerInfoPanel.tsx` | 联系人资料面板入口，保留可读 route。 |
| `src/renderer/main.tsx` | React renderer bootstrap 入口，天然短文件。 |
| `src/renderer/media/runtime/mediaPerformancePolicy.ts` | 媒体性能预算常量 owner，后续可被 perf 测试引用。 |
| `src/renderer/messages/models/groupAvatarTypes.ts` | 群头像类型 owner，防止 model 反向依赖组件类型。 |

保留标准：这些文件虽小，但能清楚阻断反向依赖或平台能力泄漏，不属于无意义 wrapper。

## 7. 验证命令

默认：

```bash
npm run p19:audit
npm run p10:audit
npm run p12:audit
npm run check:quick
npm run docs:check
git diff --check
```

核心 IM：

```bash
npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-read-service.spec.ts tests/unit/send-queue.spec.ts
```

客服：

```bash
npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts
```

Electron：

```bash
npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```
