# PC 端重构任务矩阵

状态：执行跟踪稿

日期：2026-05-29

适用范围：`lpp/lpp_pc_client`

关联文档：

- [PC端核心架构技术方案.md](./PC端核心架构技术方案.md)
- [PC端第一阶段重构详细方案.md](./PC端第一阶段重构详细方案.md)

---

## 1. 使用规则

本矩阵用于跟踪 PC 端 IM + 客服重构，不用于记录零散 bugfix。

每个任务必须具备：

1. 任务编号。
2. 所属阶段。
3. 影响范围。
4. 风险等级。
5. 验收方式。
6. 当前状态。
7. 如涉及技术选型，必须有评估结论。
8. 如涉及重复能力，必须说明复用或抽象策略。
9. 必须继承本矩阵的任务执行要求。

状态枚举：

| 状态 | 含义 |
| --- | --- |
| `待开始` | 尚未进入执行。 |
| `进行中` | 正在实现或验证。 |
| `待确认` | 涉及关键风险点，需要负责人确认。 |
| `已完成` | 已实现并通过验收。 |
| `阻塞` | 因接口、环境、方案问题暂不可推进。 |
| `取消` | 经确认不再执行。 |

风险等级：

| 等级 | 含义 |
| --- | --- |
| P0 | 影响登录、消息收发、未读已读、客服接入等核心链路。 |
| P1 | 影响主要页面、状态边界、缓存一致性。 |
| P2 | 影响局部功能或开发体验。 |
| P3 | 文档、规范、低风险整理。 |

验收等级：

| 等级 | 标准 |
| --- | --- |
| L1 | 类型检查 + 代码审查。 |
| L2 | L1 + 单测/集成测试。 |
| L3 | L2 + 核心链路手工验证。 |
| L4 | L3 + E2E/性能/安全专项验证。 |

第一阶段默认验收等级为 `L3`，Gateway 试点任务优先做到接近 `L4`，但不强制完整性能专项。

---

## 1.1 单任务执行要求

每个任务执行时，默认携带以下要求。

| 任务类型 | 执行要求 | 不允许 |
| --- | --- | --- |
| Gateway/实时链路 | raw event 必须先进入 adapter，再进入 dispatcher/handler；handler 异常必须隔离；P0/P1 场景必须补测试。 | 直接在页面或 `GatewayBridge` 新增大段事件业务分支。 |
| Store/状态边界 | 明确状态 owner、持久化 key、迁移策略；服务端快照优先由 React Query 管理。 | 把新业务状态继续塞进单一 workspace store。 |
| API/数据模型 | 建立 DTO -> Domain -> ViewModel；字段缺失、降级、阻断规则要可查。 | 页面组件直接解释后端 raw DTO。 |
| 页面瘦身 | 页面只保留装配、布局、交互；业务规则、发送、已读、权限、缓存合并下沉。 | 为了拆文件制造无意义中转组件。 |
| 职责治理 | 先判断 owner、变化原因、层级边界和稳定入口；行数只作为预警，职责混杂才拆分，职责单一可登记例外。 | 只为了降低行数移动代码，或在拆分时隐式改变 API、query key、store、Gateway、IPC 边界。 |
| 公共能力 | 先查已有能力；第二次出现登记，第三次出现抽象或创建任务。 | 头像、空态、错误态、媒体预览、badge、时间格式各写一套。 |
| Electron/IPC/Token | IPC payload 校验，renderer 最小能力，敏感信息不长期明文落 renderer。 | 新增无校验 IPC 或扩大 Node 能力。 |
| 性能 | 先定义场景和预算，再优化；变更后要有验证证据。 | 无测量地引入复杂优化或重型依赖。 |
| 文档/状态 | 完成后更新任务状态、验证结果、遗留问题。 | 只改代码不更新矩阵。 |

每个任务还必须执行以下通用检查：

```text
任务编号：
任务类型：
文件 owner：
当前文件角色：
当前保留职责：
当前混入的非 owner 职责：
准备迁出的职责：
稳定入口或 re-export：
是否新增依赖：
是否替换技术：
是否复用已有能力：
是否涉及公共能力抽象：
是否影响核心链路：
是否改变 API DTO/wire shape：
是否改变 React Query query key：
是否改变 Zustand/store owner：
是否改变 Gateway 事件边界：
是否改变 Electron IPC/preload 边界：
是否需要负责人确认：
验收等级：
验证命令：
例外登记：
遗留风险：
```

---

## 1.2 技术选型检查规则

每个任务执行前都要判断是否涉及技术选型变化。

需要评估并确认的情况：

1. 新增运行时依赖。
2. 替换现有库或框架。
3. 自研已有成熟方案，例如虚拟列表、schema 校验、日期格式化、日志系统。
4. 改变 React Query、Zustand、SignalR、Electron IPC 的职责边界。
5. 引入会影响包体、安全、性能或开发范式的工具。

评估记录模板：

```text
任务编号：
技术项：
是否新增/替换：
为什么需要：
现有方案为什么不够：
候选方案：
推荐方案：
风险：
负责人确认：
```

没有评估结论的任务，不允许直接引入新技术。

---

## 1.3 公共能力抽象检查规则

每个任务执行时都要检查是否出现重复实现。

重点检查：

1. 头像展示。
2. 用户名称和身份标识。
3. 在线/离线/忙碌状态。
4. 会话列表 item。
5. 消息时间格式。
6. 空态和错误态。
7. 媒体预览。
8. 上传状态。
9. 未读 badge。
10. toast/desktop notification。

处理规则：

| 情况 | 处理 |
| --- | --- |
| 第一次出现 | 可以局部实现，但要保持简单。 |
| 第二次出现 | 记录为潜在公共能力。 |
| 第三次出现 | 必须抽象或创建抽象任务。 |
| 已有公共能力 | 必须复用，不得再写一套。 |

公共能力抽象任务统一使用 `P*-SHARED-*` 编号。

---

## 1.4 文档可查性要求

本次重构必须保证四类信息持续可查：

| 信息 | 对应文档 |
| --- | --- |
| 总体方案可查 | `PC端核心架构技术方案.md` |
| 总体步骤可查 | `PC端核心架构技术方案.md`、本任务矩阵“总体阶段” |
| 具体任务清单可查 | 本任务矩阵 |
| 重构任务状态可查 | 本任务矩阵状态列和验收记录 |

任何阶段结束后，必须更新：

1. 任务状态。
2. 已完成验收。
3. 遗留问题。
4. 新增风险。
5. 是否需要调整后续阶段。

---

## 1.5 日志与诊断可查性要求

本次重构必须建立“Codex 可通过日志排查问题”的能力。所有核心链路任务默认携带日志和诊断要求，尤其是 Gateway、API、Store、消息底座、客服工作台、Electron IPC。

日志治理目标：

1. 能从日志判断一次消息、已读、客服接入、发送、关闭、转接等事件是否进入系统。
2. 能从日志关联事件入口、adapter、handler、cache/store 更新、UI 刷新或失败原因。
3. 能被 Codex 在本地文件中检索、对比、复盘，不依赖开发者口头描述。
4. 能在开发环境提供足够细节，在生产环境避免刷屏和泄露敏感信息。

运行时诊断日志字段建议：

| 字段 | 要求 |
| --- | --- |
| `traceId` | 单次事件链路唯一标识；没有服务端 trace 时由客户端生成。 |
| `module` | `gateway`、`api`、`store`、`message`、`cs`、`electron`、`ui` 等。 |
| `taskId` | 重构阶段内新增能力建议记录，例如 `P1-GW-006`。 |
| `event` | 事件名或动作名，例如 `im.message.received`、`cs.thread.closed`。 |
| `phase` | `received`、`adapted`、`handled`、`cache.updated`、`ignored`、`failed`。 |
| `result` | `ok`、`ignored`、`invalid`、`failed`。 |
| `reason` | invalid、ignored、failed 时必须提供稳定 reason code。 |
| `context` | 只放可排查的必要上下文，例如 conversationId、messageId、threadId、queryKey。 |
| `durationMs` | 涉及异步处理、API、IPC、性能任务时必须记录。 |
| `error` | 只记录 error name、message、code、stack 摘要，不直接记录完整敏感对象。 |

敏感信息规则：

1. 禁止日志输出 `tenantToken`、`platformToken`、`refreshToken`、密码、完整 Authorization header。
2. 用户手机号、邮箱、身份证、文件本地路径默认脱敏，除非调试开关明确允许且只在本机开发环境。
3. Gateway raw payload 默认不完整落日志，只允许落字段摘要、payload shape、关键 ID 和 reason。
4. 生产环境日志必须支持采样、级别控制或诊断开关。

每个 P0/P1 任务验收时必须补充：

```text
诊断日志：
- 是否新增日志：
- 日志入口：
- traceId/correlationId：
- 可用于排查的问题：
- 敏感信息处理：
- Codex 可检索方式：
```

诊断能力任务统一使用 `P*-OBS-*` 或已有阶段内 `INF/EL Diagnostics` 编号。

---

## 2. 总体阶段

| 阶段 | 名称 | 目标 | 状态 |
| --- | --- | --- | --- |
| P0 | 基线审计与方案冻结 | 确认当前行为、风险、技术栈、已有公共能力，冻结重构规则。 | 已完成 |
| P1 | 标准地基 + Gateway 试点 | 建立 Gateway 事件入口、基础类型、dispatcher、handler、测试闭环。 | 已完成 |
| P2 | Store 边界治理 | 拆分 auth、ui、settings、im read、cs status、reminders，降低全局状态耦合。 | 已完成 |
| P3 | API 合同与数据模型治理 | 建立 DTO/Domain/ViewModel 合同，避免页面直接解释后端字段。 | 已完成 |
| P4 | 统一消息底座 | 统一 message/conversation/read/media/send queue 模型，服务 IM 与客服。 | 已完成 |
| P5 | 普通 IM 页面瘦身 | 拆 `MessageCenter`，沉淀 view model 与 presentation 组件。 | 已完成 |
| P6 | 在线客服核心重构 | 治理客服线程、接入、AI 接管、关闭、只读、客服 Gateway 事件。 | 已完成 |
| P7 | 公共能力与 UI 体系收敛 | 头像、空态、错误态、badge、时间、媒体预览、通知等统一复用。 | 已完成 |
| P8 | Electron 安全、性能与工程门禁 | token、IPC、preload、截图安全、性能预算、lint/coverage/CI。 | 已完成 |
| P9 | 成熟度提升与历史大文件收敛 | Gateway、Store、API、IM、客服、Shared UI、工程门禁、Electron/builder 安全升级等成熟度提升任务。 | 已完成 |
| P10 | 重构后收尾治理与发布验证 | 无用代码清理、重复实现约束、坏味道审计、发布检查清单和开发态稳定性。 | 已完成 |
| P11 | 深度清理与长期干净度治理 | 清理测试产物跟踪，继续处理剩余大文件、重复能力、CSS、type escape 和 Windows 实机验证。 | 已完成 |
| P12 | 持续瘦身与长期尺寸治理 | 建立尺寸审计，清零 CSS/组件粗粒度大文件观察项，data/main 转职责治理。 | 已完成 |
| P13 | 代码职责治理基线 | 建立职责审查、owner 审计和例外机制。 | 已完成 |
| P14 | 最小职责迁移 | 按 P13 审计结果做最小职责迁移。 | 已完成 |
| P15 | 机械约束升级 | 将职责规则升级为架构边界测试和例外守卫。 | 已完成 |
| P16 | 发布前验证闭环 | Mac 本地闭环完成，Windows 实机验证独立保留。 | 已完成 |
| P17 | 坏味道整体修复 | 修复依赖方向、Gateway 副作用、Electron 模板、DTO helper、normalize 和 store 副作用。 | 已完成 |
| P18 | 全面架构与稳定性治理 | 架构、功能、分层、性能、解耦、复用、安全和发布闭环治理。 | 已完成 |
| P19 | 文件职责、上下文预算与 AI 可维护治理 | 建立上下文预算审计、AI 文件路由表、过大/过碎结论和消息媒体 owner 最小拆分。 | 已完成 |
| P20 | 功能完善与回归治理 | 后续功能按现有 owner 和 AI 文件路由表小步交付，持续补验证记录。 | 进行中 |

---

### P0 文档治理任务

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P0-DOC-001 | Docs/Agent Context | 建立 PC 端 Codex 渐进式披露入口、重构知识库索引、ADR 和验证记录模板。 | P1 | L1 | 已完成 |
| P0-DOC-002 | Docs/Plans | 复杂任务执行前必须选择轻量计划或版本化执行计划，并记录进度/决策日志。 | P2 | L1 | 已完成 |
| P0-QUALITY-001 | Quality Score | 建立 PC 端质量评分表，按 Gateway、Store、API、IM、客服、Electron、公共 UI 跟踪成熟度和差距。 | P2 | L1 | 已完成 |

P0-DOC-001 验收记录：

1. 新增 `AGENTS.md` 作为 PC 端短入口。
2. 新增 `docs/refactor/README.md` 作为重构知识库索引。
3. 新增 `docs/refactor/adr/README.md` 作为 ADR 入口和模板。
4. 新增 `docs/refactor/validation/README.md` 作为验证记录入口和模板。
5. 文档自动校验和 doc-gardening 暂不立即实现，登记到 P8 工程门禁。

---

## 3. 第一阶段任务：标准地基 + Gateway 试点

第一阶段拆到可直接执行粒度。

### P1-GW-001：建立 Gateway 事件类型

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway |
| 目标 | 定义第一阶段 typed gateway event，覆盖普通 IM 收消息和 `msg.read`。 |
| 文件范围 | `src/renderer/data/gateway/gateway-event-types.ts`、`tests/unit/gateway-event-types.spec.ts` |
| 风险 | P1 |
| 验收 | L2 |
| 状态 | 已完成 |

验收要点：

1. 定义 `im.message.received`。
2. 定义 `im.read.received`。
3. 定义 `ignored` / `invalid` 事件结果。
4. 不引入 React、QueryClient、Zustand 依赖。

