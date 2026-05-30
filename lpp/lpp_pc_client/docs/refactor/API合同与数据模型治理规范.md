# API 合同与数据模型治理规范

状态：执行基准

日期：2026-05-29

适用范围：`lpp/lpp_pc_client/src/renderer`

关联任务：P3-API-001A

## 1. 目标

PC 端所有远端数据必须逐步走清晰链路：

```text
Raw DTO
  -> Contract Result
  -> Domain Entity
  -> ViewModel
  -> React Component
```

本规范解决三个问题：

1. 页面不再直接猜后端字段名、兼容字段和缺省值。
2. 字段缺失、降级、阻断原因可测试、可记录、可追踪。
3. IM 与客服后续可以共享 message、conversation、media、identity 等底座。

## 2. 分层定义

| 层 | 命名 | 允许内容 | 不允许 |
| --- | --- | --- | --- |
| DTO | `*Dto`、后端返回类型 | 原始接口字段、兼容字段、可选字段。 | 放 UI 文案、React 状态、业务派生规则。 |
| Contract | `normalize*Dto`、`validate*Contract` | 字段读取、类型校验、缺省值、降级/阻断 reason。 | 访问 React、Zustand、React Query、DOM。 |
| Domain | `*Entity`、`*State` | 稳定业务语义、不变量、状态机输入输出。 | 保留多套后端兼容字段名。 |
| ViewModel | `*ViewModel` | 页面展示所需字段、文案 key、状态 badge、按钮可用性。 | 发 API、改 cache、解释 raw DTO。 |
| Component | `*.tsx` | 布局、交互、调用 command/view model。 | 直接解析 raw DTO、写兼容字段兜底链。 |

## 3. 推荐目录

短期保持现有 `src/renderer/data` 结构，新增 contract/domain/view model 时按能力聚合：

```text
src/renderer/data/
  api-client.ts
  api-contract/
    contract-result.ts
    contract-diagnostics.ts
  im/
    im-conversation-contract.ts
    im-conversation-domain.ts
    im-conversation-view-model.ts
    im-message-contract.ts
    im-message-domain.ts
    im-message-view-model.ts
  customer-service/
    cs-thread-contract.ts
    cs-thread-domain.ts
    cs-thread-view-model.ts
```

迁移期允许保留现有文件：

| 现有文件 | 当前角色 | 后续方向 |
| --- | --- | --- |
| `data/im-api-contract.ts` | 已有 IM read/message contract 基础 | 拆分或兼容迁入 `data/im/*contract.ts`。 |
| `data/im-message-normalize.ts` | 消息 body/media normalize 基础 | 沉淀为 message domain/view model 输入能力。 |
| `data/message-display.ts` | 会话展示和身份判断 | 拆成 identity/conversation view model。 |
| `data/customer-service-display.ts` | 客服状态展示 | 拆成客服 thread domain/view model。 |

## 4. 命名规则

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| DTO 类型 | `ConversationListItemDto` | 对齐接口返回，不强求字段完整。 |
| Contract 输入 | `normalizeImConversationDto(dto)` | 只接 raw DTO，不接 React 状态。 |
| Contract 校验 | `validateImConversationContract(dto)` | 返回 contract result 和 diagnostics。 |
| Domain 类型 | `ImConversationEntity` | 字段稳定，禁止 snake_case/camelCase 双字段并存。 |
| ViewModel 类型 | `ImConversationRowViewModel` | 给具体 UI 消费，允许含文案和展示状态。 |
| Reason code | `im.conversation.missing_id` | 稳定、可检索、可测试，不写临时中文句子。 |
| Test fixture | `im-conversation.missing-id.fixture.ts` | 明确场景，不用真实敏感数据。 |

## 5. Contract Result 模板

P3-API-001B 会把下面模板落成源码类型。P3-API-001A 先冻结语义：

```ts
export type ContractStatus = "ok" | "degraded" | "invalid" | "failed";

export interface ContractIssue {
  code: string;
  level: "info" | "warning" | "error";
  field?: string;
  message?: string;
}

export interface ContractResult<T> {
  status: ContractStatus;
  data?: T;
  issues: ContractIssue[];
}
```

状态语义：

