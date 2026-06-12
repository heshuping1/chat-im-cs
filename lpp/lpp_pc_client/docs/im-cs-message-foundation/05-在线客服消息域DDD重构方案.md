# 在线客服消息域 DDD 重构方案

日期：2026-06-13

状态：当前有效方案

## 1. 结论

本方案只重构在线客服消息域，不改 IM。

IM 当前发送体验和消息确认语义已经成立，不能为了修在线客服问题去动 IM。在线客服需要做的是：在自己的边界内补齐 `CustomerServiceMessageDomain`，让在线客服消息发送语义对齐 IM 的顶级模型。

最终目标：

```text
用户点发送
-> local echo 立即显示真实内容
-> HTTP ack 只确认本地消息
-> Gateway/detail 只做幂等同步
-> UI 只渲染稳定 projection
```

必须禁止：

```text
ack/Gateway/detail 的空 body 或 [Message] 覆盖本地正文
同一条自发消息被 append 成多条
UI 或 cache adapter 自己判断消息合并业务规则
```

## 2. 问题判断

### 2.1 为什么自己发送的消息也会出错

自己发送的消息不是只存在于 UI 组件内部。在线客服窗口渲染的是详情消息缓存：

```text
CustomerServiceMessageStage
-> messages prop
-> React Query thread detail cache
```

发送后，本地 echo、HTTP ack、Gateway self echo、detail refetch 都可能写同一份消息缓存。

如果后续入口返回：

```ts
{
  body: {},
  preview: "[Message]"
}
```

且缓存层允许它覆盖或追加，就会出现：

```text
本地真实文本
-> 被 ack 覆盖成 [Message]
-> Gateway 又 append 一条 [Message]
-> detail refetch 再 append/覆盖一条 [Message]
```

所以问题不是“自己发送为什么还要经过这么多入口才显示”。正确设计下，它不应该等这些入口才显示。它应该 local echo 立即显示，后续入口只能确认或同步。

### 2.2 这是不是过度复杂

不是业务复杂度本身错了。聊天系统天然需要：

- local echo：保证发送后立即可见。
- HTTP ack：获得服务端 `messageId`、`conversationSeq`、`sentAt`。
- Gateway：保证多端、多窗口、工作台和监管视图实时同步。
- detail refetch：保证断线重连、状态修正和最终一致。

真正的问题是复杂度放错了层：

```text
必要复杂度：多入口同步
错误位置：多个入口直接写 messages cache
正确位置：统一进入 CustomerServiceMessageDomain reducer
```

### 2.3 为什么 IM 没有同类问题

IM 的发送确认语义更成熟：

```text
composer body 是正文事实
local echo 是展示事实
server ack 是确认事实
Gateway/detail 是同步事实
```

IM 的确认流程是：

```text
local_created
-> send_confirmed
-> 用服务端 ID/seq/time 确认本地消息
-> 不用空 ack 覆盖正文
```

在线客服的问题是：复用了消息 UI 和消息 DTO，但没有完整复用“消息发送确认语义”。它把客服会话业务、消息合并、列表 preview、Gateway、detail refetch 混在 `cs-cache-adapter` 里，导致多个入口都能影响最终视图。

## 3. DDD 边界设计

### 3.1 不动 IM

本次重构不修改：

- IM 发送 controller。
- IM message cache mutation model。
- IM message core reducer。
- IM UI 组件。
- IM API normalizer。

在线客服可以参考 IM 的顶级语义，但不能通过改 IM 来修客服。

### 3.2 保留两个业务域

IM 和在线客服可以有两个业务域：

```text
IM Conversation Domain
Customer Service Session Domain
```

这是合理的，因为它们的业务对象不同。

IM 关注：

- direct/group conversation
- member
- read receipt
- normal chat conversation list

在线客服关注：

- thread/session
- 排队
- 接待
- 转接
- 关闭
- 分配客服
- SLA
- 只读权限

### 3.3 不能有两套消息发送语义

不合理的是在线客服另造一套不一致的消息发送模型。

统一原则：

```text
业务会话域可以不同
消息发送确认语义必须一致
```

在线客服需要新增自己的客服消息子域：

```text
CustomerServiceMessageDomain
```

它只管客服消息生命周期，不管客服会话状态。

## 4. 目标模型

### 4.1 Bounded Context

```text
CustomerServiceSession Domain
  负责 thread/session 业务状态

CustomerServiceMessage Domain
  负责客服消息生命周期

CustomerServiceMessage Anti-Corruption Layer
  负责 API/Gateway/detail 原始数据归一化

CustomerServiceMessage Projection
  负责给 UI 和 React Query cache 提供稳定消息视图
```

### 4.2 CustomerServiceSession Domain 职责

负责：

