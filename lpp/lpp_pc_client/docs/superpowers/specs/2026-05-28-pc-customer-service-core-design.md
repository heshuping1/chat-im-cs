# PC 在线客服核心机制重构方案

状态：方案评审稿

日期：2026-05-28

范围：`lpp_pc_client` 的在线客服工作台。包含在线客服 `temp_session` 会话池、接待状态、排队、接入、AI 转人工、人工接管、关闭、历史只读、消息收发、未读提醒、客户资料、Gateway 补偿、异常恢复、后台单测和浏览器界面测试。不包含普通 IM `direct/group`，不改 App 端，不假造服务端持久化能力。

## 背景

普通 IM 已经完成独立 read model 重构，但在线客服仍然把核心规则散落在页面层：

- `ThreadList.tsx` 直接展示 `thread.unreadCount`，筛选、自动选中、接入按钮和状态展示耦合。
- `ChatWorkspace.tsx` 在详情加载时直接清未读、合并列表、发提醒、判断是否可回复。
- `GatewayBridge.tsx` 直接改客服列表 unread、消息详情和通知。
- `CustomerContextPanel.tsx` 独立再拉会话列表和历史，可能和聊天区选中逻辑分叉。
- 接待动作、会话状态、未读、提醒、只读、发送权限没有统一状态机。

这会导致典型问题：

- 列表显示未读，但聊天窗口已读。
- 当前会话收到消息是否提醒、是否清未读，依赖不同组件各自判断。
- 排队、AI 接待、人工接待、关闭状态下按钮和输入区可能不一致。
- Gateway、轮询、详情加载、发送成功之间的会话状态可能互相覆盖。
- 测试只能覆盖局部页面，不能验证完整客服机制。

## 目标

重构为成熟客服工作台模型：

1. 在线客服有独立 `customer-service-core`，负责会话状态、接待动作权限、未读、通知、消息追加、详情快照合并和 UI 派生。
2. UI 只上报事实事件，例如“会话列表快照到了”“详情消息加载了”“Gateway 收到消息”“用户打开会话”“发送成功”“接入成功”。
3. UI 只按照 core 输出展示会话列表、按钮、输入区、提醒、只读状态和客户资料 fallback。
4. 服务端 API 是状态权威，前端只能做本地即时体验和 pending 补偿，不能伪造服务端最终状态。
5. 每个状态和场景都有单元测试；核心用户路径必须有浏览器界面测试。

## 非目标

- 不把在线客服 `temp_session` 合并进普通 IM read core。
- 不设计 App 端在线客服。
- 不实现不存在的服务端能力，例如真实转接、排班、客服绩效、SLA 后端计时。
- 不做营销式页面改版；优化目标是客服工作台效率、状态一致性和可测试性。

## 成熟方案边界

### 在线客服 Core 边界

`customer-service-core` 负责以下规则：

- 会话身份：`threadType + threadId` 是主键；`conversationId` 是消息链路辅助键。
- 会话分区：`queued`、`active`、`ai_handling`、`closed`、`history`。
- 接待动作权限：`claim`、`takeover`、`close`、`none`。
- 回复权限：只有人工已接待且未关闭时 `canReply=true`。
- 未读规则：当前打开且消息可见的会话 unread 为 0；自己消息 unread 为 0；非当前会话 incoming 消息 unread 逐条累加；服务端快照覆盖但不能打破本地已读事实。
- 通知规则：队列新增提醒、非当前会话新消息提醒、当前会话新消息不弹全局红点但可追加消息。
- 详情合并：详情消息、列表摘要、Gateway 消息、发送成功必须统一合并。
- 历史只读：终态会话不能发送、不能接入/接管/关闭，只展示历史。
- 异常恢复：发送失败、动作失败、状态冲突、接口过期返回统一转换为 core diagnostics 和 UI 操作建议。

### UI 边界

UI 负责：

- 用户点击、输入、滚动、选择会话。
- 调用 API 和 Gateway adapter。
- 把事实事件传给 core。
- 使用 core 派生的 `CustomerServiceThreadView`、`CustomerServiceWorkspaceView`、`CustomerServiceCommand` 展示 UI 或执行命令。