### P1-GW-002：抽 Gateway event adapter

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway |
| 目标 | 将 `eventName + raw args` 归一为 typed gateway event。 |
| 文件范围 | `src/renderer/data/gateway/gateway-event-adapter.ts`、`tests/unit/gateway-event-adapter.spec.ts` |
| 风险 | P0 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. 支持 `msg.new`、`message.new`、`message.created`、`chat.message`、`chat.message.new`、`im.message`、`im.message.new`。
2. 支持 `msg.read`。
3. 正确解包 `data/Data/payload/Payload`。
4. 缺少关键字段时不更新业务状态。
5. 客服事件不被误判为普通 IM。

### P1-GW-003：建立 Gateway dispatcher

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway |
| 目标 | 建立 typed event 到 handler 的分发机制。 |
| 文件范围 | `src/renderer/data/gateway/gateway-dispatcher.ts`、`tests/unit/gateway-dispatcher.spec.ts` |
| 风险 | P1 |
| 验收 | L2 |
| 状态 | 已完成 |

验收要点：

1. `im.message.received` 调用对应 handler。
2. `im.read.received` 调用对应 handler。
3. `ignored` 和 `invalid` 不进入业务 handler。
4. handler 异常被捕获，不影响 Gateway 连接。

### P1-GW-004：抽 IM Gateway cache adapter

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway / IM |
| 目标 | 封装普通 IM 相关 query/cache 更新。 |
| 文件范围 | `src/renderer/data/gateway/im-gateway-cache.ts`、`tests/unit/im-gateway-cache.spec.ts` |
| 风险 | P0 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. 封装会话列表更新。
2. 封装消息列表更新。
3. 封装未读和 preview 更新。
4. 封装 read event 对消息列表和 read model 的影响。
5. 不解析 raw Gateway payload。

### P1-GW-005：抽 IM Gateway handler

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway / IM |
| 目标 | 处理 `im.message.received` 和 `im.read.received`。 |
| 文件范围 | `src/renderer/data/gateway/im-gateway-handler.ts`、`tests/unit/im-gateway-handler.spec.ts` |
| 风险 | P0 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. 当前会话收到消息后消息列表更新。
2. 非当前会话收到消息后未读更新。
3. 自己发送的 server echo 不错误增加未读。
4. `msg.read` 更新 read model。
5. 无效事件不污染 cache。

### P1-GW-006：接入 `GatewayBridge`

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway |
| 目标 | 让第一阶段事件走新 adapter/dispatcher/handler，其他事件保持旧逻辑。 |
| 文件范围 | `src/renderer/components/GatewayBridge.tsx` |
| 风险 | P0 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. SignalR 连接生命周期不改变。
2. 普通 IM 收消息和 `msg.read` 走新入口。
3. 新入口 handled 后不再走旧 IM 分支。
4. 客服、好友、force logout、presence 事件保持旧逻辑。
5. 回滚点集中在 `GatewayBridge` 接入处。

关键确认：

如果接入时需要改变 query key、read model 规则、store 字段，需要先确认。

### P1-GW-007：保留开发测试入口或定义替代入口

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Gateway / 测试 |
| 目标 | 确保 `window.__lppTestPushImMessage` 或替代测试入口仍能用于 smoke 验证。 |
| 文件范围 | `src/renderer/components/GatewayBridge.tsx`、必要测试工具 |
| 风险 | P2 |
| 验收 | L2 |
| 状态 | 已完成 |

验收要点：

1. 开发环境仍可模拟普通 IM 收消息。
2. 模拟入口走新 adapter/handler 或明确记录不走的原因。
3. 不暴露到生产环境。

### P1-INF-001：明确 query/cache 规则

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Infrastructure |
| 目标 | 固化第一阶段普通 IM query/cache 更新规则。 |
| 文件范围 | `src/renderer/data/query-keys.ts`、`src/renderer/data/gateway/im-gateway-cache.ts`、文档 |
| 风险 | P1 |
| 验收 | L2 |
| 状态 | 已完成 |

验收要点：

1. 会话列表 query key 有统一引用。
2. 消息列表 query key 更新逻辑集中。
3. invalidate 和 setQueryData 使用边界清晰。
4. 不在页面组件新增 cache merge。

### P1-INF-002：定义错误模型和诊断输出最小规范

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Infrastructure |
| 目标 | 为 adapter/dispatcher/handler 的失败情况提供可观察结果。 |
| 文件范围 | `src/renderer/data/gateway/gateway-diagnostics.ts` |
| 风险 | P2 |
| 验收 | L2 |
| 状态 | 已完成 |

验收要点：

1. adapter invalid 有 reason。
2. dispatcher handler error 有 event kind 和 error reason。
3. 默认不向用户弹错误。
4. 开发环境可 console warn，生产环境不刷屏。

### P1-OBS-001：建立第一阶段诊断日志最小闭环

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Observability / Gateway |
| 目标 | 让普通 IM Gateway 试点的关键事件具备可检索、可关联、可脱敏的本地诊断证据。 |
| 文件范围 | `src/renderer/data/gateway/gateway-diagnostics.ts`、必要日志工具、验收记录 |
| 风险 | P1 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. `im.message.received`、`im.read.received`、`invalid`、`handler failed` 有结构化诊断输出。
2. 每条诊断记录包含 `traceId`、`module`、`event`、`phase`、`result`、`reason/context`。
3. 敏感字段脱敏，raw payload 不完整落日志。
4. Codex 能通过本地日志或开发诊断导出定位一次事件链路。
5. 生产环境默认不刷屏，后续由 P8-EL-006 扩展为完整诊断包。

当前进度：

1. 已实现结构化诊断 record：`traceId/module/taskId/event/phase/result/timestamp/reason/context/error`。
2. 已为 adapter 事件生成 `traceId`，并在普通 IM Gateway handler 输出 handled/invalid/ignored/handler failed 诊断。
3. 已补 `tests/unit/gateway-diagnostics.spec.ts` 覆盖 traceId、handled、invalid、handler error、敏感字段脱敏和 console 输出。
4. 已完成快速局部验证：`vitest run tests/unit/gateway-diagnostics.spec.ts` 通过，`tsc --noEmit --skipLibCheck` 通过。

### P1-INF-003：建立技术栈评估记录

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Infrastructure |
| 目标 | 对当前 PC 核心技术栈形成初始合理性评估，并定义后续新增依赖确认流程。 |
| 文件范围 | `docs/refactor/*` |
| 风险 | P2 |
| 验收 | L1 |
| 状态 | 已完成 |

验收要点：

1. Electron、React、TypeScript、Vite、React Query、Zustand、SignalR 都有初始判断。
2. 不合理技术或新增依赖有确认模板。
3. 后续任务能引用该规则。

### P1-SHARED-001：建立公共能力登记规则

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Shared |
| 目标 | 建立公共能力识别和登记规则，避免头像、空态、错误态等能力散落实现。 |
| 文件范围 | `docs/refactor/*` |
| 风险 | P2 |
| 验收 | L1 |
| 状态 | 已完成 |

验收要点：

1. 明确公共能力分类。
2. 明确重复实现达到几次必须抽象。
3. 明确公共能力任务编号规则。
4. 头像展示被列为重点治理样例。

### P1-ST-001：记录 store 拆分边界

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Store |
| 目标 | 记录 `store.ts` 后续拆分方向，不在第一阶段大拆。 |
| 文件范围 | 文档、必要注释 |
| 风险 | P2 |
| 验收 | L1 |
| 状态 | 已完成 |

验收要点：

1. auth、ui、settings、imRead、csStatus、reminders 的目标归属明确。
2. 第一阶段 Gateway 新模块不新增 store 职责。
3. 后续拆分任务进入 P2。

### P1-TEST-001：建立第一阶段测试闭环

| 字段 | 内容 |
| --- | --- |
| 阶段 | P1 |
| 模块 | Testing |
| 目标 | 为 Gateway 试点建立类型检查、单测、手工验证闭环。 |
| 文件范围 | `tests/unit/*gateway*.spec.ts`、验收记录 |
| 风险 | P1 |
| 验收 | L3 |
| 状态 | 已完成 |

验收要点：

1. `npm run typecheck` 通过。
2. `npm run test:unit` 通过。
3. 手工验证普通 IM 收消息。
4. 手工验证非当前会话未读更新。
5. 记录未执行项和原因。

---

## 4. 第二阶段任务：Store 边界治理

第二阶段拆成 Codex 可单独执行的小任务。每个迁移任务必须先盘点读写点，再建新 owner，再逐步替换调用方。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P2-ST-001A | Store/Auth | 盘点 `authSession`、token、登录态 action 的所有读写点，形成迁移清单。 | P0 | L1 | 已完成 |
| P2-ST-001B | Store/Auth | 建立 `auth` store/service 壳，定义状态 owner、持久化 key、对外 selectors/actions。 | P0 | L2 | 已完成 |
| P2-ST-001C | Store/Auth | 迁移 `readStoredAuth`、`setAuthSession`、`clearAuthSession` 到 auth owner。 | P0 | L3 | 已完成 |
| P2-ST-001D | Store/Auth | 替换登录、Gateway、API 初始化等调用方使用 auth selectors/actions。 | P0 | L3 | 已完成 |
| P2-ST-001E | Store/Auth | 删除或兼容旧 workspace auth 入口，补迁移说明和回滚点。 | P0 | L3 | 已完成 |
| P2-ST-001F | Store/Auth | 补 auth store 测试与诊断日志，验证登录态恢复、清理、过期场景。 | P0 | L3 | 已完成 |
| P2-ST-002A | Store/Settings | 盘点 PC settings、窗口偏好、通知偏好的读写点和持久化位置。 | P1 | L1 | 已完成 |
| P2-ST-002B | Store/Settings | 建立 settings store/service 壳，明确默认值、持久化、迁移策略。 | P1 | L2 | 已完成 |
| P2-ST-002C | Store/Settings | 迁移 `pcSettings`、`updatePcSetting`、`persistPcSettings` 调用方。 | P1 | L2 | 已完成 |
| P2-ST-002D | Store/Settings | 补 settings 测试和设置变更诊断日志。 | P1 | L2 | 已完成 |
| P2-ST-003A | Store/UI | 盘点 layout、active panel、modal、selection 等纯 UI 状态。 | P1 | L1 | 已完成 |
| P2-ST-003B | Store/UI | 建立 workspace-ui store，限定为非业务、非服务端快照状态。 | P1 | L2 | 已完成 |
| P2-ST-003C | Store/UI | 迁移页面布局和临时交互状态，避免污染业务 store。 | P1 | L2 | 已完成 |
| P2-ST-004A | Store/IM Read | 盘点 unread、readSeq、localRead、peerRead、lastReadAt 的读写点。 | P0 | L1 | 已完成 |
| P2-ST-004B | Store/IM Read | 建立 im-read store 或 read repository 壳，定义不变量和持久化边界。 | P0 | L2 | 已完成 |
| P2-ST-004C | Store/IM Read | 迁移 Gateway `msg.read`、消息列表、会话列表对 read model 的更新。 | P0 | L3 | 已完成 |
| P2-ST-004D | Store/IM Read | 补 read model 测试和诊断日志，覆盖当前会话/非当前会话/自己消息。 | P0 | L3 | 已完成 |
| P2-ST-005A | Store/Reminder | 盘点 realtime reminders、toast、桌面提醒、未读提示的触发点。 | P1 | L1 | 已完成 |
| P2-ST-005B | Store/Reminder | 建立 notification/reminder store/service，明确去重、过期、聚合规则。 | P1 | L2 | 已完成 |
| P2-ST-005C | Store/Reminder | 迁移提醒调用方并补提醒诊断日志。 | P1 | L2 | 已完成 |

---

## 5. 第三阶段任务：API 合同与数据模型治理

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P3-API-001A | API Contract | 建立 DTO -> Domain -> ViewModel 映射模板和命名规则。 | P1 | L1 | 已完成 |
| P3-API-001B | API Contract | 建立统一 contract result 类型，表达 ok/degraded/invalid/failed。 | P1 | L2 | 已完成 |
| P3-API-001C | API Contract | 建立 API/contract 诊断日志格式，包含接口名、字段缺失、降级原因。 | P1 | L2 | 已完成 |
| P3-API-002A | IM Conversation | 盘点普通 IM 会话列表 DTO 字段、缺省值、兼容字段，形成字段矩阵。 | P1 | L1 | 已完成 |
| P3-API-002B | IM Conversation | 实现会话 DTO normalizer，页面只消费 domain/view model。 | P1 | L2 | 已完成 |
| P3-API-002C | IM Conversation | 补会话 normalizer fixtures/tests，覆盖字段缺失和兼容字段。 | P1 | L2 | 已完成 |
| P3-API-003A | IM Message | 盘点普通 IM 消息列表 DTO 字段、消息类型、发送方、时间、状态。 | P1 | L1 | 已完成 |
| P3-API-003B | IM Message | 实现消息 DTO normalizer，统一消息 ID、conversationId、sender、content。 | P1 | L2 | 已完成 |
| P3-API-003C | IM Message | 补消息 normalizer fixtures/tests，覆盖文本、图片、文件、未知类型。 | P1 | L2 | 已完成 |
| P3-API-004A | CS Contract | 盘点客服线程列表/详情/客户资料 DTO 字段和终态规则。 | P1 | L1 | 已完成 |
| P3-API-004B | CS Contract | 实现客服 thread/customer normalizer，隔离页面对 raw DTO 的依赖。 | P1 | L2 | 已完成 |
| P3-API-004C | CS Contract | 补客服 normalizer fixtures/tests，覆盖 queued/serving/ai/closed/rated。 | P1 | L2 | 已完成 |
| P3-API-005A | API Error | 盘点现有 API error 处理、toast、重试、跳登录、静默失败路径。 | P1 | L1 | 已完成 |
| P3-API-005B | API Error | 建立统一 API error model 和用户可见错误映射。 | P1 | L3 | 已完成 |
| P3-API-005C | API Error | 补错误诊断日志，确保 code、requestId、duration、降级动作可查。 | P1 | L3 | 已完成 |
| P3-API-006A | Gateway Contract | 为 Gateway payload 建立字段合同 fixtures，区分普通 IM 与客服事件。 | P0 | L2 | 已完成 |
| P3-API-006B | Gateway Contract | 建立 Gateway 合同测试，覆盖 invalid/ignored/degraded reason。 | P0 | L3 | 已完成 |
| P3-API-006C | Gateway Contract | 将 Gateway 合同诊断输出接入统一日志规范。 | P0 | L3 | 已完成 |

