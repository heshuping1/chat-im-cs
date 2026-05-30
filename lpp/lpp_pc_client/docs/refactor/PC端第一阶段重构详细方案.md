# PC 端第一阶段重构详细方案

状态：待执行

日期：2026-05-29

适用范围：`lpp/lpp_pc_client`

关联总纲：[PC端核心架构技术方案.md](./PC端核心架构技术方案.md)

---

## 1. 阶段结论

第一阶段采用“方案 + 小步代码验证”的方式推进，不推倒重来，不重写 PC 客户端，不先拆大页面。

第一阶段目标是建立标准地基，并用一个最小但真实的 Gateway 试点验证地基有效：

```text
公共基础设施
  -> Gateway 事件入口边界
  -> 普通 IM 收消息事件
  -> 未读更新
  -> 测试闭环
```

第一阶段完成后，项目应具备以下能力：

1. Gateway 原始事件不再只能散落在 `GatewayBridge.tsx` 内部处理。
2. 普通 IM 收消息和未读更新具备可测试的 adapter、dispatcher、handler 边界。
3. store、query/cache、API contract 的边界被明确记录，后续迁移有固定入口。
4. `GatewayBridge` 从“实时业务处理中心”降级为“连接生命周期 + 事件装配入口”。
5. 每个任务有验收方式，重构进度可查、可确认、可回滚。

---

## 2. 已确认决策

| 决策项 | 结论 |
| --- | --- |
| 总体优先级 | 可维护性 > 稳定性 > 交付效率 > 扩展性 > 安全工程化 |
| 重构方式 | 保守渐进式，不推倒重来 |
| 治理优先级 | Gateway 实时链路 > 全局状态管理 > API 数据模型 > 大页面组件 |
| 地基顺序 | 公共基础设施 > 统一消息底座 > 普通 IM > 在线客服 |
| 第一阶段范围 | 标准地基 |
| 执行方法 | 方案 + 小步代码验证 |
| 第一轮试点 | Gateway 事件入口 |
| 试点覆盖 | 普通 IM 收消息事件 + 未读更新 |
| 完成标准 | 类型检查 + 单测/集成测试 + 核心链路手工验证 |
| 改造方式 | 局部抽离 `GatewayBridge` |
| 旧代码策略 | 按风险分级保留或删除 |
| 进度确认 | 普通任务直接推进，关键风险点再确认 |
| 文档位置 | `lpp/lpp_pc_client/docs/refactor/` |
| 技术栈评估 | 沿用现有技术栈，但发现不合理技术或新增替代技术时必须先说明理由并确认 |
| 重复造轮子 | 禁止同一能力多处重复实现，优先复用现有模块和成熟库 |
| 公共能力 | 头像、用户展示、时间、空态、错误态、媒体预览、通知等必须逐步抽象为公共能力 |
| 可查性 | 总体方案、总体步骤、任务清单、任务状态必须持续可查 |

---

## 2.1 技术栈合理性评估规则

第一阶段默认不替换核心技术栈。现有技术栈的初步判断如下：

| 技术 | 当前判断 | 第一阶段处理原则 |
| --- | --- | --- |
| Electron | 合理。PC 客服端需要桌面通知、文件、截图、托盘、窗口能力。 | 保留，不在第一阶段调整主进程架构。 |
| React | 合理。当前 UI 已基于 React 构建，生态和团队维护成本可控。 | 保留，重构重点是分层和组件边界。 |
| TypeScript | 合理。IM/客服事件复杂，必须依赖类型合同降低回归风险。 | 强化，禁止核心链路继续 AnyScript 化。 |
| Vite | 合理。开发体验和 Electron renderer 构建足够轻。 | 保留，性能阶段再做 bundle 分析。 |
| React Query | 合理。服务端快照、列表、详情和 Gateway cache patch 都适合由它承接。 | 保留，第一阶段统一 query/cache 边界。 |
| Zustand | 基本合理。适合客户端状态，但当前单 store 职责过宽。 | 保留，但后续按领域拆边界。 |
| SignalR | 合理。后端 Gateway 已采用 SignalR。 | 保留，第一阶段只抽事件入口，不替换连接层。 |

如后续发现某项技术不合理，必须按以下格式提出确认：

```text
技术项：
当前问题：
影响范围：
继续使用的代价：
替代方案：
替代方案代价：
推荐结论：
是否需要负责人确认：
```