UI 不负责：

- 判断会话是否可回复。
- 判断 unread 应该加几。
- 判断哪个按钮应该出现。
- 判断 Gateway 消息是否要提醒。
- 用原始 `thread.unreadCount` 直接展示红点。
- 在多个组件里各自维护同一会话的状态。

### 服务端 API 边界

服务端是最终状态权威，应提供：

- `GET /api/client/v1/customer-service/workbench/threads`
  - 返回 `queueItems`、`activeItems`、`summary`。
  - 每个 thread 必须稳定返回 `threadType`、`threadId`、`conversationId`、`status`、`title`、`lastMessagePreview`、`lastMessageAt`、`unreadCount`。
- `GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}`
  - 返回详情和 `messages`。
  - 消息必须有稳定 `messageId` 或可替代 identity、`sentAt`、`messageType`、`body`、sender 身份。
- `POST /api/client/v1/customer-service/workbench/threads/{threadActionType}/{threadId}/{action}`
  - 支持 `claim`、`takeover`、`close`。
  - 返回最新 `status`、`threadId`、`conversationId`。
- `POST /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages`
  - 支持 text/image/file。
  - 返回 `messageId`、`sentAt/serverTime`、可选完整 message。
- `GET/PUT /api/client/v1/customer-service/reception/status`
  - 返回和更新 `serviceStatus`、`queueAcceptEnabled`、`activeSessionCount`、`maxConcurrentSessions`。
- Gateway 事件
  - temp session created/queued/waiting
  - temp session assigned/claimed/taken over
  - temp session message
  - temp session closed/rated

如果字段缺失，core 不猜测关键状态；进入 degraded/blocking 诊断，并让 UI 显示保守状态。

### 已读模型边界

在线客服采用“会话级读水位”模型，而不是让界面逐条改消息状态：

- Core 保存每个会话的 `readWatermark`，来源只能是服务端 read/ack 快照、用户打开并加载可见详情、或当前会话可见时收到的新消息。
- UI 可以上报 `ui.thread_visible(threadKey)`、`ui.messages_viewed(threadKey, lastVisibleMessageIdentity)`，但不能自己决定 unread 数字。
- 当 detail 一次加载很多历史消息时，Core 只把 `lastVisibleMessageIdentity` 之前的消息视为已读；列表仍展示最新一条消息摘要。
- 历史消息是否“已读”由 `readWatermark >= messageIdentity` 派生，不靠 DOM 是否渲染、不靠滚动条位置直接改业务状态。
- 当前会话收到新消息且窗口可见时，Core 将读水位推进到该消息，unread 保持 0；窗口不可见或不是当前会话时，只追加消息并增加 unread。
- 自己发送的消息永远不产生对自己的 unread，也不会推动对方 read 状态；只影响本端列表摘要和消息状态。
- 如果服务端没有 read/ack 接口，读水位只在本 PC 端本地生效；跨端一致性只能依赖下一次服务端 workbench snapshot 收敛，不能宣称全端已读。
- 如果将来服务端提供 read/ack，UI 仍只上报可见事实，Core 生成 `mark_read` command，由 adapter 调用服务端接口。

## 核心数据模型

```ts
type CustomerServiceThreadType = "temp_session" | "im_direct";

type CustomerServiceBucket =
  | "queued"
  | "active"
  | "ai_handling"
  | "closed"
  | "history";

type CustomerServiceAction = "claim" | "takeover" | "close" | "none";

interface CustomerServiceThreadState {
  key: string; // `${threadType}:${threadId}`
  threadType: CustomerServiceThreadType;
  threadId: string;
  conversationId: string;
  status: string;
  bucket: CustomerServiceBucket;
  title: string;
  source?: string;
  avatarUrl?: string | null;
  isVip: boolean;
  unreadCount: number;
  readWatermark?: string | number | null;
  lastMessagePreview: string;
  lastMessageAt?: string | null;
  selected: boolean;
  detailLoaded: boolean;
  messages: CustomerServiceMessageState[];
  pendingAction?: CustomerServiceAction;
  pendingSendIds: string[];
  diagnostics: CustomerServiceDiagnostic[];
}

interface CustomerServiceMessageState {
  messageId: string;
  localId?: string;
  conversationSeq?: number;
  senderKind: "staff" | "visitor" | "system" | "unknown";
  messageType: "text" | "image" | "file" | "event";
  preview: string;
  sentAt: string;
  status: "sending" | "sent" | "failed" | "recalled";
  raw: unknown;
}

interface CustomerServiceThreadView {
  key: string;
  threadId: string;
  title: string;
  bucket: CustomerServiceBucket;
  unreadCount: number;
  showUnreadBadge: boolean;
  statusText: string;
  action: CustomerServiceAction;
  canReply: boolean;
  readonlyReason?: string;
  shouldNotify: boolean;
}
```