---

## 6. 第四阶段任务：统一消息底座

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P4-MSG-001A | Message Domain | 盘点普通 IM 与客服现有 message 类型、字段、状态、渲染依赖。 | P0 | L1 | 已完成 |
| P4-MSG-001B | Message Domain | 定义共享 message entity 和 IM/客服差异扩展点。 | P0 | L2 | 已完成 |
| P4-MSG-001C | Message Domain | 将普通 IM normalizer 输出迁移到统一 message entity。 | P0 | L3 | 已完成 |
| P4-MSG-001D | Message Domain | 将客服 normalizer 输出迁移到统一 message entity。 | P0 | L3 | 已完成 |
| P4-MSG-002A | Conversation Domain | 盘点 conversation/thread 公共字段和差异字段。 | P0 | L1 | 已完成 |
| P4-MSG-002B | Conversation Domain | 定义 conversation entity、thread entity、共享 view model 边界。 | P0 | L2 | 已完成 |
| P4-MSG-002C | Conversation Domain | 替换普通 IM 会话列表第一批消费点。 | P0 | L3 | 已完成 |
| P4-MSG-002D | Conversation Domain | 替换客服线程列表第一批消费点。 | P0 | L3 | 已完成 |
| P4-MSG-003A | Read Model | 编写 unread/readSeq/localRead/peerRead 不变量表和冲突处理规则。 | P0 | L1 | 已完成 |
| P4-MSG-003B | Read Model | 将 read model 规则沉淀到 repository/service，页面不直接改规则。 | P0 | L3 | 已完成 |
| P4-MSG-003C | Read Model | 补 read model 单测和诊断日志，覆盖乱序、重复、离线恢复。 | P0 | L3 | 已完成 |
| P4-MSG-004A | Media Model | 盘点图片、视频、文件、截图、联系人卡片的消息表达。 | P1 | L1 | 已完成 |
| P4-MSG-004B | Media Model | 定义 media message entity 和 preview adapter。 | P1 | L2 | 已完成 |
| P4-MSG-004C | Media Model | 替换首批媒体消息渲染消费点并补降级态。 | P1 | L3 | 已完成 |
| P4-MSG-005A | Send Queue | 盘点 local echo、sending、sent、failed、retry、撤回的现有路径。 | P0 | L1 | 已完成 |
| P4-MSG-005B | Send Queue | 定义发送状态机类型和状态迁移表。 | P0 | L2 | 已完成 |
| P4-MSG-005C | Send Queue | 接入普通 IM 发送链路，记录发送诊断日志。 | P0 | L3 | 已完成 |
| P4-MSG-005D | Send Queue | 接入客服发送链路，记录发送诊断日志。 | P0 | L3 | 已完成 |
| P4-MSG-006A | Message ViewModel | 定义消息展示 view model，覆盖 sender、bubble、content、status、actions。 | P1 | L2 | 已完成 |
| P4-MSG-006B | Message ViewModel | 替换普通 IM 消息列表首批消费点。 | P1 | L2 | 已完成 |
| P4-MSG-006C | Message ViewModel | 替换客服消息列表首批消费点。 | P1 | L2 | 已完成 |

---

## 7. 第五阶段任务：普通 IM 页面瘦身

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P5-IM-001A | MessageCenter | 绘制 `MessageCenter` 职责图，标出数据、命令、UI、样式、弹窗边界。 | P1 | L1 | 已完成 |
| P5-IM-001B | MessageCenter | 建立 `useMessageCenterViewModel` 壳，只搬装配逻辑，不改行为。 | P1 | L2 | 已完成 |
| P5-IM-001C | MessageCenter | 迁移 selected conversation、query loading、empty/error 派生状态。 | P1 | L3 | 已完成 |
| P5-IM-001D | MessageCenter | 迁移 send/read/retry/delete 等命令入口到 view model 或 use case。 | P1 | L3 | 已完成 |
| P5-IM-001E | MessageCenter | 补页面级诊断日志，记录选中会话、发送命令、异常降级。 | P1 | L3 | 已完成 |
| P5-IM-002A | Conversation List | 抽会话列表 container，保留 presentation 组件纯展示。 | P1 | L2 | 已完成 |
| P5-IM-002B | Conversation List | 抽筛选、排序、搜索、置顶、空态派生逻辑。 | P1 | L2 | 已完成 |
| P5-IM-002C | Conversation List | 补会话列表测试，覆盖未读、preview、置顶、搜索组合。 | P1 | L2 | 已完成 |
| P5-IM-003A | Message List | 抽消息列表 container，隔离数据加载、滚动定位、历史分页。 | P1 | L3 | 已完成 |
| P5-IM-003B | Message List | 抽滚动到底、保持位置、加载历史、定位到消息规则。 | P1 | L3 | 已完成 |
| P5-IM-003C | Message List | 评估长列表方案；如需虚拟列表，先做技术选型确认。 | P1 | L2 | 已完成 |
| P5-IM-004A | Composer | 盘点 composer 输入、上传、快捷键、草稿、发送的依赖。 | P1 | L1 | 已完成 |
| P5-IM-004B | Composer | 收敛发送用例入口，composer 不直接理解 API/Gateway/cache 细节。 | P1 | L3 | 已完成 |
| P5-IM-004C | Composer | 补发送链路测试和诊断日志，覆盖空消息、上传中、失败重试。 | P1 | L3 | 已完成 |
| P5-IM-005A | Context Menus | 盘点复制、删除、转发、撤回、引用等右键动作入口。 | P2 | L1 | 已完成 |
| P5-IM-005B | Context Menus | 建立 action map 和权限判断，不在 JSX 中散落业务判断。 | P2 | L2 | 已完成 |
| P5-IM-006A | Styles | 盘点 IM 相关样式归属，标记可迁出 `app.css` 的 feature 样式。 | P2 | L1 | 已完成 |
| P5-IM-006B | Styles | 将首批消息模块样式迁到 feature 目录，保证视觉无回归。 | P2 | L2 | 已完成 |

---

## 8. 第六阶段任务：在线客服核心重构

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P6-CS-001A | CS Gateway | 盘点客服 Gateway 事件名、payload、触发场景、现有处理分支。 | P0 | L1 | 已完成 |
| P6-CS-001B | CS Gateway | 定义客服 typed event adapter，明确 invalid/ignored/degraded reason。 | P0 | L2 | 已完成 |
| P6-CS-001C | CS Gateway | 建立客服 Gateway handler，先接消息新增/线程状态变更最小闭环。 | P0 | L3 | 已完成 |
| P6-CS-001D | CS Gateway | 补客服 Gateway 合同测试和诊断日志。 | P0 | L3 | 已完成 |
| P6-CS-002A | CS State | 编写客服线程状态不变量表：queued/serving/ai/closed/rated/readonly。 | P0 | L1 | 已完成 |
| P6-CS-002B | CS State | 实现客服线程状态机类型和状态迁移函数。 | P0 | L2 | 已完成 |
| P6-CS-002C | CS State | 替换首批客服状态判断调用方，保留回滚点。 | P0 | L3 | 已完成 |
| P6-CS-002D | CS State | 补状态机测试和状态迁移诊断日志。 | P0 | L3 | 已完成 |
| P6-CS-003A | CS Actions | 盘点接入、转接、关闭、评价、只读、AI 接管动作入口。 | P0 | L1 | 已完成 |
| P6-CS-003B | CS Actions | 建立客服 action permission matrix，输出可执行/禁用/隐藏原因。 | P0 | L2 | 已完成 |
| P6-CS-003C | CS Actions | 建立客服 action service，统一执行、错误、toast、日志。 | P0 | L3 | 已完成 |
| P6-CS-004A | CS Cache | 盘点客服线程列表、详情、客户资料、消息列表 query/cache key。 | P1 | L1 | 已完成 |
| P6-CS-004B | CS Cache | 封装客服 cache adapter，不在页面组件直接 setQueryData。 | P1 | L3 | 已完成 |
| P6-CS-004C | CS Cache | 补客服 cache 测试和 cache 更新诊断日志。 | P1 | L3 | 已完成 |
| P6-CS-005A | CS Workspace | 绘制 `ChatWorkspace.tsx` 职责图，标出数据、命令、UI、弹窗边界。 | P1 | L1 | 已完成 |
| P6-CS-005B | CS Workspace | 建立客服 workspace view model 壳，只搬装配逻辑，不改行为。 | P1 | L2 | 已完成 |
| P6-CS-005C | CS Workspace | 迁移线程选择、详情加载、消息加载、动作禁用派生状态。 | P1 | L3 | 已完成 |
| P6-CS-005D | CS Workspace | 迁移客服接入/关闭/转接/评价命令入口。 | P1 | L3 | 已完成 |
| P6-CS-006A | CS Empty/Error | 盘点缺接口、无会话、终态、权限不足、网络失败展示。 | P1 | L1 | 已完成 |
| P6-CS-006B | CS Empty/Error | 统一客服空态/错误态/终态组件输入，不散落文案和判断。 | P1 | L2 | 已完成 |

---

## 9. 第七阶段任务：公共能力与 UI 体系收敛

第七阶段进入执行前必须基于 P1-P6 的重复实现记录再次拆细。当前任务只作为能力域和验收方向，不允许直接按粗粒度整体执行。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P7-SHARED-001A | Avatar/Identity | 盘点 `PcAvatar`、群头像、消息头像、客服头像、联系人头像重复规则。 | P1 | L1 | 已完成 |
| P7-SHARED-001B | Avatar/Identity | 设计最小 avatar identity model，只复用已有 `PcAvatar`，不新增 UI 库。 | P1 | L2 | 已完成 |
| P7-SHARED-001C | Avatar/Identity | 迁移首批低风险调用点：客服头部、客服会话列表，并登记消息气泡 fallback。 | P1 | L3 | 已完成 |
| P7-SHARED-001D | Avatar/Identity | 补 avatar identity 单测和视觉风险记录。 | P1 | L2 | 已完成 |
| P7-SHARED-002A | Empty/Error | 盘点各页面 `panel-state`、空态、错误态、加载态重复文案。 | P2 | L1 | 已完成 |
| P7-SHARED-002B | Empty/Error | 建立最小 `PanelState` 展示组件输入协议，先不改全站样式。 | P2 | L2 | 已完成 |
| P7-SHARED-002C | Empty/Error | 迁移 IM/客服首批状态渲染，保留页面级文案模型。 | P2 | L3 | 已完成 |
| P7-SHARED-003A | Badge/Time | 盘点未读 badge、状态 badge、时间格式入口。 | P2 | L1 | 已完成 |
| P7-SHARED-003B | Badge/Time | 收敛 badge/time view helper，避免页面重复 `new Date` 和 unread 判断。 | P2 | L2 | 已完成 |
| P7-SHARED-004A | Media Preview | 盘点图片、视频、文件、联系人卡片预览与打开动作入口。 | P1 | L1 | 已完成 |
| P7-SHARED-004B | Media Preview | 收敛媒体 action payload/view model，不碰 Electron IPC 安全边界。 | P1 | L3 | 已完成 |
| P7-SHARED-005A | Notification | 盘点 toast、实时提醒、桌面通知触发点和去重规则。 | P1 | L1 | 已完成 |
| P7-SHARED-005B | Notification | 收敛通知触发 adapter，保留现有 `reminder-service` 设置策略。 | P1 | L3 | 已完成 |
| P7-UI-001A | Styles | 盘点 `app.css` 中仍可归属 feature/shared 的样式块。 | P2 | L1 | 已完成 |
| P7-UI-001B | Styles | 迁移首批低风险 shared/message/customer-service 样式文件。 | P2 | L2 | 已完成 |

---

## 10. 第八阶段任务：Electron 安全、性能与工程门禁

