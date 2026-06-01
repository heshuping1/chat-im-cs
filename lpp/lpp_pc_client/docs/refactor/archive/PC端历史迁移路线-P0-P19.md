# PC 端历史迁移路线 P0-P19

状态：归档参考

来源：从 `PC端核心架构技术方案.md` 拆出，供追溯历史路线和旧阶段计划时读取。

适用范围：P0-P19 历史迁移路线、历史推荐任务和旧执行表。

---

## 14. 迁移路线

### 阶段 0：基线审计与方案冻结

目标：

- 本文档成为 PC 重构主依据。
- 明确 `03-技术方案.md` 不再承担 PC 主架构职责。
- 梳理当前已有专项方案、当前代码状态、技术栈合理性、已有公共能力。
- 冻结阶段路线、任务矩阵、验收规则和关键风险确认规则。

产出：

- `docs/refactor/PC端核心架构技术方案.md`
- `docs/refactor/PC端第一阶段重构详细方案.md`
- `docs/refactor/PC端重构任务矩阵.md`
- 后续可补 ADR：`ADR-PC-001: Adopt layered feature architecture for PC client`

验收：

- 技术栈评估规则明确。
- 不重复造轮子和公共能力治理规则明确。
- 总体方案、总体步骤、任务清单、任务状态均可查。

### 阶段 1：标准地基 + Gateway 试点

目标：

- 建立 Gateway 事件入口边界。
- 建立 typed event、adapter、dispatcher、handler 的最小闭环。
- 第一轮只覆盖普通 IM 收消息事件和未读更新。
- 形成类型检查、单测/集成测试、核心链路手工验证闭环。

新增模块：

```text
src/renderer/data/gateway/gateway-event-types.ts
src/renderer/data/gateway/gateway-event-adapter.ts
src/renderer/data/gateway/gateway-dispatcher.ts
src/renderer/data/gateway/im-gateway-handler.ts
src/renderer/data/gateway/im-gateway-cache.ts
```

验收：

- 普通 IM 新消息进入消息 cache。
- 非当前会话未读更新。
- `msg.read` 更新 read model。
- temp_session/客服消息不进入普通 IM handler。
- `GatewayBridge` 保留连接生命周期，业务处理开始迁出。

### 阶段 2：Store 边界治理

目标：

- 拆分全局 Zustand store 的职责边界。
- auth、ui layout、settings、IM read、CS status、realtime reminders 不再混在单一 workspace store 中持续扩张。
- 保持持久化 key 迁移可控。

迁移顺序：

1. auth session 边界。
2. settings store/service。
3. workspace-ui store。
4. im-read state/repository。
5. customer-service status store。
6. realtime reminders store。

验收：

- 登录、切换模块、IM 当前会话、客服状态、设置持久化行为保持不变。
- Gateway 新模块不再扩大旧 store 职责。
- 每个 store 有明确 owner 和持久化边界。

### 阶段 3：API 合同与数据模型治理

目标：

- 建立 DTO -> Domain -> ViewModel 的固定路径。
- 普通 IM、在线客服、联系人、媒体接口字段依赖可查。
- 页面不直接解释服务端脏字段。

迁移顺序：

1. 普通 IM 会话列表合同。
2. 普通 IM 消息列表合同。
3. 普通 IM 写接口合同。
4. 客服线程列表/详情合同。
5. Gateway payload 合同。
6. API error model 和用户可见错误映射。

验收：

- 字段缺失、降级、阻断规则明确。
- 页面拿到 ViewModel，而不是 raw DTO。
- 关键接口有合同测试或 fixture。

### 阶段 4：统一消息底座

目标：

- 统一 message、conversation、read model、media、send queue。
- 让普通 IM 和在线客服共享底层消息能力，但保留各自业务状态机。
- 避免消息展示、媒体、发送状态在两个业务中重复实现。

迁移顺序：