## 状态分类

| 原始状态 | Core bucket | 动作 | 输入区 | 说明 |
| --- | --- | --- | --- | --- |
| `queued`、`waiting`、`created`、`1` | `queued` | `claim` | 禁用 | 访客排队，客服接入后回复 |
| `ai`、`bot`、`assist`、`ai_handling` | `ai_handling` | `takeover` | 禁用 | AI 接待中，人工接管后回复 |
| `serving`、`active`、`claimed`、`manual`、`2` | `active` | `close` | 启用 | 人工正在接待 |
| `closed*`、`ended`、`finished`、`resolved`、`expired` | `closed/history` | `none` | 禁用 | 历史只读 |

状态判断必须集中在 core，不允许 UI 自己写 `includes("queue")` 一类逻辑。

## 关键流程

### 1. 打开在线客服页面

1. UI 拉取 reception status、workbench threads、history。
2. Adapter 归一化 API 返回，产生 `api.threads_snapshot`、`api.reception_snapshot`。
3. Core 合并所有会话，输出当前列表、顶部指标、默认选中建议。
4. UI 按 core 选择会话；如果没有当前会话，显示空状态。

### 2. 点击会话

1. UI 上报 `ui.thread_selected(threadId)`。
2. Core 将该会话设为 selected，并清本地 unread。
3. UI 拉取 detail。
4. Detail 返回后上报 `api.thread_detail_loaded`。
5. Core 合并 messages、摘要、客户 fallback，清 selected 会话 unread，输出 `dismiss_reminder` 命令。

### 3. 排队会话接入

1. Core view 输出 `action=claim`、`canReply=false`。
2. UI 点击接入后执行 `POST claim`，同时上报 `ui.thread_action_started`.
3. 成功后上报 `api.thread_action_succeeded`。
4. Core 将 bucket 从 `queued` 改为 `active`，输出 `canReply=true`。
5. 失败后 core 恢复 pending，输出错误提示和 refetch 命令。

### 4. AI 转人工

1. Core 识别 `ai_handling`，输出 `action=takeover`、输入区禁用。
2. 接管成功后进入 `active`。
3. 如果服务端返回已被他人接管或关闭，core 按服务端状态更新，并提示刷新结果。

### 5. 发送消息

1. UI 在 `canReply=true` 时允许发送。
2. UI 生成 local message，上报 `ui.send_started`。
3. Core 将消息加入 selected thread，状态 `sending`，unread 仍为 0。
4. API 成功后上报 `api.send_succeeded`，core 用服务端 messageId 替换 local。
5. API 失败后上报 `api.send_failed`，core 标记该 local message failed，保留可重试。
6. 如果失败是终态写入错误，core 将会话改为只读并要求 refetch。

### 6. Gateway 收到访客消息

1. Adapter 归一化为 `gateway.message_received`。
2. Core 去重后追加消息。
3. 如果是当前打开会话，unread=0，输出 `dismiss_reminder`。
4. 如果不是当前会话，unread += 1，输出 `notify_message`。
5. 自己发送回显不增加 unread、不提醒。

### 7. 关闭会话

1. Core 输出 `action=close`。
2. 成功后 bucket 变 `closed`，输入区禁用。
3. 列表可从 current 移入 history，详情只读。
4. 失败后显示错误并 refetch，防止 UI 留在错误状态。

### 8. 刷新和旧快照