第八阶段进入执行前必须拆成“盘点 -> 方案确认 -> 最小迁移 -> 验证 -> 回滚”的小任务。尤其 token、IPC、preload、诊断包涉及安全边界，不能直接粗粒度执行。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P8-EL-001A | Preload | 盘点 `desktopApi` 暴露方法、IPC channel、payload 与调用点。 | P0 | L1 | 已完成 |
| P8-EL-001B | Preload | 建立 `desktopApi` runtime validation schema，不新增依赖。 | P0 | L2 | 已完成 |
| P8-EL-001C | Preload | 迁移 preload 暴露层，进入 IPC 前统一校验入参。 | P0 | L3 | 已完成 |
| P8-EL-001D | Preload | 补 desktopApi validation 单测和 Electron typecheck 验证记录。 | P0 | L3 | 已完成 |
| P8-EL-002A | Token | 盘点登录、企业切换、env 配置、localStorage 中的 token 来源和风险。 | P0 | L1 | 已完成 |
| P8-EL-002B | Token | 制定桌面端 secure storage 策略，明确浏览器开发环境回退。 | P0 | L2 | 已完成 |
| P8-EL-002C | Token | 迁移桌面端 auth session 持久化到 Electron `safeStorage`。 | P0 | L4 | 已完成 |
| P8-EL-002D | Token | 补 secure auth session 单测、validation 测试和 typecheck 记录。 | P0 | L4 | 已完成 |
| P8-EL-003A | IPC | 盘点固定 `desktop:*` channel 与截图动态 channel。 | P0 | L1 | 已完成 |
| P8-EL-003B | IPC | 建立 main 进程 desktop IPC channel 白名单注册。 | P0 | L3 | 已完成 |
| P8-EL-003C | IPC | main handler 执行前复用 desktopApi payload validation。 | P0 | L4 | 已完成 |
| P8-EL-004A | Screenshot | 盘点截图选择窗口 BrowserWindow 配置、动态 channel 和权限风险。 | P0 | L1 | 已完成 |
| P8-EL-004B | Screenshot | 使用独立 preload 暴露最小截图 API，关闭截图窗口 nodeIntegration。 | P0 | L4 | 已完成 |
| P8-EL-004C | Screenshot | 补截图窗口隔离 typecheck/diff 验证记录。 | P0 | L3 | 已完成 |
| P8-EL-005A | File | 盘点文件打开、下载、复制、另存、显示位置入口。 | P1 | L1 | 已完成 |
| P8-EL-005B | File | 限制本地路径/`file:` URL 只能访问应用 userData 缓存目录。 | P1 | L3 | 已完成 |
| P8-EL-005C | File | 补文件动作策略 typecheck/diff 验证记录。 | P1 | L2 | 已完成 |
| P8-EL-006A | Diagnostics | 盘点现有 `window.__lpp*Diagnostics` 缓冲、设置页导出入口和敏感信息风险。 | P1 | L1 | 已完成 |
| P8-EL-006B | Diagnostics | 建立 renderer 统一诊断包收集器，按模块裁剪并脱敏导出。 | P1 | L3 | 已完成 |
| P8-EL-006C | Diagnostics | 扩展 `DiagnosticsPayload` validation，补诊断包单测和 typecheck 验证记录。 | P1 | L3 | 已完成 |
| P8-PERF-001A | Startup | 在核心技术方案中固化启动耗时和首屏可交互预算。 | P1 | L2 | 已完成 |
| P8-PERF-001B | Startup | 建立 renderer entry/first interactive 轻量诊断记录，并接入诊断包导出。 | P1 | L3 | 已完成 |
| P8-PERF-001C | Startup | 补 startup performance 单测、诊断包联动和 typecheck 验证记录。 | P1 | L3 | 已完成 |
| P8-PERF-002A | Bundle | 分析当前 renderer 构建产物，记录入口 chunk、低频依赖和共享 chunk 体积。 | P2 | L1 | 已完成 |
| P8-PERF-002B | Bundle | 将 GatewayBridge 登录后动态加载，并配置 React/状态/SignalR/Lexical/qrcode vendor chunk。 | P2 | L3 | 已完成 |
| P8-PERF-002C | Bundle | 执行 production build，记录优化前后 bundle 数据和验证结果。 | P2 | L3 | 已完成 |
| P8-PERF-003A | List | 盘点普通 IM 消息区全量渲染风险和搜索/未读定位约束。 | P1 | L1 | 已完成 |
| P8-PERF-003B | List | 建立消息列表尾部分段渲染模型，默认只渲染最近 240 条并可逐步展开更早消息。 | P1 | L3 | 已完成 |
| P8-PERF-003C | List | 将分段渲染接入 MessageListPanel，保留搜索、历史筛选、未读跳转全量定位。 | P1 | L4 | 已完成 |
| P8-PERF-003D | List | 补窗口模型单测、消息中心诊断和 typecheck 验证记录。 | P1 | L3 | 已完成 |
| P8-PERF-004A | Media | 盘点图片预取、视频 poster、object URL 和视频 preload 策略。 | P1 | L1 | 已完成 |
| P8-PERF-004B | Media | 建立视频预览 preload 策略：未播放只加载 metadata，播放后才允许 auto。 | P1 | L3 | 已完成 |
| P8-PERF-004C | Media | 为视频 poster 内存缓存设置上限，避免长会话累计无界增长。 | P1 | L3 | 已完成 |
| P8-PERF-004D | Media | 补媒体性能策略单测、image/video poster 回归和 typecheck 验证记录。 | P1 | L3 | 已完成 |
| P8-ARCH-001A | Architecture Boundary | 盘点 renderer/main/preload/shared 可机械校验的依赖边界。 | P1 | L1 | 已完成 |
| P8-ARCH-001B | Architecture Boundary | 建立结构测试，禁止 renderer 依赖 main/preload/Node runtime，禁止 shared 反向依赖运行层。 | P1 | L3 | 已完成 |
| P8-ARCH-001C | Architecture Boundary | 校验 preload 只暴露命名最小 API，并补结构测试验证记录。 | P1 | L3 | 已完成 |
| P8-ENG-001A | Lint | 评估当前是否需要新增 ESLint/Prettier 依赖，先采用无新增依赖的等价 quick check。 | P2 | L1 | 已完成 |
| P8-ENG-001B | Lint | 增加 `lint:boundaries` 与 `check:quick` 脚本，覆盖类型、Electron 类型、架构边界和 IPC validation。 | P2 | L2 | 已完成 |
| P8-ENG-001C | Lint | 执行 `npm run check:quick` 并记录验证结果。 | P2 | L2 | 已完成 |
| P8-ENG-002A | Coverage | 制定核心 domain/application 覆盖率目标，明确暂不新增 coverage 依赖。 | P2 | L1 | 已完成 |
| P8-ENG-002B | Coverage | 增加 `npm run test:core`，聚合核心链路单测。 | P2 | L2 | 已完成 |
| P8-ENG-002C | Coverage | 执行 `npm run test:core` 并记录验证结果。 | P2 | L2 | 已完成 |
| P8-ENG-003A | CI | 盘点 PC client 在仓库中的 CI 路径和本地门禁脚本。 | P1 | L1 | 已完成 |
| P8-ENG-003B | CI | 新增 GitHub Actions：quick、core tests、production build、browser smoke。 | P1 | L3 | 已完成 |
| P8-ENG-003C | CI | 调整 Playwright config 支持 CI Chromium，验证 workflow YAML、browser test list 和 quick check。 | P1 | L3 | 已完成 |
| P8-ENG-004A | ADR | 为 Electron 安全边界与 secure session 补 ADR。 | P3 | L1 | 已完成 |
| P8-ENG-004B | ADR | 为诊断包导出方案补 ADR。 | P3 | L1 | 已完成 |
| P8-ENG-004C | ADR | 为性能与工程门禁策略补 ADR。 | P3 | L1 | 已完成 |
| P8-ENG-005A | Docs CI | 建立无新增依赖的重构文档校验脚本。 | P2 | L2 | 已完成 |
| P8-ENG-005B | Docs CI | 校验 README 链接、任务状态、已完成任务验证记录和 ADR 编号/章节。 | P2 | L2 | 已完成 |
| P8-ENG-005C | Docs CI | 将 `docs:check` 接入 `check:quick` 并记录验证结果。 | P2 | L2 | 已完成 |
| P8-ENG-006A | Doc Gardening | 建立文档巡检机制文档，明确频率、脚本和修复原则。 | P2 | L1 | 已完成 |
| P8-ENG-006B | Doc Gardening | 新增 `docs:garden` 报告脚本，输出待处理、TODO/FIXME、历史参考等可能过期线索。 | P2 | L2 | 已完成 |
| P8-ENG-006C | Doc Gardening | 执行 `npm run docs:garden` 并记录报告结果。 | P2 | L2 | 已完成 |
| P8-ENG-007A | Code Shape Lint | 建立文件大小、结构化 console、desktop boundary validator 的轻量检查脚本。 | P2 | L2 | 已完成 |
| P8-ENG-007B | Code Shape Lint | 对历史超大文件建立 allowlist warning，不阻断当前 quick check。 | P2 | L2 | 已完成 |
| P8-ENG-007C | Code Shape Lint | 将 `lint:shape` 接入 `check:quick` 并记录验证结果。 | P2 | L2 | 已完成 |

---

## 11. 第九阶段任务：成熟度提升与历史大文件收敛