新增依赖也必须走同样评估。不得因为“写起来方便”直接引入库，也不得为了“架构漂亮”自研已有成熟方案。

---

## 2.2 公共能力抽象规则

第一阶段虽然主要做 Gateway 试点，但要从一开始建立公共能力治理原则。

公共能力分三类：

| 类型 | 示例 | 推荐位置 |
| --- | --- | --- |
| 纯 UI 能力 | Button、Avatar、EmptyState、ErrorState、Badge、Tooltip | `src/renderer/shared/ui/` |
| 业务实体展示 | 用户头像、会话头像、客服头像、消息发送者、时间展示 | `src/renderer/entities/*/` |
| 业务用例能力 | 发送消息、标记已读、接入客服、关闭会话 | `src/renderer/features/*/application/` |

以头像为例，后续不允许继续在多个页面各自拼：

```text
错误方向：
MessageCenter 自己处理头像 fallback
ChatWorkspace 自己处理头像 fallback
ConversationList 自己处理头像 fallback
CustomerProfile 自己处理头像 fallback

目标方向：
entities/identity 或 shared/ui 提供统一 Avatar 展示能力
业务层只传 identity/displayName/avatarUrl/status
```

公共能力抽象的判断标准：

1. 同一能力出现 2 次，可以暂时记录。
2. 同一能力出现 3 次，必须考虑抽象。
3. 抽象后不能依赖具体页面。
4. 抽象必须服务真实重复，不为未来假想场景过度设计。

---

## 3. 第一阶段范围

### 3.1 包含

第一阶段包含以下工作：

1. 定义 Gateway 事件入口边界。
2. 定义普通 IM Gateway event 类型。
3. 抽出普通 IM 收消息事件 adapter。
4. 抽出未读更新事件 adapter。
5. 抽出 Gateway dispatcher。
6. 抽出普通 IM Gateway handler。
7. 让 `GatewayBridge.tsx` 调用新入口。
8. 为事件解析、事件分发、未读更新补测试。
9. 明确 query/cache 更新规则。
10. 明确 store 拆分原则，但不在第一阶段大拆 store。

### 3.2 不包含

第一阶段明确不做：

1. 不重写 `GatewayBridge.tsx`。
2. 不重写 SignalR 连接生命周期。
3. 不拆 `MessageCenter.tsx` 大页面。
4. 不拆 `ChatWorkspace.tsx` 大页面。
5. 不把在线客服事件全部迁入新入口。
6. 不重构 Electron IPC、安全存储、自动更新。
7. 不调整视觉 UI 和交互体验。
8. 不改变后端接口协议。

### 3.3 可接受的临时状态

第一阶段允许新旧逻辑短期共存，但必须满足：

1. 新入口只覆盖已声明事件，不偷偷接管所有 Gateway 事件。
2. 旧逻辑保留仅用于未迁移事件或回滚。
3. 新入口必须有测试保护。
4. 新旧入口不能对同一个事件重复更新未读数。
5. 临时兼容代码必须在任务矩阵中登记。

---

## 4. 当前问题定位

### 4.1 `GatewayBridge.tsx` 当前职责过重

当前 `src/renderer/components/GatewayBridge.tsx` 同时承担：

1. SignalR connection 创建、启动、重连、关闭。
2. Gateway event name 注册。
3. 原始 payload 解包。
4. 普通 IM 消息识别。
5. 在线客服消息识别。
6. 客服排队、状态、SLA 等事件识别。
7. 强制登出事件处理。
8. React Query cache merge。
9. query invalidate。
10. 未读、已读、回执合并。
11. 通知提醒。
12. 开发环境测试注入。

这导致实时链路存在几个结构性风险：

| 风险 | 说明 |
| --- | --- |
| 不可独立测试 | 事件解析、分发、缓存更新和 React 生命周期耦合。 |
| 修改影响面不清 | 改一个事件名或字段兼容逻辑，可能影响 IM、客服、通知、未读。 |
| 边界无法复用 | 普通 IM 和客服都在 Gateway 中处理，但没有统一事件模型。 |
| 回归成本高 | 需要跑应用才能确认事件变化是否正确。 |
| 大文件持续膨胀 | 新事件继续往 `handleEvent` 中添加分支。 |

### 4.2 `store.ts` 当前状态边界过宽

当前 `src/renderer/data/store.ts` 混合：