1. 服务端快照是最终状态，但不能让旧快照覆盖本地更可信事实。
2. 对 selected 会话，详情已加载且消息可见时，本地 unread=0 优先。
3. 对非 selected 会话，服务端 `unreadCount` 可覆盖本地累加。
4. 如果 snapshot 缺关键字段，进入 degraded，不直接展示错误 unread。

## 文件设计

### 新增文件

- `src/renderer/data/customer-service-core.ts`
  - 纯函数状态机和派生 view。
- `src/renderer/data/customer-service-contract.ts`
  - API/Gateway 数据契约归一化和诊断。
- `src/renderer/data/customer-service-store.ts`
  - 本地 pending、selected read、failed local message 的轻量持久化结构。
- `tests/unit/customer-service-core.spec.ts`
  - 核心状态机和契约测试。
- `tests/browser/customer-service-full-scenarios.spec.ts`
  - 多端/多状态在线客服 UI 全场景测试。

### 修改文件

- `src/renderer/components/ThreadList.tsx`
  - 使用 core view 展示列表、筛选、按钮和 unread。
- `src/renderer/components/ChatWorkspace.tsx`
  - UI 只上报 detail/send/action 事件，输入区和按钮从 core view 获取。
- `src/renderer/components/CustomerContextPanel.tsx`
  - 使用统一 selected thread view 和 profile fallback。
- `src/renderer/components/GatewayBridge.tsx`
  - 在线客服 Gateway 只转换为 core event，不直接改 unread。
- `src/renderer/components/Sidebar.tsx`
  - 在线客服总提醒使用 core 派生的 unread/queue count。
- `src/renderer/data/api/customer-service-client.ts`
  - 接入契约 validator，保证字段稳定归一化。

## 场景矩阵

### 会话池和筛选

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-L-01 | 无会话 | 显示空状态 | workspace view 返回 empty |
| CS-L-02 | 只有排队会话 | 列表显示排队，按钮为接入 | bucket=queued |
| CS-L-03 | 只有接待中会话 | 列表显示进行中，按钮为关闭 | bucket=active |
| CS-L-04 | AI 接待会话 | 显示人工接管 | bucket=ai_handling |
| CS-L-05 | 已关闭会话 | 当前列表不显示，历史显示只读 | bucket=history |
| CS-L-06 | VIP 会话 | VIP 筛选显示 | `isVip=true` |
| CS-L-07 | 搜索客户名 | 只显示匹配会话 | view filter |
| CS-L-08 | 搜索渠道 | 只显示匹配渠道 | source/channel 参与搜索 |
| CS-L-09 | 列表服务端顺序混乱 | 按未读、风险、最近消息稳定排序 | core sort |
| CS-L-10 | threadId 和 conversationId 不同 | 仍能选中和更新同一会话 | key 使用 threadType/threadId |

### 接待状态

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-R-01 | 客服离线 | 不能自动接入 | reception view 禁用自动分配 |
| CS-R-02 | 客服在线 | 可切换手动/自动 | reception command |
| CS-R-03 | 忙碌 | 不显示可自动接入 | serviceStatus=busy |
| CS-R-04 | 达到接待上限 | 顶部显示上限，接入动作提示风险 | active/max |
| CS-R-05 | reception API 失败 | 保留本地状态但显示错误 | degraded |
| CS-R-06 | Gateway 推送状态变化 | 顶部和列表同步 | gateway.status |

### 接入和动作权限

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-A-01 | 排队会话未接入 | 输入区禁用，显示接入 | action=claim |
| CS-A-02 | 接入成功 | 输入区启用 | bucket active |
| CS-A-03 | 接入失败 | 恢复按钮，显示错误，refetch | action_failed |
| CS-A-04 | AI 会话未接管 | 输入区禁用，显示人工接管 | action=takeover |
| CS-A-05 | 接管成功 | 输入区启用 | bucket active |
| CS-A-06 | 接管时已被关闭 | 显示只读 | server terminal |
| CS-A-07 | 活跃会话 | 显示关闭会话 | action=close |
| CS-A-08 | 关闭成功 | 输入区禁用，历史只读 | bucket closed |
| CS-A-09 | 关闭失败 | 保持原状态并提示 | action_failed |
| CS-A-10 | 历史会话 | 不显示动作按钮 | action=none |