第九阶段从 `PC端质量评分表.md` 的“主要差距”派生，目标是把已经建立的架构地基继续推进到 5 分成熟度。优先处理仍在 `lint:shape` allowlist 中的核心大文件和未机械约束的架构边界。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P9-GW-001A | Gateway | 抽 Gateway 事件注册表，统一 GatewayBridge、IM adapter、CS adapter 的事件名和分类判断。 | P1 | L2 | 已完成 |
| P9-GW-001B | Gateway | 补 Gateway event registry 单测，保证订阅事件唯一、IM/CS/Auth 分类稳定。 | P1 | L2 | 已完成 |
| P9-GW-002A | Gateway | 抽 Gateway query invalidation helper，收敛普通 IM 与客服事件后的 query 刷新规则。 | P1 | L2 | 已完成 |
| P9-GW-002B | Gateway | 补 Gateway query invalidation 单测，锁定会话/线程局部刷新与消息 query 检测行为。 | P1 | L2 | 已完成 |
| P9-GW-003A | Gateway | 抽 Gateway payload utils，收敛 raw payload 字段提取、消息归一化、自发消息判断。 | P1 | L3 | 已完成 |
| P9-GW-003B | Gateway | 将 IM core 测试入口迁移到 Gateway 数据层，避免单测依赖 React bridge。 | P1 | L3 | 已完成 |
| P9-GW-003C | Code Shape Lint | `GatewayBridge.tsx` 降到 900 行以内后移出大文件 allowlist，防止职责回流。 | P1 | L2 | 已完成 |
| P9-IM-001A | Message/IM | 抽群头像模型，收敛群头像优先级、成员可见性、九宫格头像 cell 生成逻辑。 | P1 | L2 | 已完成 |
| P9-IM-001B | Message/IM | 补群头像模型单测，覆盖正式头像优先、成员去重、可见性开关、占位名清洗。 | P1 | L2 | 已完成 |
| P9-IM-002A | Message/Media | 抽消息媒体桌面动作 runtime，收敛复制、另存、打开、编辑、文件夹展示等平台动作入口。 | P1 | L2 | 已完成 |
| P9-IM-002B | Message/Media | 用现有媒体与菜单模型测试回归媒体动作调用方类型和上下文。 | P1 | L2 | 已完成 |
| P9-IM-003A | Message/IM | 抽消息展示模型，收敛自发消息识别、发送者展示名、头像资料、事件文本、首条未读定位。 | P1 | L3 | 已完成 |
| P9-IM-003B | Message/IM | 补消息展示模型单测，覆盖自发识别、嵌套文本提取、群成员事件、头像资料模型。 | P1 | L3 | 已完成 |
| P9-IM-004A | Message/IM | 抽 message cache mutation model，收敛本地发送、媒体预览、转发、撤回、删除、收藏和已读缓存更新。 | P1 | L3 | 已完成 |
| P9-IM-004B | Message/IM | 补 message cache mutation 单测，覆盖本地 outgoing upsert/replace/fail 和媒体 preview key。 | P1 | L3 | 已完成 |
| P9-IM-005A | Message/Composer | 抽 message composer model，收敛回复体、群 mention、动作结果文本、上传媒体归一化和视频 poster 超时。 | P1 | L3 | 已完成 |
| P9-IM-005B | Message/Composer | 补 composer model 单测，覆盖 reply、mention、action result、media normalize、poster timeout。 | P1 | L3 | 已完成 |
| P9-IM-006A | Message/UI | 抽会话资料 standalone view 与头像资料 popover，降低 `MessageCenter` presentation 体积。 | P1 | L2 | 已完成 |
| P9-IM-006B | Shared UI | 复用公共 `PanelState`，移除 `MessageCenter` 局部空态实现。 | P1 | L2 | 已完成 |
| P9-IM-007A | IM Read | 抽 IM read view model，收敛 sidebar 与 MessageCenter 重复的 read state 合并和变化判断。 | P1 | L3 | 已完成 |
| P9-IM-007B | IM Read | 补 IM read view model 单测，覆盖 legacy read 合并和 meaningful change 判断。 | P1 | L3 | 已完成 |
| P9-IM-008A | Message/UI | 抽 reply preview、多选操作条和聊天头部组件，继续降低 `MessageCenter` 主 JSX 体积。 | P1 | L2 | 已完成 |
| P9-IM-008B | Message/UI | 用 TS 与消息模型单测回归 header/chrome 抽离后的类型和基础行为。 | P1 | L2 | 已完成 |
| P9-IM-009A | Message/UI | 抽 `useWindowDismiss`，收敛菜单、加号菜单、头像 popover 的窗口关闭 effect。 | P1 | L2 | 已完成 |
| P9-IM-009B | Message/UI | 用 TS 与消息模型单测回归窗口关闭 hook 抽离后的调用类型。 | P1 | L2 | 已完成 |
| P9-IM-010A | Message/Composer | 抽 `MessageComposerSurface`，收敛 composer 工具栏和输入区 presentation 配置。 | P1 | L2 | 已完成 |
| P9-IM-010B | Message/Composer | 用 TS 与 composer/message center 模型单测回归 composer surface 抽离。 | P1 | L2 | 已完成 |
| P9-IM-011A | Message/UI | 抽 `MessageDialogsLayer`，收敛转发、新建会话、群聊、二维码弹窗装配。 | P1 | L2 | 已完成 |
| P9-IM-011B | Message/UI | 用 TS 与消息列表模型单测回归弹窗层抽离后的类型和调用边界。 | P1 | L2 | 已完成 |
| P9-IM-012A | Message/UI | 抽 `MessageProfileDock`，收敛右侧资料栏 resize 与资料面板装配。 | P1 | L2 | 已完成 |
| P9-IM-012B | Message/UI | 用 TS 与群头像模型单测回归资料栏 dock 抽离后的类型和头像输入。 | P1 | L2 | 已完成 |
| P9-IM-013A | Message/UI | 抽 `MessageOverlayLayer`，收敛消息菜单、会话菜单和头像资料浮层装配。 | P1 | L2 | 已完成 |
| P9-IM-013B | Message/UI | 用 TS 与菜单模型单测回归 overlay 抽离后的 action 类型和 state 构造。 | P1 | L2 | 已完成 |
| P9-IM-014A | Message/Media Send | 抽 `useMessageMediaSendController`，收敛媒体本地回显、上传、暂停/取消/重试、视频封面发送编排。 | P1 | L4 | 已完成 |
| P9-IM-014B | Message/Media Send | 用 TS、composer model、cache mutation、message center view model 单测回归媒体发送控制器抽离。 | P1 | L3 | 已完成 |
| P9-IM-015A | Message/Text Send | 抽 `useMessageTextSendController`，收敛文本本地回显、群 mention、发送成功替换和失败标记。 | P1 | L3 | 已完成 |
| P9-IM-015B | Message/Text Send | 用 TS、composer model、cache mutation、message center view model 单测回归文本发送控制器抽离。 | P1 | L3 | 已完成 |
| P9-IM-016A | Message/Menu Action | 抽 `useMessageMenuActionController`，收敛复制、媒体文件动作、引用、AI、翻译、收藏、撤回、删除、转发分发。 | P1 | L3 | 已完成 |
| P9-IM-016B | Message/Menu Action | 用 TS、菜单模型、消息展示模型、message center view model 单测回归菜单 action 抽离。 | P1 | L3 | 已完成 |
| P9-IM-017A | Message/Start Conversation | 抽 `useMessageStartConversationController`，收敛发起单聊、建群、生成二维码 mutation 编排。 | P1 | L2 | 已完成 |
| P9-IM-017B | Message/Start Conversation | 用 TS、会话列表模型、message center view model 单测回归启动会话控制器抽离。 | P1 | L2 | 已完成 |
| P9-IM-018A | Message/IM Read | 抽 `useImReadCommandExecutor`，收敛已读命令执行、会话快照同步、当前会话打开标已读、服务端同步和实时提醒清理。 | P1 | L3 | 已完成 |
| P9-IM-018B | Message/IM Read | 用 TS、IM read/view model/store、message center view model 单测回归 read command executor 抽离。 | P1 | L3 | 已完成 |
| P9-IM-019A | Message/Action Mutation | 抽 `useMessageActionMutations`，收敛撤回、删除、收藏、翻译、语音转文字、转发 mutation 和 cache 更新。 | P1 | L3 | 已完成 |
| P9-IM-019B | Message/Action Mutation | 用 TS、消息 cache/display/context menu、message center view model 单测回归动作 mutation 抽离。 | P1 | L3 | 已完成 |
| P9-IM-020A | Message/Unread Jump | 抽 `useMessageUnreadJumpController`，收敛会话自动选中、用户点击会话、未读跳转和第一条未读定位。 | P1 | L3 | 已完成 |
| P9-IM-020B | Message/Unread Jump | 用 TS、消息展示/会话列表/message center view model、IM read view model 单测回归未读跳转抽离。 | P1 | L3 | 已完成 |
| P9-IM-021A | Message/Menu Media | 抽 `useMessageMenuMediaStatus`，收敛消息菜单视频缓存状态探测和桌面 API payload 构造。 | P1 | L2 | 已完成 |
| P9-IM-021B | Message/Menu Media | 用 TS、菜单模型、media policy、message center view model 单测回归菜单媒体状态抽离。 | P1 | L2 | 已完成 |
| P9-IM-022A | Message/Page Effects | 抽 `useMessageCenterPageEffects`，收敛 composer 高度约束、预览 URL 清理、toast 自动消失、会话选择诊断和会话切换 UI reset。 | P1 | L3 | 已完成 |
| P9-IM-022B | Message/Page Effects | 用 TS、message center/display、architecture boundary 单测回归页面生命周期副作用抽离。 | P1 | L3 | 已完成 |
| P9-IM-023A | Message/Read Receipt | 抽 `useDirectReadReceiptSync`，收敛单聊 peer 已读回执同步、IM read state 更新和消息 cache 已读标记。 | P1 | L3 | 已完成 |
| P9-IM-023B | Message/Read Receipt | 用 TS、IM read store/view model、message display、message center view model 单测回归 direct read receipt 抽离。 | P1 | L3 | 已完成 |
| P9-IM-024A | Message/Interaction | 抽 `useMessageInteractionHandlers`，收敛消息/会话右键菜单、头像/名片浮层、滚动定位和批量删除交互。 | P1 | L3 | 已完成 |
| P9-IM-024B | Message/Interaction | 用 TS、菜单/展示/会话列表/message center view model 单测回归交互 handler 抽离。 | P1 | L3 | 已完成 |
| P9-IM-025A | Message/List Data | 抽 `useMessageListData`，收敛服务端消息、本地乐观消息、媒体预览、peer 已读、历史筛选和搜索过滤派生。 | P1 | L3 | 已完成 |
| P9-IM-025B | Message/List Data | 用 TS、消息 cache/display/conversation/message center view model 单测回归消息列表派生抽离。 | P1 | L3 | 已完成 |
| P9-IM-026A | Message/Aux Data | 抽 `useMessageAuxiliaryData`，收敛群成员缓存和图片预取副作用。 | P1 | L2 | 已完成 |
| P9-IM-026B | Message/Aux Data | 用 TS、message display/message center view model、media policy 单测回归辅助数据副作用抽离。 | P1 | L2 | 已完成 |
| P9-IM-027A | Message/Conversation Selection | 抽 `useMessageConversationSelection`，收敛 unread identity、会话过滤排序、当前会话、会话 key/read state/type 派生。 | P1 | L3 | 已完成 |
| P9-IM-027B | Message/Conversation Selection | 用 TS、会话列表、IM read view model、message center view model 单测回归会话选择派生，并移除 `MessageCenter.tsx` shape allowlist。 | P1 | L3 | 已完成 |
| P9-CS-001A | Customer Service | 复用消息域媒体动作与 composer model，移除 `ChatWorkspace` 内重复媒体桌面动作、上传归一化、视频封面等待、结果文本提取。 | P1 | L2 | 已完成 |
| P9-CS-001B | Customer Service | 用 TS、客服 cache/workspace view model、composer model 单测回归客服公共能力复用。 | P1 | L2 | 已完成 |
| P9-CS-002A | Customer Service | 抽 `ServiceMessageContextMenu`，复用公共 toast，降低 `ChatWorkspace` presentation 体积。 | P1 | L2 | 已完成 |
| P9-CS-002B | Customer Service | 用 TS、客服 workspace view model、菜单模型单测回归客服媒体菜单抽离。 | P1 | L2 | 已完成 |
| P9-CS-003A | Customer Service | 抽客服 composer surface、线程操作按钮、消息 bubble、header/reception、message stage，降低 `ChatWorkspace` 主 JSX 体积。 | P1 | L3 | 已完成 |
| P9-CS-003B | Customer Service | 用 TS、客服权限/状态/workspace view model、message view model 单测回归客服 presentation 抽离。 | P1 | L3 | 已完成 |
| P9-SET-001A | Settings | 抽 `SettingsRows`，收敛设置页 switch/select/action/info/inline state 基础 UI。 | P1 | L2 | 已完成 |
| P9-SET-001B | Settings | 用 TS、pc settings、settings diagnostics、diagnostics package 单测回归设置行组件抽离。 | P1 | L2 | 已完成 |
| P9-EL-001A | Electron/Auth | 抽 `auth-session-storage`，收敛 main 进程 safeStorage 登录态读写。 | P1 | L2 | 已完成 |
| P9-EL-001B | Electron/Auth | 用 Electron TS、auth/session/store、desktop-api-validation 单测回归安全登录态存储抽离。 | P1 | L2 | 已完成 |
| P9-CS-004A | Customer Service | 抽 `useCustomerServiceIncomingNotifications` 与 `useCustomerServiceThreadLifecycle`，收敛客服通知、状态日志、图片预取、已读和提醒清理副作用。 | P1 | L3 | 已完成 |
| P9-CS-004B | Customer Service | 用 TS、客服状态/workspace view model、reminder、media policy 单测回归客服副作用 hook 抽离。 | P1 | L3 | 已完成 |
| P9-CS-005A | Customer Service Send | 抽 `useCustomerServiceSendController`，收敛客服文本发送、媒体上传、乐观回显、暂停/取消/重试、视频封面和发送诊断。 | P1 | L4 | 已完成 |
| P9-CS-005B | Customer Service Send | 用 TS、客服 cache/workspace、action service、composer model、send state machine 单测回归客服发送控制器抽离。 | P1 | L3 | 已完成 |
| P9-ENG-008A | Code Shape Lint | 在 `MessageCenter`、`ChatWorkspace`、`MePage`、`main.ts` 均低于 900 行后，清空 `lint:shape` 大文件 allowlist。 | P1 | L2 | 已完成 |
| P9-ST-006A | Store Compatibility | 将页面层/Gateway 对 `useWorkspaceStore` 的直接状态读写收敛到已有 auth、workspace-ui owner selectors/getters。 | P1 | L2 | 已完成 |
| P9-ST-006B | Store Compatibility | 用 TS、workspace-ui/auth、Gateway handler/dispatcher 单测回归 store 兼容入口收敛。 | P1 | L2 | 已完成 |
| P9-ST-007A | Store Boundary Gate | 将页面/feature 禁止直连 workspace backing store 的规则接入 `architecture-boundaries` 单测，防止后续回填耦合。 | P1 | L2 | 已完成 |
| P9-ST-007B | Store Boundary Gate | 用 TS、workspace-ui store 单测和架构边界扫描验证 store owner 门面导出与调用边界。 | P1 | L2 | 已完成 |
| P9-API-001A | API/Contract Fixtures | 建立 IM 会话、IM 消息、客服会话、客户资料、客服消息的 API contract fixture 样本，覆盖 modern/snake_case/legacy alias/degraded/invalid。 | P1 | L2 | 已完成 |
| P9-API-001B | API/Contract Boundary | 将页面/feature 禁止直连 API contract normalizer 的规则接入 `architecture-boundaries`，确保 DTO 解释留在数据层。 | P1 | L2 | 已完成 |
| P9-DOC-001A | Documentation Garden | 收窄 `docs:garden` 噪音，将 validation 历史记录汇总展示，活跃文档优先输出真正可行动线索。 | P2 | L2 | 已完成 |
| P9-DOC-001B | Documentation Status | 同步 P9 完成后的风险状态和质量评分，避免新会话继续按旧风险推进。 | P2 | L2 | 已完成 |
| P9-SHARED-001A | Shared UI | 将通讯录、客户资料、会话资料、邀请二维码中的局部 `PanelState` 收敛为共享 UI primitive。 | P1 | L2 | 已完成 |
| P9-SHARED-001B | Shared UI Boundary | 在 `architecture-boundaries` 增加禁止本地定义 `PanelState` 的结构测试，防止空态/错误态重复实现回流。 | P1 | L2 | 已完成 |
| P9-PERF-001A | Customer Service Performance | 建立客服线程列表分段渲染模型，长队列默认渲染首段并按固定步长展开。 | P1 | L2 | 已完成 |
| P9-PERF-001B | Customer Service Performance | 将 `ThreadList` 接入客服线程分段渲染，并补模型单测验证 disabled/default/expand 行为。 | P1 | L2 | 已完成 |
| P9-PERF-002A | Performance Samples | 建立 diagnostics performance sample 模型，从启动诊断中抽取 `durationMs` 并计算 P50/P75/P95。 | P1 | L2 | 已完成 |
| P9-PERF-002B | Performance Samples | 新增 `perf:samples` 脚本，支持读取导出的 diagnostics JSON，输出启动性能 CSV 摘要，供 Windows 实机采样复用。 | P1 | L2 | 已完成 |
| P9-EL-002A | Electron Diagnostics | 建立 main 进程 electron-runtime 诊断，记录 uncaught exception monitor、unhandled rejection、renderer gone、child process gone。 | P1 | L2 | 已完成 |
| P9-EL-002B | Electron Diagnostics | renderer 接入 runtime-error 诊断，导出诊断包时由 main 合并 electron-runtime 快照。 | P1 | L2 | 已完成 |
| P9-ENG-009A | Engineering Gates | 引入 ESLint flat config，建立 `lint:core`，对已重构核心 data/messages/customer-service/runtime diagnostics 路径执行 hard gate。 | P1 | L2 | 已完成 |
| P9-ENG-009B | Engineering Gates | 引入 `@vitest/coverage-v8`，建立 `test:coverage:core`，对核心 domain/model/diagnostics 设置渐进式覆盖率 hard gate。 | P1 | L2 | 已完成 |
| P9-ENG-009C | Dependency Audit | 执行 `npm audit --audit-level=high` 并记录结果；Electron/electron-builder 升级为独立破坏性技术升级项，不混入 lint/coverage gate。 | P1 | L1 | 已完成 |
| P9-ENG-010A | Production Build | 执行 Mac 环境 production build，验证 renderer build 与 Electron TS 编译在当前重构后可闭环。 | P1 | L2 | 已完成 |
| P9-ENG-011A | Dependency Upgrade Assessment | 评估 Electron/electron-builder 高危 dev audit 升级路线，区分最小安全升级与 latest 大版本升级风险。 | P1 | L1 | 已完成 |
| P9-ENG-011B | Dependency Upgrade Execution | 按评估结论执行 `electron@39.8.10` 与 `electron-builder@26.8.1` 最小安全升级，并补 Mac/Windows 验证记录。 | P1 | L3 | 已完成 |

---

## 12. 第十阶段任务：重构后收尾治理与发布验证

第十阶段不是继续扩大架构重构，而是把已经完成的重构成果变成“可长期维护、可发布、可防回退”的工程状态。重点是删除无用代码、固化共用能力约束、审计坏味道、补 Windows 实机证据。