1. `entities/message`
2. `entities/conversation`
3. `entities/media`
4. `features/messages/application/sendMessage`
5. `features/messages/application/applyRealtimeEvent`
6. `features/messages/infrastructure/messagesCache`

验收：

- local echo、server echo、sending、sent、failed、retry 状态一致。
- readSeq/localRead/peerRead 规则可测试。
- 媒体消息展示和上传状态可复用。

### 阶段 5：普通 IM 页面瘦身

目标：

- `MessageCenter` 抽出 view model 和 application service。
- 会话列表、消息列表、composer、菜单、转发、群成员、资料面板逐步从大页面迁出。
- 普通 IM 作为统一消息底座的第一条完整验证链路。

迁移顺序：

1. `useMessageCenterViewModel`
2. `ConversationListContainer`
3. `MessageListContainer`
4. `MessageComposerContainer`
5. `MessageActions`
6. `ConversationInfoPanel`

验收：

- 普通 IM 已读测试通过。
- 图片/文件发送测试通过。
- 转发/撤回/删除/收藏 refetch 一致。
- `MessageCenter` 不再直接拥有复杂 cache merge。
- 页面只负责装配和交互，不解释 Gateway raw payload。

### 阶段 6：在线客服核心重构

目标：

- `ChatWorkspace` 和 `ThreadList` 使用 customer-service core。
- 接入、接管、关闭、终态只读、未读提醒统一状态机。
- 客服 Gateway 消息事件和线程状态事件进入 typed event。

迁移顺序：

1. `customer-service/domain/threadState`
2. `customer-service/domain/threadPermission`
3. `customer-service/application/applyThreadSnapshot`
4. `customer-service/application/sendCustomerServiceMessage`
5. `customer-service/infrastructure/customerServiceCache`
6. `customer-service/presentation/ChatWorkspacePage`

验收：

- queued 只能接入不能发消息。
- AI 接待只能人工接管不能直接发。
- active 可发消息。
- closed/history 只读。
- 当前会话消息不产生全局未读。

### 阶段 7：公共能力与 UI 体系收敛

目标：

- 收敛头像、用户展示、时间、空态、错误态、badge、媒体预览、上传状态、通知提醒。
- 已有 `PcAvatar` 等能力优先复用和升级，不重复造轮子。
- `app.css` 中可按业务归属拆分的样式逐步迁出。

迁移顺序：

1. 公共能力清单和重复实现登记。
2. Avatar/Identity 展示统一。
3. EmptyState/ErrorState/Badge 统一。
4. Message media preview 统一。
5. Feature style 分层。

验收：

- 同一公共能力不再多处重复实现。
- 公共组件不依赖具体业务页面。
- 视觉和交互行为保持一致。

### 阶段 8：Electron 安全、性能与工程门禁

目标：

- 截图 overlay 安全化。
- IPC payload 校验。
- token 存储迁移设计落地。
- 媒体 URL 和本地文件能力收紧。
- 消息列表虚拟化、包体分析、启动性能、lint/format/coverage/audit/CI 门禁落地。

优先文件：

```text
src/main/main.ts
src/main/media-storage.ts
src/preload/preload.cts
src/shared/desktop-api.ts
src/renderer/shared/ipc/
package.json
vite.config.ts
tests/unit/*
tests/browser/*
```

验收：

- renderer 无新增 Node 能力。
- screenshot overlay 禁用 nodeIntegration。
- 不允许打开任意本地路径。
- 诊断包不含 token。
- 1000 条消息滚动稳定。
- 500 会话列表筛选不卡顿。
- 多图片会话不明显阻塞首屏。
- 首屏 chunk 可解释。
- `npm run typecheck`、`npm run test:unit`、`npm run build`、browser smoke tests 通过。

---

---

## 19. 推荐下一步

下一步不应该继续泛泛审计，而应按本文档进入执行：