- 排队状态。
- 接待状态。
- 转接状态。
- 关闭状态。
- 分配客服。
- 只读权限。
- SLA。
- 会话列表分组。

不负责：

- 消息正文合并。
- preview 是否有效。
- ack 是否能覆盖本地消息。
- Gateway/detail 是否同一条消息。
- append/replace/ignore 决策。

### 4.3 CustomerServiceMessage Domain 职责

负责：

- local echo。
- send ack 确认。
- send failed。
- Gateway 消息合并。
- detail refetch 消息合并。
- 消息身份匹配。
- body 保真。
- preview 派生。
- 重复消息消除。
- 最终 messages projection。

### 4.4 UI 职责

UI 只允许：

- 渲染消息气泡。
- 渲染发送状态。
- 渲染已读状态。
- 渲染上传进度。
- 渲染菜单和操作。

UI 禁止：

- 判断 `[Message]` 是否有效。
- 修复 `body`。
- 合并消息。
- 判断 ack/Gateway/detail 来源。
- 去重。
- 根据来源修 preview。

## 5. 领域事件模型

在线客服所有入口必须先转成领域事件，再进入 reducer。

```ts
type CustomerServiceMessageEvent =
  | {
      type: "cs.message.local_created";
      message: CustomerServiceMessage;
    }
  | {
      type: "cs.message.send_ack_received";
      ack: CustomerServiceSendAck;
    }
  | {
      type: "cs.message.gateway_received";
      message: CustomerServiceIncomingMessage;
    }
  | {
      type: "cs.message.detail_synced";
      messages: CustomerServiceIncomingMessage[];
    }
  | {
      type: "cs.message.send_failed";
      localMessageId: string;
      reason: string;
      failedAt: number;
    }
  | {
      type: "cs.message.recalled";
      messageId: string;
    };
```

入口映射：

| 入口 | 领域事件 |
| --- | --- |
| 点击发送，创建本地 echo | `cs.message.local_created` |
| HTTP 发送成功 | `cs.message.send_ack_received` |
| HTTP 发送失败 | `cs.message.send_failed` |
| Gateway 收到客服消息 | `cs.message.gateway_received` |
| 详情接口刷新 | `cs.message.detail_synced` |
| 撤回/删除 | `cs.message.recalled` |

## 6. 身份匹配规则

领域层唯一负责判断“是不是同一条消息”。

匹配优先级：

```text
1. clientMsgId / clientMessageId
2. messageId
3. conversationId + conversationSeq
4. localMessageId
```

决策：

| 匹配结果 | 决策 |
| --- | --- |
| 命中 `clientMsgId` | confirm/replace 本地消息 |
| 命中 `messageId` | merge |
| 命中 `conversationId + conversationSeq` | merge |
| 只命中 `localMessageId` | merge 本地态 |
| 全部未命中 | append |

自发消息必须带稳定 `clientMsgId`，贯穿：

```text
local echo
HTTP request
HTTP ack
outbox
Gateway self echo
detail refetch
```

## 7. 内容保真规则

### 7.1 自发消息的事实来源

对自己发送的消息：

```text
composer body 是正文事实
local echo 是展示事实
server ack 是确认事实
Gateway/detail 是同步事实
```

所以 ack 不能因为自己返回了空 body 就覆盖正文。

### 7.2 body 合并规则

| 当前消息 | incoming 消息 | 结果 |
| --- | --- | --- |
| `body.text` 非空 | incoming `body.text` 空 | 保留当前正文 |
| `body.text` 非空 | incoming `body: {}` | 保留当前正文 |
| `body.text` 空 | incoming `body.text` 非空 | 使用 incoming 正文 |
| 媒体本地预览存在 | incoming 媒体 body 为空 | 保留本地预览 |
| incoming 有服务端媒体 URL | 当前是本地预览 | 合并服务端 URL，保留必要本地预览 |

### 7.3 preview 合并规则

`[Message]` / `[消息]` 对 text 消息视为无效 preview。

| 当前 preview | incoming preview | 结果 |
| --- | --- | --- |
| 真实文本 | 空 | 保留当前 |
| 真实文本 | `[Message]` / `[消息]` | 保留当前 |
| 空 | 真实文本 | 使用 incoming |
| 空 | `[Message]` / `[消息]` | 从 body 派生；派生失败则为空 |
| 媒体消息 | 媒体占位符 | 按媒体类型生成标准 preview |

### 7.4 服务端权威字段

以下字段可以由 ack/Gateway/detail 补齐或覆盖：

- `messageId`
- `conversationId`
- `conversationSeq`
- `sentAt`
- `serverTime`
- `readAt`
- `readCount`
- `isRead`
- `status` 中的服务端终态
- sender 标识字段

以下字段不能被空值或占位符覆盖：