详细计划见 `PC端重构后收尾治理计划.md`。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P10-WIN-001A | Windows Verification | 在 Windows 环境执行 `npm run dist:win`，验证 NSIS 安装包、图标、安装目录、快捷方式。 | P0 | L4 | 待处理 |
| P10-WIN-001B | Windows Runtime | Windows 实机验证启动、托盘、截图、文件打开、视频预览、safeStorage 登录态恢复、diagnostics 导出。 | P0 | L4 | 待处理 |
| P10-WIN-001C | Windows Performance | Windows 打包态导出 diagnostics，并执行 `npm run perf:samples -- <diagnostics.json>` 回填 P75/P95。 | P1 | L3 | 待处理 |
| P10-CLEAN-001A | Dead Code | 盘点重构后无调用的旧组件、旧 hooks、旧 data helper、旧 CSS selector 和旧测试入口。 | P1 | L1 | 已完成 |
| P10-CLEAN-001B | Dead Code | 删除确认无用代码，并同步删除对应测试、样式、导出和文档引用。 | P1 | L3 | 已完成 |
| P10-CLEAN-001C | Compatibility | 评估 `store.ts` 等内部兼容层是否还能继续收窄；能删则删，不能删则记录 owner 和保留理由。 | P1 | L2 | 已完成 |
| P10-GOV-001A | Reuse Governance | 建立“重复实现禁止清单”：头像、空/错态、badge/time、媒体动作、通知、诊断、API normalizer、Gateway handler 等必须复用。 | P1 | L1 | 已完成 |
| P10-GOV-001B | Reuse Gate | 将重复实现约束逐步接入 `lint:shape` 或 `architecture-boundaries`，先覆盖最容易回流的公共能力。 | P1 | L3 | 已完成 |
| P10-GOV-002A | Dependency Policy | 补技术选型规则：成熟开源优先、避免重复造轮子、新依赖必须说明收益/体积/维护/安全/替代方案。 | P2 | L1 | 已完成 |
| P10-SMELL-001A | Code Smell Audit | 对 PC 端做坏味道审计：超大文件、重复逻辑、过宽 props、隐式 any、魔法字符串、散落副作用、CSS 泄漏。 | P1 | L1 | 已完成 |
| P10-SMELL-001B | Code Smell Backlog | 将坏味道审计结果拆成 P0/P1/P2 修复清单，避免一次性“大扫除”影响主链路稳定。 | P1 | L2 | 已完成 |
| P10-TEST-001A | E2E Smoke | 建立 PC 核心路径 smoke checklist：登录、普通 IM 收发、客服接入/发送/关闭、截图、文件、诊断导出。 | P1 | L2 | 已完成 |
| P10-REL-001A | Release Checklist | 建立发布检查清单和回滚说明，覆盖 Mac 验证、Windows 验证、audit、build、quick、coverage、diagnostics。 | P1 | L2 | 已完成 |
| P10-TASKS-001 | Executable Task List | 按“大文件优化 > 功能复用 > 优先清理无用代码 > 其他”建立可独立执行、可跟踪的后续任务清单。 | P1 | L2 | 已完成 |
| P10-STABILITY-001 | Renderer Startup | PC 端白屏可见化：顶层 Error Boundary 接入 runtime diagnostics，首屏模块渲染集中兜底，开发态可启动。 | P0 | L2 | 已完成 |
| P10-LARGE-001 | Main Large File | 拆分 main 进程截图选择窗口，降低 `main.ts` 临界体积并集中截图窗口安全边界。 | P0 | L3 | 已完成 |
| P10-LARGE-002 | Main Large File | 拆分 main 进程桌面通知能力，收敛 Notification 创建、点击和窗口聚焦逻辑。 | P1 | L2 | 已完成 |
| P10-LARGE-003 | Main Large File | 拆分 main 进程文件/媒体 IPC handler，保留路径安全策略和 desktop API validation。 | P1 | L3 | 已完成 |
| P10-LARGE-004 | Settings Large File | 拆分 `MePage.tsx` 的诊断、账号安全、聊天记录工具等设置区块。 | P1 | L2 | 已完成 |
| P10-LARGE-005 | Message Large File | 拆分 `MessageBodyView.tsx` 图片、视频、文件、联系人卡片等消息内容渲染。 | P1 | L3 | 已完成 |
| P10-REUSE-001 | Media Reuse | 抽媒体动作 capability helper，收敛 UI 中对 desktop media API 的能力判断。 | P0 | L2 | 已完成 |
| P10-REUSE-002 | Media Reuse Gate | 将桌面媒体 IPC 直接调用约束接入 architecture boundary，防止 UI 回填平台动作。 | P1 | L3 | 已完成 |
| P10-REUSE-003 | Time Reuse | 建立页面展示型时间格式化重复实现边界，优先报告后升级 hard gate。 | P2 | L2 | 已完成 |
| P10-CLEAN-002 | Composer Cleanup | 确认 `MessageComposer.tsx` 是否仍为生产入口；无用则删除，有用则记录 owner 和瘦身任务。 | P0 | L2 | 已完成 |
| P10-CLEAN-003 | Dead Test Facade | 处理 `im-command-executor.ts` 测试孤儿，迁移测试到真实 owner 后删除兼容文件。 | P1 | L2 | 已完成 |
| P10-CLEAN-004 | Performance Samples Reuse | 评估 `perf:samples` CLI 与 `performance-samples.ts` 统计逻辑复用或记录保留理由。 | P2 | L2 | 已完成 |
| P10-OTHER-001 | CSS Owner | 建立 CSS owner 清单和 `app.css` 迁移队列，避免全局样式继续膨胀。 | P1 | L1 | 已完成 |
| P11-CLEAN-001 | Generated Artifacts | 删除被 git 跟踪的 Playwright/test-results 产物，加入 ignore，并让 `p10:audit` 持续报告 tracked generated artifacts。 | P0 | L2 | 已完成 |
| P11-LARGE-001 | Message Large File | 继续瘦身 `MessageCenter.tsx`，保持页面只负责装配并低于 800 行。 | P1 | L2 | 已完成 |
| P11-LARGE-002 | Composer Large File | 拆分 `MessageComposer.tsx` / `LexicalChatInput.tsx` 的 toolbar、plugin、attachment adapter，保留生产入口。 | P1 | L2 | 已完成 |
| P11-LARGE-003 | Contacts/Profile Large File | 瘦身 `ContactsPage.tsx` / `CustomerProfileWorkspace.tsx`，复用空态和资料 section 能力。 | P1 | L2 | 已完成 |
| P11-REUSE-001 | Avatar Reuse | 收敛头像 fallback/initial 重复实现到 `PcAvatar` 或消息 view model owner。 | P1 | L2 | 已完成 |
| P11-REUSE-002 | Time Reuse | 收敛展示型日期格式化到 `format` owner 或领域 helper。 | P1 | L2 | 已完成 |
| P11-CSS-001 | CSS Cleanup | 按 CSS owner 清单分批迁移 `app.css` 和 message CSS，降低全局样式膨胀。 | P2 | L2 | 已完成 |
| P11-BOUNDARY-001 | Boundary Cleanup | 处理 type escape 信号，评估 owner facade 是否还能继续收窄。 | P2 | L2 | 已完成 |
| P11-AUDIT-001 | Audit Cleanup | 接入剩余孤儿源码并让 `p10:audit` 除 Windows 外所有代码健康信号清零；完成残留命名精确复查。 | P1 | L2 | 已完成 |
| P11-WIN-001 | Windows Verification | 在 Windows 环境验证安装包、启动、托盘、截图、文件、视频、safeStorage、diagnostics、性能采样。 | P0 | L4 | 待处理 |
| P12-AUDIT-001 | Size Health | 建立 P12 专用尺寸审计，持续报告 CSS 大文件、700 行以上组件和 data/main 边缘文件。 | P0 | L1 | 已完成 |
| P12-CSS-001 | CSS Owner | 拆分 `porcelain-shell.css`，按 app shell、客服 skin、composer rich input 等 owner 降到 2000 行以下。 | P1 | L2 | 已完成 |
| P12-CSS-002 | CSS Owner | 拆分 `message-shared.css`，按 message primitives、attachment、composer shared owner 降到 2000 行以下。 | P1 | L2 | 已完成 |
| P12-LARGE-001 | Composer Large File | 继续瘦身 `MessageComposer.tsx`，抽 attachment list 和 screenshot action，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-002 | Profile Large File | 继续瘦身 `CustomerProfileWorkspace.tsx`，抽资料 section 和空错态装配，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-003 | Message Large File | 继续瘦身 `MessageCenter.tsx`，抽纯装配层或 dialog layer，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-004 | Contacts Large File | 继续瘦身 `ContactsPage.tsx`，抽列表/详情/空态装配，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-005 | Lexical Large File | 继续瘦身 `LexicalChatInput.tsx`，抽 plugin wiring 或 attachment node bridge，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-006 | Message Body Large File | 继续瘦身 `MessageBodyView.tsx`，抽消息内容分发或媒体 fallback 展示，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-007 | Sidebar Large File | 继续瘦身 `Sidebar.tsx`，抽导航配置、底部在线状态或账号弹层，目标低于 700 行。 | P2 | L2 | 已完成 |
| P12-LARGE-008 | Settings Large File | 继续瘦身 `MePage.tsx`，抽朋友权限、黑名单和隐私值映射，目标低于 700 行。 | P2 | L2 | 已完成 |
| P13-GOV-001 | Responsibility Governance | 建立代码职责治理规范、职责审查清单和大文件例外机制，后续治理不再只以降低文件大小为目标。 | P1 | L1 | 已完成 |
| P13-GOV-002 | Responsibility Audit | 对 P12 `data-main-edge-files` 逐个做 owner 审查，按职责混杂程度决定拆分、保留或登记例外。 | P1 | L1 | 已完成 |
| P13-GOV-003 | IM Responsibility Guard | 核心 IM 变更必须先确认页面/hook/model/data/Gateway 边界，消息发送、已读、媒体、菜单、缓存不得回流页面。 | P0 | L2 | 已完成 |
| P13-GOV-004 | CS Responsibility Guard | 客服工作台变更必须先确认 thread/message/queue cache owner 和权限/状态 owner，缓存合并不得回流组件。 | P1 | L2 | 已完成 |
| P13-GOV-005 | Electron Boundary Guard | main/preload 变更必须先确认 IPC payload 校验、renderer 最小能力和文件/截图/通知安全边界。 | P0 | L2 | 已完成 |
| P14-RESP-001 | IM/Gateway Responsibility Migration | 拆 Gateway payload / IM read/message helper 的职责边界，保留原导出兼容，不改变 Gateway event 或 DTO wire shape。 | P0 | L2 | 已完成 |
| P14-RESP-002 | CS Cache Responsibility Migration | 拆客服 cache adapter 的 thread/message/diagnostics helper，保留原导出兼容，不改变 React Query key。 | P1 | L2 | 已完成 |
| P14-RESP-003 | Screenshot Boundary Migration | 拆截图窗口配置和 HTML 模板，不改变 IPC/preload contract，不扩大 renderer 能力。 | P0 | L2 | 已完成 |
| P14-RESP-004 | API DTO Responsibility Decision | 评估 API DTO 类型按领域拆分或登记长期例外；保留 `api-client.ts` re-export facade。 | P2 | L1 | 已完成 |
| P15-GUARD-001 | Architecture Boundary Guard | 扩展架构边界测试，防止 cache adapter、message cache mutation、direct desktopApi 入口散落回流。 | P1 | L2 | 已完成 |
| P15-GUARD-002 | Responsibility Exception Gate | 将职责例外清单接入审计或结构测试，例外必须有 owner、保留理由和后续触发条件。 | P1 | L2 | 已完成 |
| P16-RELEASE-001 | Mac Release Verification | 执行 quick/build/docs/diff、开发态启动和核心 smoke 清单，回填发布前验证记录。 | P1 | L3 | 已完成 |
| P16-WIN-001 | Windows Release Verification | 在 Windows 环境验证 dist、安装包、启动、托盘、截图、文件/视频、safeStorage、diagnostics、性能采样。 | P0 | L4 | 待处理 |
| P17-SMELL-001 | Model Boundary Direction | 修复 messages model 反向依赖 hooks/components，迁出会话类型规则和群头像类型，并补结构测试。 | P0 | L2 | 已完成 |
| P17-SMELL-002 | Gateway Side Effects | 拆 `GatewayBridge` 事件副作用到 Gateway IM/CS owner，组件只保留连接订阅和清理。 | P0 | L3 | 已完成 |
| P17-SMELL-003 | Desktop Capability Owner | 收敛 composer 直接截图 IPC 到 messages runtime owner，并更新 desktopApi 结构门禁。 | P1 | L2 | 已完成 |
| P17-SMELL-004 | Electron Template Owner | 拆视频播放器 HTML 模板并为视频/截图模板补安全与结构测试。 | P1 | L2 | 已完成 |
| P17-SMELL-005 | API DTO Helper Owner | 将客服历史 helper 从 API DTO 聚合下沉到客服 model，保留 facade 兼容。 | P2 | L2 | 已完成 |
| P17-SMELL-006 | IM Normalize Tables | 将 IM message normalize 字段别名表驱动化，补 fixture 测试。 | P1 | L2 | 已完成 |
| P17-SMELL-007 | Workspace Store Effects | 隔离 workspace store tray 副作用，不删除旧 store facade，不改持久化 key。 | P1 | L2 | 已完成 |

## 13. 第十八阶段任务：全面架构与稳定性治理

第十八阶段不以继续压缩文件为目标，而是从架构设计、功能设计、代码分层、性能、解耦、复用、安全和发布验证角度做全面收口。详细任务见 `PC端P18全面治理任务清单.md`。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P18-GOV-001 | Governance | 建立 P18 全面治理总账，记录 owner、边界、稳定入口、验证命令、验证记录和状态。 | P1 | L1 | 已完成 |
| P18-ARCH-001 | Architecture | 页面数据访问职责收口，页面只做装配，异步行为进入 hook/controller/data owner。 | P1 | L2 | 已完成 |
| P18-ARCH-002 | Message Architecture | 拆清消息应用服务职责，区分 cache 写入、API 调用、query invalidation 与纯规则。 | P0 | L3 | 已完成 |
| P18-FUNC-001 | IM Workflow | 补核心 IM workflow 回归测试，覆盖发送、重试、已读、媒体、Gateway cache 一致性。 | P0 | L3 | 已完成 |
| P18-CS-001 | Customer Service | 客服工作台职责与缓存治理，防止 thread/message/queue cache 合并回流组件。 | P1 | L3 | 已完成 |
| P18-ELECTRON-001 | Electron Boundary | Renderer 组件 Electron 能力最终收口到 runtime owner，并收紧结构测试白名单。 | P1 | L2 | 已完成 |
| P18-UX-001 | Message UX | 消息危险操作确认体验治理，替换散落 `window.confirm`。 | P1 | L2 | 已完成 |
| P18-PERF-001 | Rendering Performance | 高频列表渲染与 query invalidation 守卫，形成性能验证记录。 | P1 | L3 | 已完成 |
| P18-PERF-002 | Media Resilience | 媒体与头像缓存生命周期稳定性治理，覆盖降级和资源清理。 | P1 | L2 | 已完成 |
| P18-DATA-001 | Data Responsibility | 复审 P12 剩余 data/main 边缘文件，更新例外或拆分任务。 | P2 | L1 | 已完成 |
| P18-SEC-001 | Electron Security | Electron/main/preload 安全边界复核，强化模板、文件、safeStorage、diagnostics 约束。 | P0 | L3 | 已完成 |
| P18-TEST-001 | Test Gate | 核心测试门槛提升，补核心覆盖后提高 coverage hard gate。 | P1 | L3 | 已完成 |
| P18-RELEASE-001 | Release Closure | Mac 本地发布闭环与 Windows 实机验证交接。 | P0 | L3 | 已完成 |