### 消息和未读

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-M-01 | 当前会话加载详情 | 列表 unread 清零 | selected+detail_loaded |
| CS-M-02 | 非当前会话收到访客消息 | unread +1，提醒 | gateway incoming |
| CS-M-03 | 当前会话收到访客消息 | 追加消息，unread=0，不全局红点 | selected active |
| CS-M-04 | 自己消息 Gateway 回显 | 不增加 unread，不提醒 | sender=staff |
| CS-M-05 | 服务端旧快照 unread>0 但当前已读 | 不恢复未读 | selected read fact |
| CS-M-06 | 非当前快照 unread=3 | 展示 3 | server snapshot |
| CS-M-07 | 消息缺 messageId | 使用 fallback identity 去重 | message identity |
| CS-M-08 | Gateway 重复消息 | 不重复追加、不重复提醒 | dedupe |
| CS-M-09 | 消息 seq 跳号 | unread 按消息事件或服务端 count，不按 seq 差 | count != seq gap |
| CS-M-10 | 图片消息 | 展示图片并 preview `[图片]` | messageType=image |
| CS-M-11 | 文件消息 | 展示文件并 preview `[文件]` | messageType=file |
| CS-M-12 | 系统事件 | 展示事件，不算访客未读 | senderKind=system |

### 发送

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-S-01 | 活跃会话发文本 | 本地 sending，成功后 sent | send lifecycle |
| CS-S-02 | 活跃会话发图片 | 上传成功后发送，详情和列表更新 | media lifecycle |
| CS-S-03 | 活跃会话发文件 | 上传成功后发送，详情和列表更新 | media lifecycle |
| CS-S-04 | 发送失败 | 消息保留 failed，可重试 | send_failed |
| CS-S-05 | 上传失败 | 附件保留，提示失败 | upload_failed |
| CS-S-06 | 会话关闭后发送 | 输入区禁用；若并发失败则转只读 | terminal write error |
| CS-S-07 | 发送成功后 refetch 旧详情 | 不重复、不回退 | local/server merge |
| CS-S-08 | 发送时切换会话 | 消息归属原会话 | command scoped key |

### 通知

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-N-01 | 新排队会话 | 产生队列提醒一次 | queue notify dedupe |
| CS-N-02 | 同一排队事件重复 | 不重复提醒 | reminder id |
| CS-N-03 | 非当前会话新消息 | 产生消息提醒 | notify_message |
| CS-N-04 | 当前会话新消息 | 不产生全局未读提醒 | selected suppress |
| CS-N-05 | 关闭会话消息 | 不提醒或只记录诊断 | terminal suppress |
| CS-N-06 | 用户关闭提醒 | 对应 thread reminder 消失 | dismiss command |

### 客户资料

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-P-01 | profile API 成功 | 展示真实资料 | profile snapshot |
| CS-P-02 | profile API 失败 | 使用 thread fallback，不空白 | fallback |
| CS-P-03 | 切换会话 | 资料同步切换 | selected key |
| CS-P-04 | 历史会话 | 资料只读 | history view |
| CS-P-05 | VIP/风险字段存在 | 展示标签 | profile fields |
| CS-P-06 | 字段缺失 | 显示 `--`，不显示 undefined | formatting |

### Gateway 和轮询

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-G-01 | Gateway 创建排队会话 | 列表出现/提醒 | gateway queued |
| CS-G-02 | Gateway assigned | 会话进入 active | gateway status |
| CS-G-03 | Gateway message | 消息追加和 unread 更新 | gateway message |
| CS-G-04 | Gateway closed | 输入区禁用，移入历史或只读 | gateway terminal |
| CS-G-05 | Gateway 断开 | 轮询补偿 | query snapshot |
| CS-G-06 | Gateway 字段缺失 | 不破坏 UI，记录诊断 | contract degraded |

### 异常和恢复