1. auth session。
2. workspace active module。
3. IM active conversation。
4. IM local read state。
5. customer service staff status。
6. panel layout width。
7. PC settings。
8. realtime reminders。

第一阶段不会直接大拆 store，但必须定义后续拆分方向，并禁止 Gateway 新模块继续扩大该 store 的职责。

### 4.3 API 和 domain model 边界不足

当前已有 `im-api-contract.ts`、`im-message-normalize.ts`、`im-read-model.ts` 等较好的基础，但它们仍散落在 `data/` 下，并且 Gateway 处理逻辑仍直接依赖多种 DTO 字段兼容。

第一阶段需要把“Gateway raw payload -> typed domain event”的入口立住，让后续逐步把字段兼容从页面和桥接组件迁出。

---

## 5. 第一阶段目标架构

### 5.1 目标数据流

```text
SignalR event name + raw args
  -> GatewayBridge
  -> gateway event adapter
  -> typed gateway event
  -> gateway dispatcher
  -> im gateway handler
  -> query/cache adapter + read model reducer
  -> page observes updated query/store
```

### 5.2 第一阶段目录建议

第一阶段优先在现有结构内低风险落地，不强制一次性迁入 `features/` 目录。建议先新增：

```text
src/renderer/data/gateway/
  gateway-event-types.ts
  gateway-event-adapter.ts
  gateway-dispatcher.ts
  im-gateway-handler.ts
  im-gateway-cache.ts
  gateway-diagnostics.ts

tests/unit/
  gateway-event-adapter.spec.ts
  gateway-dispatcher.spec.ts
  im-gateway-handler.spec.ts
```

后续进入第二阶段时，再评估是否迁移到：

```text
src/renderer/features/messages/infrastructure/gateway/
src/renderer/shared/gateway/
```

第一阶段选择 `data/gateway/` 的原因：

1. 当前代码已经有多个 IM domain/data 文件位于 `src/renderer/data/`。
2. 可以减少 import 路径调整和大规模搬迁。
3. 更符合保守渐进式策略。
4. 等边界稳定后再移动目录，风险更低。

---

## 6. 模块边界设计

### 6.1 `GatewayBridge`

职责：

1. 创建和持有 SignalR connection。
2. 注册 event name。
3. 在收到事件后调用 adapter + dispatcher。
4. 处理 connection start、stop、reconnect、heartbeat。
5. 保留强制登出等全局高优先级事件处理，直到全局 gateway runtime 建立。

禁止：

1. 新增普通 IM payload 字段兼容逻辑。
2. 新增普通 IM cache merge 逻辑。
3. 新增普通 IM 未读计算逻辑。
4. 直接在大段 `if/else` 中扩展已迁移事件。

### 6.2 `gateway-event-adapter`

职责：

1. 接收 `eventName + args`。
2. 解包 `data/Data/payload/Payload`。
3. 判断是否属于第一阶段支持事件。
4. 输出 typed gateway event。
5. 对无法识别或缺失关键字段的事件返回 `ignored` 或 `invalid`。

不负责：

1. 不更新 React Query。
2. 不访问 Zustand。
3. 不触发 UI 通知。
4. 不判断当前页面 active conversation。

建议类型：

```ts
export type GatewayEventKind =
  | "im.message.received"
  | "im.read.received"
  | "ignored"
  | "invalid";

export interface GatewayEventEnvelope {
  eventName: string;
  receivedAt: number;
  rawPayload: Record<string, unknown>;
}

export interface ImMessageReceivedEvent extends GatewayEventEnvelope {
  kind: "im.message.received";
  conversationId: string;
  conversationType: "direct" | "group";
  message: NormalizedGatewayMessage;
}

export interface ImReadReceivedEvent extends GatewayEventEnvelope {
  kind: "im.read.received";
  conversationId: string;
  conversationType: "direct" | "group";
  readerIdentity: GatewayReaderIdentity;
  readSeq: number;
}
```

### 6.3 `gateway-dispatcher`

职责：

1. 接收 typed gateway event。
2. 按 `kind` 分发给 handler。
3. 对 handler 异常做隔离，避免一个 handler 影响整个 Gateway。
4. 记录最低限度诊断信息。

不负责：

1. 不解析后端字段。
2. 不知道 React 组件。
3. 不直接写 store。
4. 不包含业务状态机细节。

### 6.4 `im-gateway-handler`

职责：