---

## 14. 第十九阶段任务：文件职责、上下文预算与 AI 可维护治理

第十九阶段不以单纯压缩行数为目标，而是把“职责清晰、文件不过大、文件数量克制、AI 可按路由接手”沉淀为清单、审计命令和结构守卫。详细任务见 `PC端P19文件职责与AI上下文治理清单.md` 和 `PC端AI文件路由表.md`。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P19-GOV-001 | Governance | 建立 P19 上下文预算治理清单，记录 owner、职责、行数、AI 阅读风险和处理结论。 | P1 | L1 | 已完成 |
| P19-ROUTE-001 | AI Routing | 建立 AI 文件路由表，按 IM、客服、Gateway、Electron、CSS 等场景限制先读入口和验证命令。 | P1 | L1 | 已完成 |
| P19-AUDIT-001 | Context Audit | 建立 `npm run p19:audit`，持续报告超上下文预算文件和过碎文件信号。 | P1 | L2 | 已完成 |
| P19-SPLIT-001 | Minimal Split | 对职责混杂且阅读成本高的消息内容展示做最小拆分，保留原入口稳定。 | P1 | L2 | 已完成 |
| P19-MERGE-001 | Over Split Audit | 审查过碎文件信号，合并无意义 wrapper，保留有边界价值的小 owner。 | P2 | L1 | 已完成 |
| P19-CSS-001 | CSS Owner | 按 CSS owner 审查超 1600 行 CSS，职责单一则登记例外，不机械拆分。 | P2 | L1 | 已完成 |
| P19-GUARD-001 | Guard | 补强结构守卫，要求 P19 清单、AI 路由表和审计脚本长期存在。 | P1 | L2 | 已完成 |
| P19-DOC-001 | Docs | 更新 README、任务矩阵和验证记录，让新会话可恢复 P19 判断标准。 | P1 | L1 | 已完成 |

---

## 15. 第二十阶段任务：功能完善与回归治理

第二十阶段用于承接重构后的功能迭代。每个功能先做高风险边界判断，再按 `PC端AI文件路由表.md` 进入对应 owner，避免回到页面堆逻辑、合同漂移或重复实现。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P20-FEAT-001 | Media Send | 视频发送时由客户端优先生成 JPEG 首帧封面，二次调用 `POST /api/client/v1/media/upload` 上传图片，并把上传响应的 `url` 写入 `body.video.thumbnailUrl`；本地乐观消息立即带封面，失败/取消不从列表消失；发送 payload 清洗本地展示字段并把 `durationSeconds/width/height/sizeBytes` 规整为整数；视频上传中使用微信式封面卡片、暗色遮罩、圆形进度/暂停控件，上传完成前禁止播放，播放器打开失败时回退当前可见视频源。 | P1 | L2 | 已完成 |
| P20-FEAT-002 | Media Video UX | 修复视频源加载失败时丢封面的问题；视频打开失败时保留封面卡片并显示克制状态，不再退化为黑色/通用占位；上传、暂停、失败、取消态使用微信式圆形控件和短状态文案；发送失败诊断区分视频上传、封面上传和发消息阶段。 | P1 | L2 | 已完成 |
| P20-FEAT-003 | Media Video Player | 修复视频点击后桌面播放器优先打开远端旧源导致的加载失败/反复刷新；播放器模板增加 `loading/ready/failed/unsupported` 状态机、失败保留封面并提供重试/系统播放器兜底；媒体缓存失败进入 electron-runtime 诊断；上传队列态不假装 0% 进度，上传圆环改为 SVG 进度。 | P1 | L2 | 已完成 |
| P20-FEAT-004 | Media Send Diagnostics | 修复视频发送失败排查盲区：send 诊断除 renderer 内存 buffer 外同步写入有界本地诊断缓存，并让设置页诊断包在内存丢失后仍能导出最近 send 失败；同时保留 API endpoint path，避免被误判为本地文件路径而脱敏。 | P1 | L2 | 已完成 |
| P20-FEAT-005 | Send Outbox | 新增 PC 端本地发送箱 owner，普通 IM 与客服文本/图片/视频/文件失败、暂停、取消和中断后写入 IndexedDB；刷新后按账号/租户/API scope 和会话恢复失败消息与媒体 Blob，重试复用原 `localMessageId/clientMsgId`，成功后清理本地记录。 | P0 | L4 | 已完成 |

---

## 16. 第二十一阶段任务：普通 IM 消息内核一致性治理

第二十一阶段用于修正普通 IM 核心链路中“Gateway、轮询、本地发送、已读、撤回/删除多入口直接 patch cache”的一致性风险。目标是把消息状态规则收敛到可测试的纯函数内核，再由现有 React Query cache facade 渐进接入。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P21-MSG-CORE-001 | Message Core Tests | 补齐 Gateway/轮询去重、本地发送回显、撤回/删除最后一条、旧 seq、已读未读等保护测试。 | P0 | L4 | 已完成 |
| P21-MSG-CORE-002 | Message Core Reducer | 新增普通 IM `message-core` 纯 reducer，统一 `message.polled/gateway_received/local_created/send_confirmed/send_failed/recalled/deleted/read.updated` 事件归约。 | P0 | L4 | 已完成 |
| P21-MSG-CORE-003 | Cache Facade Integration | 将 Gateway cache、本地发送 cache mutation、撤回/删除、read cache 更新接入 `message-core`，保留现有页面调用面。 | P0 | L4 | 已完成 |
| P21-MSG-CORE-004 | Docs / Validation | 落地计划、验证记录和诊断事件说明，保证后续可追踪。 | P1 | L2 | 已完成 |

---

## 17. 第二十二阶段任务：消息状态与已读回执统一治理

第二十二阶段用于统一 IM 与在线客服的消息状态展示语言：失败态参考微信外置红点，文本不显示“发送中/已发送”，私聊逐条显示已读/未读，群聊仅消费服务端已有聚合字段，不新增 read receipt 请求接口。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P22-STATUS-001 | Message Status Model | 新增纯消息状态模型，统一推导发送态、失败态、私聊已读/未读和群聊聚合回执展示。 | P1 | L3 | 已完成 |
| P22-STATUS-002 | Failure Marker UI | 自己消息发送失败时在气泡外显示微信式红色 `!`，hover/click 展示“发送失败，点击重试”，媒体失败可触发现有重试。 | P1 | L2 | 已完成 |
| P22-STATUS-003 | IM / CS Status Wiring | IM 与在线客服共用同一 view model 状态；文本移除“发送中/已发送”，客服去掉固定“已发送”。 | P1 | L3 | 已完成 |
| P22-STATUS-004 | Group Receipt Minimum | 群聊仅消费现有 `readCount/unreadCount/allRead` 字段，无字段时只显示时间；服务端批量回执接口登记为后续联调项。 | P1 | L2 | 已完成 |
| P22-STATUS-005 | Docs / Validation | 更新任务矩阵、AI 文件路由和验证记录，保留验证命令与服务端接口假设。 | P1 | L1 | 已完成 |
| P22-STATUS-006 | Message Refresh Stability | 修复活跃会话消息每 2.5 秒强制轮询导致媒体卡片反复重建的问题；保留 React Query key 不变，消息未变化时复用旧对象，轮询降为低频兜底并恢复窗口聚焦刷新。 | P1 | L2 | 已完成 |
| P22-STATUS-007 | Failed Message Resend | 修复失败红点只提示不重发的问题：点击失败红点弹出微信式“重发该消息?”确认，文本失败复用原 localMessageId/clientMsgId 重发，媒体失败复用 upload retry；IM 403 错误按服务端 code 展示更明确原因并写入 send diagnostics。 | P1 | L3 | 已完成 |
| P22-STATUS-008 | Failure Marker Stability | 修复文本发送过程中短暂 failed 状态导致红色 `!` 一闪而过的问题；失败红点延迟淡入，瞬时状态抖动不暴露给用户，稳定失败仍可点击重发。 | P1 | L1 | 已完成 |
| P22-STATUS-009 | Text Sending Indicator Stability | 文本消息本地 echo 后默认静默发送；仅当 `sending` 超过 700ms 时在气泡外显示微信式轻量转圈，成功后进入已读/未读，失败后切换红点重发。 | P1 | L2 | 已完成 |
| P22-STATUS-010 | Permission Failure UX Gate | 将 403/FORBIDDEN 等发送权限失败从用户文案中剥离：红点 tooltip 固定为“发送失败，点击重试”，重发确认使用“当前会话暂不可发送”等产品化短文案，真实 `status/code/requestId/path` 继续进入 diagnostics；不新增权限接口。 | P1 | L2 | 已完成 |
| P22-STATUS-011 | WeChat Send Status Slot | 将自己消息的发送中和失败态收敛到同一状态位：发送中立即显示微信式小转圈，快速失败先保持转圈至少 650ms，再原地切换为紧凑红色 `!`；失败消息继续保留、可重发、可由 outbox 恢复。 | P1 | L2 | 已完成 |
| P22-STATUS-012 | Media Upload Controls Dedupe | 移除图片/文件/视频气泡底部横向上传进度条、暂停和取消按钮；图片/文件发送态统一由气泡左侧状态位表达，视频保留封面内圆形上传控件，删除无调用的 `UploadControls` 组件和对应 CSS。 | P1 | L2 | 已完成 |
| P22-STATUS-013 | Media Status Channel Split | 按微信式媒体差异拆分状态承载：图片用气泡外状态位，视频本地上传/失败由封面内圆形控件独立承载，文件卡片用自身 meta 展示上传/失败状态且未成功前不可打开。 | P1 | L2 | 已完成 |
| P22-STATUS-014 | Media Upload Progress Channel Polish | 修正视频圆形控件进度展示和文件状态承载：视频有进度时显示确定圆环、无进度时显示不确定加载；文件上传/失败不再使用左侧状态位，改由文件卡片 meta、内部细进度线和卡片点击重试承载。 | P1 | L2 | 已完成 |
| P22-STATUS-016 | Real Media Upload Progress | 按真实链路补齐媒体上传阶段模型：文件上传、视频上传、视频封面上传、发送 API 等待分别映射到本地 `uploadPhase` 和展示进度；不人为拖慢上传，只有服务端发送成功后才进入成功态。 | P1 | L3 | 已完成 |
| P22-STATUS-017 | WeChat File Upload Card | 将文件上传状态改为微信式文件卡片自承载：右侧文件 icon 内嵌上传进度/暂停/继续/重试控件，移除底部进度线，底部只保留弱来源区；真实上传阶段模型不变。 | P1 | L2 | 已完成 |
| P22-STATUS-018 | WeChat Video Upload Ring | 精修视频上传圆环视觉：上传中只保留封面内半透明暗色圆盘、白色短弧进度和中央暂停/继续/重试图标，移除上传中/发送中文字 pill；真实上传阶段模型不变。 | P1 | L2 | 已完成 |
| P22-STATUS-019 | Video Determinate Upload Progress | 修复视频上传 progress 事件缺少 `percent` 时被丢弃的问题：用 `loaded/total` 或 `loaded/File.size` 计算真实确定进度，IM/客服媒体发送统一接入，避免视频一直显示不确定转圈。 | P1 | L2 | 已完成 |
| P22-STATUS-020 | WeChat File Upload Progress Icon | 修正文件上传 icon 展示：文件类型层始终可见，上传控件不再整块遮挡 `ZIP/PDF` 等类型；有进度时用确定圆环，`sending` 显示 95% 完成态，不退化成不确定转圈。 | P1 | L2 | 已完成 |
| P22-STATUS-021 | Video Fixed Determinate Upload Arc | 修复视频上传圆环仍以不确定短弧旋转的问题：状态模型显式返回 `progressMode`，视频上传、封面上传、暂停和发送阶段都使用固定确定进度弧，只有极端无进度态才旋转。 | P1 | L2 | 已完成 |
| P22-STATUS-022 | Video Upload No Default Spin | 将视频上传态彻底改为静态进度弧：`queued/preparing/uploading/sending/paused/failed/canceled` 全程使用确定进度语义，移除视频上传自旋动画和 `is-indeterminate` 路径。 | P1 | L2 | 已完成 |
| P22-STATUS-023 | Video Upload Progress Evidence | 为视频文件上传和封面上传补 progress summary 诊断，记录事件数、首尾进度、耗时、快速完成和长耗时稀疏事件判定，用证据区分真实快传与 progress 链路缺事件。 | P1 | L2 | 已完成 |
| P22-STATUS-024 | WeChat File Icon Center Control | 修正文件上传卡片右侧 icon 的微信式表达：上传/发送/暂停/失败控件统一居中承载，文件名扩展名继续表达类型信息。 | P1 | L2 | 已完成 |
| P22-STATUS-025 | File Completion and Source Polish | 补齐文件消息闭环：成功态恢复 `ZIP/PDF/APK/FILE` 类型文字；上传有进度时使用从 12 点开始的确定圆弧且不自旋；暂停无进度时冻结 0%；来源文案先对齐当前程序名，P22-STATUS-026 已改为 app metadata 注入。 | P1 | L2 | 已完成 |
| P22-STATUS-026 | File Source App Metadata | 文件卡片来源不再由 `FileMessageCard` 硬编码具体产品名，改由 Vite 从 `package.json build.productName` 注入 renderer app metadata，再由 `FileMessageContent` 显式传给文件卡片。 | P1 | L1 | 已完成 |
| P22-STATUS-027 | WeChat File Upload Card Polish | 精修文件上传卡片：右侧文件 icon 改为更柔和的文档形态，上传/暂停/发送/失败控件居中；文件上传全程使用静态 SVG 确定圆弧，缺进度时停在 0%，不再默认自旋。 | P1 | L2 | 已完成 |
| P22-STATUS-028 | File Upload Card Final Polish | 最终精修文件上传卡片视觉：上传态 icon 不再整体灰化，改为低饱和文档色；圆环更细更轻，0% 时静态不造假进度；聊天气泡内文件卡片比例更接近微信式密度。 | P1 | L1 | 已完成 |
| P22-STATUS-029 | Video Player Bad Cache Recovery | 修复桌面视频播放器打开失败：视频缓存命中时嗅探 JSON/HTML 错误页等坏缓存，发现后重新下载；播放器模板修正倍速文案，避免实体字符串泄露到 UI。 | P1 | L2 | 已完成 |
| P22-STATUS-030 | Post-029 Regression Gate | 在 P22-STATUS-029 后继续执行媒体/状态/播放器回归门禁，确认局部单测、完整 unit、quick check 和 docs check 均通过；未发现需要新增业务改动的后续问题。 | P1 | L2 | 已完成 |
| P22-STATUS-031 | Video Failed Retry Hit Area | 修复视频发送失败后只有中央小控件可重试的问题：上传失败/暂停等 overlay 有 action 时整张视频卡片和键盘 Enter/Space 都触发对应上传动作，失败态不尝试打开播放器。 | P1 | L2 | 已完成 |
| P22-STATUS-032 | Video Open Failure Retry | 修复已发送视频内联预览或桌面打开失败后卡片不可再次点击的问题：`failed/openError` 只影响文案，不再阻断有视频源的卡片继续重试打开播放器。 | P1 | L2 | 已完成 |
| P22-STATUS-033 | Video Player Fast Window | 修复桌面视频打开慢和无反馈等待：播放器窗口先显示封面和准备状态，视频缓存下载在后台完成后注入本地 `file://` 源；下载失败直接在播放器内展示失败原因，IPC contract 不变。 | P1 | L2 | 已完成 |
| P22-STATUS-034 | Video Player Unsupported Fallback | 修复 Electron 内置播放器不支持部分视频编码时的卡死体验：区分视频准备失败、Chromium 不支持和未知加载失败；不支持时主按钮切换为“用系统播放器打开”，保留下载和倍速控制，IPC contract 不变。 | P1 | L2 | 已完成 |
| P22-STATUS-035 | Video Player Build Sync Fallback | 修复 Electron main/template 改动未进入运行产物导致复测仍显示旧错误的问题：将播放器模板构建同步到 `dist/main/*`，并把任意已有视频 URL 的 `<video>` 播放失败统一兜底到“用系统播放器打开”。 | P1 | L2 | 已完成 |
| P22-STATUS-036 | Video Player Server Source Priority | 修复桌面视频打开源选择回归：优先使用服务端媒体源 `remoteSrc` 打开原视频，避免当前预览源 `displaySrc` 绕开后端可播/转码资源；无服务端源时继续回退当前显示源，不改 IPC contract。 | P1 | L2 | 已完成 |
| P22-STATUS-037 | Video Player File Document Host | 修复 Electron 播放器 HTML 使用 `data:text/html` 承载导致 `file://` 视频被 URL safety check 拒绝的问题：播放器模板改写入 userData 临时 HTML 并以 `file://` 加载，验证 H.264/AAC 样本可在 Electron `canplay`，IPC contract 不变。 | P1 | L2 | 已完成 |
| P22-STATUS-038 | Video Player Autoplay Layout | 优化原视频窗口的 IM 播放体验：点击聊天视频后弹窗在 `canplay` 后自动播放，自动播放拒绝不误判失败；窗口尺寸改为内容优先的克制策略，竖屏/横屏/方形视频按工作区舒适比例开窗。 | P1 | L2 | 已完成 |
| P22-STATUS-039 | Sent Video Open URL Normalization | 修复 PC 端发送成功后点击视频提示“打开失败”：renderer 内联 `<video>` 可播放的相对服务端地址在进入 Electron main 前统一按当前 web origin 规整为绝对 URL，避免 main 侧缓存下载误判“不支持的媒体地址”；不改 IPC contract，不新增依赖。 | P1 | L2 | 已完成 |
| P22-STATUS-040 | Local Sent Video Cache Playback | 将本机刚发送的视频升级为本地缓存直开：新增窄 IPC 由 preload 通过 `webUtils.getPathForFile` 派生本地文件路径，main 复制进既有媒体缓存；IM/客服视频发送成功后优先保留 `file://` 本机缓存预览源，远端 URL 仅作历史/跨设备/缓存失败兜底。 | P1 | L3 | 已完成 |
| P22-STATUS-041 | Video Player Opening State Polish | 精修本地上传视频点击后的原视频窗口打开态：loading 延迟展示且不提前暴露系统播放器兜底，ready 前隐藏控制条，autoplay 被系统拒绝时显示居中播放按钮而非失败态；失败/不支持态保留明确兜底。 | P1 | L2 | 已完成 |
| P22-STATUS-042 | Video Message Poster Decode Gate | 修复消息窗口视频卡片偶发黑屏后才显示封面的问题：视频封面改由真实 `<img>` 解码事件驱动可见态，`posterSrc` 变化时重置 loading/ready/failed 状态，未解码前保持微信式浅色占位和播放按钮，不再提前进入黑底 `has-poster` 分支。 | P1 | L2 | 已完成 |
| P22-STATUS-043 | Video Upload Display Progress Ticker | 修复视频上传 UI 经常从 0 直接跳到完成态的问题：视频上传展示进度改为真实 XHR progress 与本地阶段时钟合并，缺少连续 progress 事件时仍可见推进；上传中封顶在阶段上限，`sending` 最高 95，服务端确认后退出 overlay，不显示 100% 上传圆环。 | P1 | L2 | 已完成 |
| P22-STATUS-044 | Local Sent Video Cache IPC Arg Preservation | 修复本机发送成功视频点击“打开失败”的根因：`cacheLocalMediaFile` 的 preload 派生 `sourcePath` 在 main 通用 IPC 校验层被丢弃；新增 main-only IPC 参数校验保留安全路径，renderer 仍不能直接传任意路径，本地缓存直开链路恢复。 | P1 | L3 | 已完成 |
| P22-STATUS-045 | Local Video Open Source Decoupling | 彻底拆开视频消息卡片内联预览源与桌面播放器打开源：本地 `file://` 缓存只作为 open source，不再挂入消息列表 `<video>`；失效 `blob:` 封面转码失败改为 best-effort，不阻断 `openVideoPlayer`；新增脱敏视频打开诊断区分 attempt/success/failed/poster ignored。 | P1 | L2 | 已完成 |
| P22-STATUS-046 | Local Sent Media Cache Unification | 统一选择/粘贴的图片、视频、文件本地发送缓存模型：preload 优先复制真实选择路径，粘贴无路径时把 bytes 物化到 app 管理缓存；消息体拆清 `localPreviewUrl` 与 `localOpenUrl`，发送成功后本机打开优先 app cache，远端 URL 仅兜底。 | P1 | L3 | 已完成 |