- `body.text`
- 真实 `preview`
- 本地媒体预览
- `clientMsgId`
- `localTaskId`
- `localSendStartedAt`
- 上传状态中的必要本地字段

## 8. Anti-Corruption Layer

新增在线客服消息防腐层：

```text
src/renderer/data/customer-service/message-domain/cs-message-normalizer.ts
```

输入来源：

- HTTP send ack。
- Gateway payload。
- detail response。
- history response。

输出类型：

```ts
type CustomerServiceIncomingMessage = {
  source: "gateway" | "detail" | "history";
  message: CustomerServiceMessage;
  contractIssues: CustomerServiceMessageContractIssue[];
};

type CustomerServiceSendAck = {
  source: "http";
  clientMsgId?: string;
  localMessageId?: string;
  serverMessage?: CustomerServiceMessage;
  serverFields: CustomerServiceServerFields;
  contractIssues: CustomerServiceMessageContractIssue[];
};
```

防腐规则：

- text 消息的 `[Message]` / `[消息]` 视为 empty preview。
- 空 `body` 不等于有效 body。
- 缺 `clientMsgId` 要记录 contract issue。
- 缺 `messageId` / `conversationSeq` 要降级，但不能污染已有 projection。
- 原始 DTO 不允许直接进入 projection。

## 9. Projection 与 Cache Adapter

### 9.1 目标分工

```text
CustomerServiceMessageReducer
-> CustomerServiceMessageProjection
-> cs-cache-adapter 写 React Query
-> UI 渲染
```

`cs-cache-adapter` 不再决定：

- preview 是否有效。
- body 是否覆盖。
- 是否同一条消息。
- append/replace/ignore。

它只负责：

- 写 React Query。
- 更新 thread lastMessagePreview。
- 更新未读数。
- 清理 IM dirty conversation cache。
- 派发已有诊断日志。

### 9.2 reducer 输出

```ts
type CustomerServiceMessageReduceResult = {
  messages: CustomerServiceMessage[];
  changedMessage?: CustomerServiceMessage;
  decision: "append" | "replace" | "ignored";
  matchedBy: "clientMsgId" | "messageId" | "conversationSeq" | "localMessageId" | "none";
  diagnostics: CustomerServiceMessageMergeDiagnostic[];
};
```

## 10. 发送链路重构

目标流程：

```text
create local identity
create local message from composer body
dispatch local_created
send HTTP async
on success dispatch send_ack_received
on failure dispatch send_failed
```

HTTP ack 不能直接构造最终展示消息。

ack 只允许补：

- `messageId`
- `conversationId`
- `conversationSeq`
- `sentAt`
- `serverTime`
- read fields
- server status

正文仍来自 local message，除非 ack 明确返回有效 `body.text`。

## 11. Gateway 与 Detail 重构

### 11.1 Gateway

```text
raw Gateway payload
-> anti-corruption normalizer
-> cs.message.gateway_received
-> reducer
-> projection
```

Gateway self echo 必须能和本地 echo / HTTP ack 合并，不能生成第二条自发消息。

### 11.2 Detail Refetch

```text
detail response messages
-> anti-corruption normalizer
-> cs.message.detail_synced
-> reducer
-> projection
```

`detail_synced` 不能简单替换当前 messages。

它必须：

- 逐条 merge。
- 保留本地 pending/sending/failed。
- 保留已有真实正文。
- 补齐服务端权威字段。
- 只有服务端明确 recalled/deleted 时才删除。

## 12. 建议目录结构

```text
src/renderer/data/customer-service/message-domain/
  cs-message-types.ts
  cs-message-identity.ts
  cs-message-preview.ts
  cs-message-normalizer.ts
  cs-message-merge-policy.ts
  cs-message-reducer.ts
  cs-message-projection.ts
  cs-message-diagnostics.ts
```

职责：

| 文件 | 职责 |
| --- | --- |
| `cs-message-types.ts` | 领域类型 |
| `cs-message-identity.ts` | 身份匹配 |
| `cs-message-preview.ts` | preview 派生和占位符识别 |
| `cs-message-normalizer.ts` | API/Gateway/detail 防腐 |
| `cs-message-merge-policy.ts` | body/preview/server field 合并规则 |
| `cs-message-reducer.ts` | 领域事件 reducer |
| `cs-message-projection.ts` | 输出 UI/cache 可消费 projection |
| `cs-message-diagnostics.ts` | 审计日志适配 |

## 13. 分阶段落地

### Phase 1：建立领域层，不改 UI

- 新增 `customer-service/message-domain`。
- 实现 identity matcher。
- 实现 preview/body merge policy。
- 实现 reducer。
- 单测覆盖 `[Message]`、空 body、重复 self echo。

### Phase 2：发送链路接入领域事件

改造：