| 状态 | 含义 | 页面处理 |
| --- | --- | --- |
| `ok` | 字段完整，已生成 domain/view model。 | 正常渲染。 |
| `degraded` | 关键功能可用，但有字段缺失或兼容降级。 | 正常渲染，同时记录诊断。 |
| `invalid` | 缺少必要字段，不能进入核心链路。 | 跳过该条数据或展示降级空态。 |
| `failed` | 解析过程异常。 | 捕获并记录，不能炸页面。 |

## 6. Mapper 模板

```ts
export function normalizeImConversationDto(
  dto: unknown,
): ContractResult<ImConversationEntity> {
  const record = asRecord(dto);
  const issues: ContractIssue[] = [];
  const conversationId = stringField(record, "conversationId", "conversation_id", "chatId");

  if (!conversationId) {
    issues.push({
      code: "im.conversation.missing_id",
      level: "error",
      field: "conversationId",
    });
  }

  if (hasErrorIssue(issues)) {
    return { status: "invalid", issues };
  }

  return {
    status: issues.length ? "degraded" : "ok",
    issues,
    data: {
      id: conversationId,
      type: normalizeConversationType(record) ?? "direct",
      title: stringField(record, "title", "name") || "未命名会话",
    },
  };
}
```

## 7. ViewModel 模板

```ts
export function toImConversationRowViewModel(
  entity: ImConversationEntity,
): ImConversationRowViewModel {
  return {
    id: entity.id,
    title: entity.title,
    avatar: {
      name: entity.title,
      url: entity.avatarUrl,
    },
    unreadBadge: entity.unreadCount > 0 ? formatBadgeCount(entity.unreadCount) : "",
    previewText: entity.previewText || "[暂无消息]",
  };
}
```

ViewModel 可以依赖纯格式化能力，例如 `formatBadgeCount`、`formatChatTime`，但不能发请求、写 store、改 query cache。

## 8. 错误与降级规则

| 场景 | 推荐状态 | Reason code 示例 |
| --- | --- | --- |
| 缺少 `conversationId`、`messageId` 等核心 ID | `invalid` | `im.message.missing_id` |
| 缺少 `conversationSeq` 导致 read model 不可靠 | `invalid` 或 `degraded`，按链路风险决定 | `im.message.missing_seq` |
| 缺少 sender，但可用 fallback 展示 | `degraded` | `im.message.missing_sender` |
| 未知消息类型 | `degraded` | `im.message.unknown_type` |
| 客服线程终态字段不明确 | `degraded` | `cs.thread.unknown_status` |
| JSON shape 异常或 parser throw | `failed` | `api.contract.parse_failed` |

## 9. 测试要求

每个 Contract/Normalizer 至少覆盖：

1. 完整 DTO。
2. 兼容字段 DTO。
3. 缺核心字段。
4. 未知枚举或未知消息类型。
5. 空对象、null、数组等异常 shape。

测试不连真实后端，不使用真实 token、手机号、邮箱、聊天正文。

## 10. 日志要求

P3-API-001C 会建立统一诊断日志。所有 contract 日志必须遵守：

| 字段 | 要求 |
| --- | --- |
| `module` | 固定为 `api-contract`。 |
| `api` | 接口或事件来源，例如 `pc-im-conversations`、`gateway.msg.new`。 |
| `status` | `ok/degraded/invalid/failed`。 |
| `issues` | 只记录 reason code、field、level。 |
| `context` | 只记录 conversationId、messageId、threadId、queryKey 等排查字段。 |
| `error` | 只记录 name/message/code，不记录 raw payload。 |

禁止日志输出 token、Authorization、完整 raw DTO、消息正文、用户隐私字段。

## 11. 迁移原则

1. 先新增 normalizer，不直接删旧逻辑。
2. 首批只迁移一个消费点，并保留回滚路径。
3. 页面中新增 raw DTO 字段兜底链必须拒绝，改到 contract。
4. 已有公共能力优先复用，不为每个页面重写 avatar、badge、time、empty/error。
5. Contract 层纯函数优先，便于 vitest 快速覆盖。

## 12. P3 执行顺序

```text
P3-API-001A 规范模板
P3-API-001B ContractResult 源码类型
P3-API-001C Contract 诊断日志
P3-API-002A~C IM 会话合同
P3-API-003A~C IM 消息合同
P3-API-004A~C 客服合同
P3-API-005A~C API error
P3-API-006A~C Gateway contract
```

结论：P3 的核心不是“多写一层文件”，而是把字段兼容、降级、阻断、展示派生从页面和 Gateway 中拿出来，变成可测试、可诊断、可持续扩展的合同层。