---

## 18. 第二十三阶段任务：播放器能力技术评估

第二十三阶段用于评估是否引入更强的桌面视频播放能力。该阶段默认不直接改造播放技术栈；新增 native 依赖、打包资源、外部播放器或 libmpv 嵌入前必须负责人确认。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P23-PLAYER-001 | mpv/libmpv Assessment | 评估 mpv/libmpv 作为 PC 端全格式播放器能力的可行性，对比 Electron Chromium、系统播放器、外部 mpv 子进程和嵌入式 libmpv；覆盖 Windows 打包、签名、更新、体积、安全和 UX。 | P1 | L1 | 待确认 |

---

## 19. 第二十四阶段任务：联系人与好友关系闭环

第二十四阶段聚焦普通 IM 联系人关系能力，不扩大 Electron、Gateway 或持久化状态边界。所有好友关系动作必须参考 `docs/api-contracts/client-api.md` 中的 client API 合同。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P24-CONTACT-001 | Contact Card And Friend Relation Loop | 完成 PC 端名片消息闭环：输入框“更多”可发送 `contact_card` 名片，消息卡片点击打开关系感知资料弹窗；好友可发消息/删除/拉黑，非好友可发送好友申请，收到申请可通过/拒绝；群资料禁用成员列表和群成员头像资料查看，但保留聊天头像、群头像和 @ 数据能力。 | P1 | L3 | 已完成 |
| P24-CONTACT-002 | Contacts Directory And Image Message Closure | 完成通讯录与图片消息闭环：通讯录合并组织/员工入口，保留 `staff` 兼容别名，组织成员按部门展示并在姓名同行标记角色；客户/好友支持发消息、删除好友、加入黑名单，组织成员只保留发消息；图片消息采用微信式自然气泡和内置 viewer，支持复制、另存、显示位置与本地缓存优先动作源。 | P1 | L3 | 已完成 |
| P24-STABILITY-001 | React Hook Queue Crash Guard | 治理 `Should have a queue` 类 React hooks 崩溃：错误边界改为中文恢复界面与错误编号，runtime diagnostics 记录 component stack/resetKey/module/url，新增 renderer-wide `lint:hooks` 并纳入 `check:quick`，防止条件 hooks 顺序问题回流。 | P1 | L2 | 已完成 |

---

## 20. 第二十五阶段任务：聊天查找体验治理

第二十五阶段聚焦普通 IM 当前会话内查找体验，不新增服务端全文搜索接口，不改变消息 query key 或 Gateway/IPC 边界。

| 编号 | 模块 | 目标 | 风险 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P25-LOOKUP-001 | Message Lookup Entry | 合并聊天 header 的搜索和历史记录入口为微信式单一“查找聊天内容”；点击时关闭客户信息独立面板并回到消息列表，统一展示搜索输入、历史分类和结果空态。 | P1 | L2 | 已完成 |

---

## 21. 当前关键风险清单

| 编号 | 风险 | 影响 | 控制方式 | 状态 |
| --- | --- | --- | --- | --- |
| RISK-001 | `GatewayBridge.tsx` 同时处理太多职责 | Gateway 改动影响 IM/客服/通知/未读 | P1 已抽 typed event/adapter/dispatcher/handler，P9 已抽事件注册表、query invalidation、payload utils，并移出大文件 allowlist | 已缓解 |
| RISK-002 | `store.ts` 状态边界过宽 | 改一个状态影响多个模块 | P2/P9 已拆 auth/settings/workspace-ui/im-read/reminder owner，页面层直接 `useWorkspaceStore` 读写已清理，`architecture-boundaries` 已禁止页面/feature 直连 backing store，`store.ts` 仅作内部兼容实现 | 已缓解 |
| RISK-003 | raw DTO 字段兼容散落 | 后端字段变化导致页面异常 | P3/P9 已建 DTO/Domain/ViewModel 合同、contract diagnostics、API fixture 样本和页面/feature 禁止直连 contract normalizer 的架构边界门禁 | 已缓解 |
| RISK-004 | 大页面承载业务规则 | 需求改动回归范围大 | P5/P6 已抽 view model/service，P9 已继续拆消息与客服核心发送、已读、菜单、列表、副作用 hooks，`MessageCenter`、`ChatWorkspace` 已低于 shape 阈值并由 `lint:shape` 防回流 | 已缓解 |
| RISK-005 | Electron token/localStorage 风险 | 敏感信息暴露和会话安全问题 | P8-EL-002 已迁移桌面端 auth session 到 `safeStorage`，浏览器开发环境保留回退 | 已缓解 |
| RISK-006 | 缺少核心链路自动化验证 | 重构靠手工感觉 | P1 起建立测试闭环，P8 已补 `check:quick`、`test:core`、CI workflow、架构边界和文档门禁，P9 已补 `lint:core` 与 `test:coverage:core` hard gate | 已缓解 |
| RISK-007 | 缺少结构化诊断日志 | 出现偶发消息/客服问题时 Codex 无法基于证据排查 | P1-OBS-001 已建立字段规范，P8-EL-006 已形成设置页诊断包导出 | 已缓解 |
| RISK-008 | Windows 打包态尚未实机验证 | 最终用户在 Windows 端，Mac 构建通过不等于 Windows 安装包可发布 | P10-WIN-001 记录为发布前待办，需 Windows 环境执行 dist、启动、托盘、截图、safeStorage、diagnostics、性能采样 | 待处理 |
| RISK-009 | 重构后旧代码和重复实现残留 | 后续新增需求可能继续绕过公共能力，造成维护成本回升 | P10-P19 已完成无用代码、坏味道、职责边界、文件上下文预算和结构守卫治理；`p10:audit`/`p19:audit` 持续报告回流 | 已缓解 |

---

## 21. 第一阶段手工验收记录模板

每完成 P1 任务，需要追加验收记录。

```text
任务编号：
日期：
执行人：
修改范围：

验证命令：
- npm run typecheck：
- npm run test:unit：
- npm run test:browser：

手工验证：
- 普通 IM 当前会话收消息：
- 普通 IM 非当前会话未读更新：
- 自己发送消息 server echo：
- msg.read 已读事件：
- 客服事件未受影响：

诊断日志：
- 是否新增日志：
- 日志入口：
- traceId/correlationId：
- Codex 可检索方式：
- 敏感信息处理：

遗留问题：

是否需要负责人确认：
```

---

## 22. 推进原则

1. 第一阶段不追求目录最终形态，优先追求边界可测试。
2. 不允许为了重构把核心链路一次性改大。
3. 每个 P0/P1 任务必须有回滚点。
4. 新增 Gateway 事件必须先进入 adapter，再进入 handler。
5. 页面组件不得直接解释 Gateway raw payload。
6. 任务完成必须更新矩阵状态。
7. 涉及关键风险点先确认，再执行。
8. P0/P1 核心链路任务必须留下结构化诊断日志或明确说明不新增日志的理由。