1. 以本文档和任务矩阵冻结 PC 端 0-8 阶段路线。
2. 执行第一阶段详细方案：标准地基 + Gateway 试点。
3. 第一轮只覆盖普通 IM 收消息事件和未读更新，形成测试闭环。
4. 阶段结束后更新任务状态、验收记录和后续阶段风险。

第一轮建议任务：

```text
重构 GatewayBridge：
1. 新增 data/gateway gateway-event-types。
2. 新增 gateway-event-adapter。
3. 新增 gateway-dispatcher。
4. 新增 im-gateway-handler 和 im-gateway-cache。
5. 为 adapter/dispatcher/handler 写单测。
6. GatewayBridge 只保留连接生命周期和新入口装配。
```

这一刀风险低、收益高，能把实时主链路从组件大分支中拆出第一道可测试边界，并为后续 Store、API、消息底座、`MessageCenter` 和 `ChatWorkspace` 重构打基础。

---

---

## 23. 迁移执行任务表

本表把第 14 节路线变成可执行任务。每个任务应单独提交或形成独立 PR，避免把重构和功能扩展混合。

| 阶段 | 任务 | 主要文件 | 测试 | 完成标准 |
| --- | --- | --- | --- | --- |
| 0 | 冻结方案与任务矩阵 | `docs/refactor/*` | 文档审查 | 总体方案、步骤、任务、状态可查。 |
| 1 | 抽 Gateway event 类型 | `data/gateway/gateway-event-types.ts` | unit | 第一阶段 typed event 有稳定类型。 |
| 1 | 抽 Gateway adapter | `data/gateway/gateway-event-adapter.ts` | adapter unit | 多种普通 IM 消息事件归一为同一 typed event。 |
| 1 | 抽 Gateway dispatcher | `data/gateway/gateway-dispatcher.ts` | unit | handler 分发和异常隔离可测。 |
| 1 | 抽 IM gateway handler/cache | `data/gateway/im-gateway-*.ts` | unit/integration | 普通 IM 收消息和未读更新走新入口。 |
| 2 | 拆 auth/settings/ui/read/reminder 边界 | `data/store.ts`、新 store/service | unit + smoke | 全局 store 职责收敛。 |
| 3 | 建 API 合同矩阵 | `data/api/*`、contract tests | unit/contract | 页面不直接解释 raw DTO。 |
| 4 | 建统一消息底座 | `entities/message`、`features/messages/application` | unit | message/read/media/send queue 规则可复用。 |
| 5 | 抽 MessageCenter view model | `features/messages/presentation/*` | unit + browser | 普通 IM 页面退回装配职责。 |
| 6 | 抽客服 thread domain/cache/actions | `features/customer-service/*` | unit + browser | 客服状态机和动作权限稳定。 |
| 7 | 收敛公共能力 | `shared/ui`、`entities/*` | visual smoke | 头像、空态、错误态、媒体预览等不重复实现。 |
| 8 | IPC、安全、性能和工程门禁 | `main/*`、`preload/*`、`package.json` | unit/manual/perf | Electron 安全、性能预算、lint/coverage/CI 落地。 |

### 23.1 第一轮推荐任务定义

第一轮只做 Gateway 事件入口试点，不动 UI 大结构：

1. 新增 `src/renderer/data/gateway/gateway-event-types.ts`。
2. 新增 `src/renderer/data/gateway/gateway-event-adapter.ts`。
3. 新增 `src/renderer/data/gateway/gateway-dispatcher.ts`。
4. 新增 `src/renderer/data/gateway/im-gateway-handler.ts`。
5. 新增 `src/renderer/data/gateway/im-gateway-cache.ts`。
6. 为 adapter/dispatcher/handler 增加单元测试。
7. `GatewayBridge` 改为优先调用新入口，unsupported 事件继续走旧逻辑。

第一轮不做：

- 不拆 `MessageCenter`。
- 不重写 `ChatWorkspace`。
- 不引入虚拟列表。
- 不改视觉。
- 不改服务端 API。

---