1. 处理 `im.message.received`。
2. 处理 `im.read.received`。
3. 调用已有 `im-read-model` reducer。
4. 调用 query/cache adapter 更新会话列表和消息列表。
5. 触发必要 query invalidate。

不负责：

1. 不管理 SignalR connection。
2. 不处理客服事件。
3. 不处理 Electron 通知。
4. 不决定页面布局。

### 6.5 `im-gateway-cache`

职责：

1. 封装 React Query cache key。
2. 封装 message list merge。
3. 封装 conversation list unread/preview 更新。
4. 封装 read event 对 message list 的影响。

不负责：

1. 不解析 Gateway raw payload。
2. 不直接读取 DOM。
3. 不做 UI toast。

---

## 7. 事件范围

### 7.1 第一阶段支持的普通 IM 消息事件

第一阶段支持以下 event name：

```text
msg.new
message.new
message.created
chat.message
chat.message.new
im.message
im.message.new
```

这些事件统一归一为：

```text
im.message.received
```

### 7.2 第一阶段支持的未读/已读事件

第一阶段支持：

```text
msg.read
```

统一归一为：

```text
im.read.received
```

### 7.3 第一阶段明确不迁移的事件

以下事件保持原逻辑：

1. 在线客服消息事件。
2. 在线客服排队事件。
3. 在线客服状态事件。
4. 好友事件。
5. presence 事件。
6. force logout 事件。
7. space notice。
8. recall 事件。

如果试点过程中发现 `msg.recalled` 与普通 IM 未读强相关，可以登记为第一阶段追加任务，但不能临时混入主试点。

---

## 8. 迁移步骤

### 8.1 Step 1：建立事件类型和 adapter

新增：

```text
src/renderer/data/gateway/gateway-event-types.ts
src/renderer/data/gateway/gateway-event-adapter.ts
tests/unit/gateway-event-adapter.spec.ts
```

迁移内容：

1. 从 `GatewayBridge.tsx` 中复制并整理 `eventPayload`、`messageRecord`、`conversationRecord`、`stringField` 等纯函数。
2. 保持函数行为兼容，不在第一步做业务优化。
3. 输出 typed event，而不是直接调用 cache merge。

验收：

1. `msg.new` 可以归一为 `im.message.received`。
2. `message.new` 可以归一为 `im.message.received`。
3. 缺少 conversationId 的消息事件返回 invalid/ignored。
4. `msg.read` 可以归一为 `im.read.received`。
5. 客服消息事件不被误判为普通 IM 消息。

### 8.2 Step 2：建立 dispatcher

新增：

```text
src/renderer/data/gateway/gateway-dispatcher.ts
tests/unit/gateway-dispatcher.spec.ts
```

迁移内容：

1. 定义 handler map。
2. 定义 unknown/ignored/invalid 事件处理规则。
3. handler 抛错时捕获并返回诊断结果。

验收：

1. `im.message.received` 调用 IM handler。
2. `im.read.received` 调用 IM handler。
3. `ignored` 不调用业务 handler。
4. handler 抛错不会中断 dispatcher。

### 8.3 Step 3：抽 IM Gateway handler

新增：

```text
src/renderer/data/gateway/im-gateway-handler.ts
src/renderer/data/gateway/im-gateway-cache.ts
tests/unit/im-gateway-handler.spec.ts
```

迁移内容：

1. 从 `GatewayBridge.tsx` 抽出 `mergeImGatewayMessage` 相关逻辑。
2. 从 `GatewayBridge.tsx` 抽出 `mergeReadEvent` 相关逻辑。
3. 复用已有 `validateGatewayMessageContract`、`reduceImCoreEvent`、`conversationKey`。
4. 对 `QueryClient` 的使用集中到 cache adapter。

验收：

1. 当前会话收到消息后，消息列表 cache 能追加或更新。
2. 非当前会话收到消息后，会话列表 unread 能更新。
3. 自己发送的 server echo 不错误增加未读。
4. `msg.read` 可以更新 peer read 或本地 read state。
5. 缺关键字段的 payload 不污染 cache。

### 8.4 Step 4：接入 `GatewayBridge`

修改：

```text
src/renderer/components/GatewayBridge.tsx
```

迁移内容：

1. `handleEvent` 中第一阶段支持的 IM 事件先走新 adapter/dispatcher。
2. 新入口处理成功后，不再执行旧 IM 分支。
3. 新入口返回 unsupported 时，继续走旧逻辑。
4. 保留其他事件现有处理方式。

验收：