- `appendCustomerServiceLocalMessage`
- `mergeSentCustomerServiceMessage`
- `useCustomerServiceSendController`

要求：

- local echo 立即显示真实正文。
- ack 只确认本地消息。
- 失败只更新状态，不删除正文。

### Phase 3：Gateway/detail 接入领域事件

改造：

- `applyCustomerServiceGatewayMessageCache`
- `mergeLoadedCustomerServiceThreadDetail`
- Gateway adapter 到客服消息 normalizer 的调用。

要求：

- Gateway self echo 幂等。
- detail refetch 不覆盖真实正文。
- detail refetch 不清理 pending/failed 本地消息。

### Phase 4：收窄 cache adapter 职责

- 移除 `cs-cache-adapter` 内部消息合并判断。
- 保留 React Query 写入和客服会话列表同步。
- 列表 preview 从 reducer 输出的 changed message 派生。

### Phase 5：回归和合同治理

- 用 `cs.message.audit` 验证各入口。
- 梳理服务端合同缺口。
- 对刷新后仍出现 `[Message]` 的接口标记后端必修。

## 14. 必测场景

### 14.1 自发文本消息

- 连续发送 5 条文本，气泡全部显示真实文本。
- ack 返回 `body: {}` + `preview: "[Message]"`，不能覆盖本地正文。
- Gateway self echo 返回 `[Message]`，不能新增第二条。
- detail refetch 返回 `[Message]`，不能覆盖本地正文。

### 14.2 身份缺失降级

- ack 无 `clientMsgId` 但有 `messageId`，可合并。
- Gateway/detail 无 `clientMsgId` 但有 `conversationSeq`，可合并。
- 三种身份都缺失时，只允许 append，并记录 contract issue。

### 14.3 发送失败

- HTTP 失败时，本地消息保留。
- 状态变 failed。
- 支持重试。
- 失败消息不会被 detail refetch 清掉。

### 14.4 媒体消息

- 图片本地预览不被空 ack 清掉。
- 视频 poster 不被 detail 空 body 清掉。
- 文件名和大小不被空 ack 清掉。
- 服务端 URL 到达后补齐，不重复。

### 14.5 客服会话状态

- 转接后只读逻辑不受影响。
- 关闭后只读逻辑不受影响。
- 会话列表最后消息 preview 使用合并后的真实消息。
- 未读数和当前打开会话读状态不受消息域迁移影响。

## 15. 验收标准

代码层：

- 在线客服消息合并规则集中在 `CustomerServiceMessageDomain`。
- UI 不包含 `[Message]` 判断。
- `cs-cache-adapter` 不包含 body/preview 覆盖策略。
- raw API/Gateway/detail DTO 不直接进入最终 projection。

行为层：

- 自己发送的消息 local echo 立即显示。
- ack/Gateway/detail 后消息仍是同一条。
- 空 body / `[Message]` 不能覆盖真实正文。
- 发送失败只改变状态，不丢正文。
- 刷新详情后仍正确；若不正确，必须能通过诊断定位到后端合同缺字段。

测试层：

- `npm.cmd run typecheck` 通过。
- 客服消息领域 reducer 单测通过。
- 客服发送链路单测通过。
- Gateway/detail 合并单测通过。
- 现有 IM 测试不修改、不降低覆盖。

## 16. 服务端合同要求

最终完整合同要求：

`POST /customer-service/workbench/threads/{threadType}/{threadId}/messages` 成功响应必须返回 canonical message。

text 消息至少包含：

- `messageId`
- `clientMsgId`
- `conversationId`
- `conversationSeq`
- `messageType: "text"`
- `body: { text }`
- `preview: text`
- `sentAt`
- `direction/out`
- 发送者身份

详情接口和 Gateway 推送也必须遵守：

- 不返回通用 `[Message]` 作为 text preview。
- 不用空 `body` 表示文本消息。
- 能回传 `clientMsgId` 时必须回传。

如果短期服务端无法满足，前端防腐层必须保证当前页面不被污染，但刷新后历史消息能否恢复真实正文取决于服务端是否返回完整数据。

## 17. 非目标

本次方案不做：

- 不重构 IM。
- 不改变 IM 发送模型。
- 不重写通用 `MessageBodyView`。
- 不在 UI 层修复 `[Message]`。
- 不用本地猜测恢复刷新后服务端从未返回过的文本正文。
- 不伪造服务端缺失的历史数据。

## 18. 最终原则

在线客服可以有自己的客服会话域，但不能有一套不一致的消息发送确认语义。

最终架构必须满足：

```text
多入口是事实
多入口直接写 UI 数据源是不合理的
所有入口必须先进入 CustomerServiceMessageDomain
领域层输出唯一、稳定、可渲染的 projection
UI 只消费 projection
```

这才是符合 DDD 的顶级修复。