| 编号 | 场景 | 期望 | 核心逻辑 |
| --- | --- | --- | --- |
| CS-E-01 | threads API 失败 | 列表错误态，可重试 | api error |
| CS-E-02 | detail API 失败 | 聊天区错误态，不清空列表 | detail error |
| CS-E-03 | action API 401 | 走全局登录过期 | ApiError 401 |
| CS-E-04 | action API 409/终态 | 更新只读并 refetch | conflict |
| CS-E-05 | send API 终态错误 | 禁用输入区并 refetch | terminal write |
| CS-E-06 | 本地缓存损坏 | 丢弃损坏项 | sanitize |
| CS-E-07 | 多窗口同时打开 | 各自按服务端快照收敛 | server authority |
| CS-E-08 | 快速切换会话 | 不把 A 的详情合并到 B | scoped key |

## 测试策略

### 验证分层

1. 界面场景逻辑验证：浏览器真实点击在线客服页面，检查列表、红点、顶部状态、按钮、输入区、聊天窗口、右侧资料、提醒条展示是否全部来自 core view。
2. Core 逻辑验证：单元测试直接投喂 API/Gateway/UI event，验证状态机、readWatermark、unread、actions、commands、diagnostics，不依赖页面。
3. 整体闭环验证：同一场景同时断言 core 输出、adapter API 调用、页面展示三者一致；特别覆盖 Gateway、轮询、发送成功/失败、动作冲突、快速切换。

### 单元测试

新增 `tests/unit/customer-service-core.spec.ts`：

- 状态分类和动作权限。
- 未读规则。
- 读水位推进和大量历史消息加载。
- Gateway 去重。
- 发送生命周期。
- 详情快照合并。
- 接待动作成功/失败。
- 历史只读。
- 契约缺字段 degraded/blocking。
- 场景矩阵 ID 同步测试。

### 浏览器界面测试

新增 `tests/browser/customer-service-full-scenarios.spec.ts`，使用多个 browser context 和共享 mock 服务端：

- 客服 A 打开在线客服，看到排队/进行中/AI/历史。
- 点击排队会话前输入区禁用；接入后输入区启用。
- AI 会话接管后可回复。
- 非当前会话收到访客消息，列表红点和侧栏提醒增加。
- 当前会话收到访客消息，聊天区出现，红点不增加。
- 发送文本/图片/文件成功后列表和详情同步。
- 发送失败后 failed 留在输入或消息区。
- 关闭会话后输入区消失，历史只读。
- profile API 失败时右侧资料用 fallback。
- Gateway 断开时轮询快照补偿。

### 回归测试

必须继续通过：

- `npm run test:unit`
- `npm run typecheck`
- `npm run test:browser -- tests/browser/workspace-smoke.spec.ts`
- `npm run test:browser -- tests/browser/customer-service-full-scenarios.spec.ts`

如果在线客服改动影响普通 IM，还必须跑：

- `npm run test:browser -- tests/browser/im-read-full-scenarios.spec.ts`

## 成功标准

- UI 不直接展示原始 `thread.unreadCount`；必须用 core view。
- UI 不直接判断 `claim/takeover/close/canReply`；必须用 core view。
- GatewayBridge 不直接增减客服 unread；只上报 core event。
- 当前会话已读和列表未读不再分裂。
- 排队、AI、活跃、关闭、历史的按钮和输入区一致。
- 所有场景矩阵都有单元或浏览器测试覆盖。
- 浏览器测试必须真实点击在线客服页面，不只调用后台函数。

## 风险和服务端要求

- 如果服务端无法稳定返回 `threadId/status/unreadCount/messages`，前端只能 degraded，不能保证完美展示。
- Gateway CORS/Origin 若不可用，真实实时场景只能靠轮询补偿；mock 测试不能替代生产 Gateway 联调。
- 如果服务端没有真正的 read/ack 接口，在线客服“打开即已读”只能做本地 UI 清零和工作台快照覆盖，无法保证其他端一致。
- 如果 action 接口不返回最新状态，前端必须强制 refetch，不能信任本地猜测。

## 方案自检

- 本方案不复用普通 IM core，避免把好友/群聊 read receipt 规则套到客服 temp session。
- 每个 UI 决策都有 core 来源。
- 每个服务端事实都有 event 入口。
- 每个会话状态都有动作权限和输入区结果。
- 每个未读入口都有清零/累加/覆盖规则。
- 每个高风险路径都有测试策略。