1. 应用启动后 Gateway 连接行为不变。
2. force logout、客服事件、好友事件仍走旧逻辑。
3. 普通 IM 收消息和 `msg.read` 走新入口。
4. 开发环境 `window.__lppTestPushImMessage` 仍可用于 smoke 验证，或登记后续替代方案。

### 8.5 Step 5：补第一阶段测试

测试命令：

```bash
npm run typecheck
npm run test:unit
```

如本机依赖可用，补充：

```bash
npm run test:browser
```

最低测试要求：

1. adapter 单测覆盖字段兼容和非法 payload。
2. dispatcher 单测覆盖分发和异常隔离。
3. handler 单测覆盖消息 cache merge 和 read event。
4. 手工验证普通 IM 收消息和未读更新。

---

## 9. 验收标准

### 9.1 第一阶段整体验收

第一阶段完成必须满足：

| 项 | 标准 |
| --- | --- |
| 类型检查 | `npm run typecheck` 通过 |
| 单元测试 | `npm run test:unit` 通过 |
| 核心手工验证 | 普通 IM 收消息、非当前会话未读、当前会话不误增未读通过 |
| 行为保持 | 未迁移的客服、好友、force logout、presence 事件不改变行为 |
| 旧代码策略 | 已迁移逻辑不再从旧分支重复执行 |
| 文档同步 | 任务矩阵状态、风险、后续项更新 |

### 9.2 Gateway 试点增强验收

Gateway 试点至少覆盖以下测试用例：

| 用例 | 预期 |
| --- | --- |
| `msg.new` 标准 payload | 生成 `im.message.received` |
| `message.new` 嵌套 `data` payload | 正确解包 |
| 缺 conversationId | 返回 invalid/ignored，不更新 cache |
| 客服 `temp_session.message` | 不进入普通 IM handler |
| 非当前会话新消息 | unread 增加，会话 preview 更新 |
| 当前会话新消息 | 消息列表更新，不错误增加 unread |
| 自己发送的 server echo | 不错误增加 unread |
| `msg.read` | read model 更新 |
| handler 抛错 | dispatcher 捕获，Gateway 不崩 |

---

## 10. 回滚策略

第一阶段必须支持局部回滚。

### 10.1 代码回滚

如果新 Gateway 入口出现问题：

1. 在 `GatewayBridge.tsx` 中关闭新 adapter/dispatcher 调用。
2. 恢复第一阶段 IM 事件走旧分支。
3. 保留新增测试和类型文件，作为后续修正依据。

### 10.2 逻辑回滚

新入口必须具备单点接入位置：

```text
GatewayBridge.handleEvent
  -> tryHandleGatewayEvent(...)
  -> handled ? return : legacy branch
```

这样可以做到：

1. 新入口失败时只影响已迁移事件。
2. unsupported 事件继续走旧逻辑。
3. 不需要回滚整个 `GatewayBridge`。

### 10.3 文档回滚

如果试点证明设计不适合当前代码：

1. 更新本方案的“试点结论”。
2. 更新任务矩阵状态为“阻塞/调整”。
3. 记录不适配原因和替代方案。

---

## 11. 风险与控制

| 风险 | 控制方式 |
| --- | --- |
| 新旧逻辑重复处理同一事件 | 新入口 handled 后必须 return，测试覆盖重复更新场景。 |
| 客服消息误判为普通 IM | adapter 明确排除客服事件和 `temp_session` 标记。 |
| 未读数变化不一致 | handler 复用 `im-read-model`，避免重写规则。 |
| cache key 不一致 | 第一阶段统一引用现有 query key 或封装 cache adapter。 |
| GatewayBridge 改动过大 | 只改接入点和迁移分支，不重写连接生命周期。 |
| 测试依赖 React Query 复杂 | cache adapter 支持传入独立 `QueryClient` 构造测试。 |
| 试点拖成大重构 | 第一阶段明确不拆页面、不迁移客服事件。 |

---

## 12. 关键风险点确认规则

以下动作执行前需要和项目负责人确认：

1. 删除旧 Gateway 分支。
2. 改变普通 IM 未读计算规则。
3. 改变 query key。
4. 改变 `AuthSession` 结构。
5. 改变 store 持久化 key。
6. 把客服事件纳入新 Gateway 入口。
7. 修改 Electron preload 或 main 进程安全策略。
8. 替换现有核心技术栈或新增重型依赖。
9. 对已有成熟库能力进行自研替代。
10. 将公共能力抽象到会影响多个业务模块的位置。

以下动作可按方案直接推进：

1. 新增 Gateway 类型文件。
2. 新增 adapter/dispatcher/handler。
3. 为新模块补单测。
4. 抽出纯函数。
5. 在不改变行为的前提下调整 import。
6. 更新任务矩阵状态。

---

## 13. 第一阶段完成后的下一步

第一阶段完成后，进入复盘，而不是立刻扩大范围。

复盘问题：

1. 新 Gateway 入口是否真的降低了 `GatewayBridge` 复杂度？
2. 事件 adapter 是否足够稳定，能否扩展到客服事件？
3. cache adapter 是否暴露出 query key 混乱问题？
4. store 是否已经成为下一阶段最大阻塞？
5. 测试是否能发现未读和消息重复问题？

如果答案成立，第二阶段建议进入：

```text
Store 边界治理
```

第二阶段完成后，再进入 API DTO/Domain/ViewModel 合同治理。
如果 Gateway 试点收益明显，也可以把“客服 Gateway 消息事件 + 客服线程状态事件”登记为后续在线客服阶段的前置调研，但不直接插入第一阶段。

```text
客服 Gateway 消息事件 + 客服线程状态事件
```

---

## 14. Definition of Done

第一阶段任务完成必须同时满足：

1. 有明确文件变更范围。
2. 有对应任务编号。
3. 有测试或手工验证记录。
4. 没有新增 `any` 作为核心类型逃逸。
5. 没有把新业务逻辑继续堆进 `GatewayBridge.tsx`。
6. 没有让页面组件直接解释 Gateway raw payload。
7. 没有改变未声明链路的行为。
8. 文档和任务矩阵已同步。
9. 如涉及技术选型或新增依赖，已有评估记录和负责人确认。
10. 如发现重复实现，已登记公共能力抽象任务或完成抽象。
11. 任务状态、验收结果、遗留问题已更新到任务矩阵。

---

## 15. 第一阶段任务执行要求

第一阶段每个 Gateway 试点任务除满足任务矩阵通用要求外，还必须满足以下要求：

| 任务 | 必带要求 |
| --- | --- |
| `P1-GW-001` | 只定义类型，不引入 React、QueryClient、Zustand，不提前实现业务处理。 |
| `P1-GW-002` | adapter 只做 raw payload 解包、字段归一、事件分类，不更新 cache/store/UI。 |
| `P1-GW-003` | dispatcher 只做 typed event 分发和异常隔离，不解析后端字段。 |
| `P1-GW-004` | cache adapter 只封装 query/cache 更新，不接收 raw Gateway payload。 |
| `P1-GW-005` | handler 只处理普通 IM 收消息和 `msg.read`，不接入客服事件。 |
| `P1-GW-006` | `GatewayBridge` 只新增新入口装配，unsupported 事件继续走旧逻辑，连接生命周期不重写。 |
| `P1-GW-007` | 开发测试入口不得暴露到生产环境，优先走新 adapter/handler。 |
| `P1-INF-001` | query/cache 规则必须引用或收敛现有 query key，不临时新建平行 key。 |
| `P1-INF-002` | 诊断默认不打扰用户，生产环境不刷屏，错误原因可用于调试。 |
| `P1-INF-003` | 不替换核心技术栈，只记录评估和后续确认流程。 |
| `P1-SHARED-001` | 只建立公共能力登记规则，不在第一阶段展开 UI 体系大重构。 |
| `P1-ST-001` | 只记录 store 拆分边界，不在第一阶段大拆 store。 |
| `P1-TEST-001` | 至少覆盖 adapter、dispatcher、handler 的单测和核心链路手工验证记录。 |

第一阶段尤其禁止：

1. 借 Gateway 试点重写 SignalR 连接层。
2. 借 Gateway 试点拆 `MessageCenter` 或 `ChatWorkspace`。
3. 把客服事件混入第一轮普通 IM 试点。
4. 为了测试方便引入未评估的新依赖。
5. 在页面组件中补写 Gateway 字段兼容逻辑。

---

## 16. 执行摘要

第一阶段只做一件核心事情：

```text
把普通 IM 收消息和未读更新从 GatewayBridge 的大分支里抽出来，
形成可测试、可扩展、可回滚的 Gateway 事件入口。
```

这一步不是最终架构，但它是后续重构能否有序推进的地基。
