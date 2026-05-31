# P26-CUSTOMER-004 Header Channel Real Data

日期：2026-05-31

## 目标

修正普通 IM 客户 header 的渠道展示口径。客户 header 不再展示 `好友私聊 / 暂无未读` 这类会话说明，也不再把 `客户通讯录` 当作来源渠道；只有服务端 profile-card/profile-extra 提供真实渠道应用或来源渠道时才展示 chip。

## 修改范围

- `MessageChatHeader`：移除 direct header 对 `conversationMetaText()` 的依赖；无真实渠道数据时不渲染 `chat-header-meta-chips`。
- `MessageCenterConversationStage`：新增 header 专用真实渠道派生，只读取 `profileData` 的 app 字段，以及 `profileExtra.source` / `profileData` 的 source/channel 字段。
- `tests/unit/message-lookup-ui.spec.ts`：覆盖 direct header 不再使用会话说明和 contact fallback。
- `tests/browser/workspace-smoke.spec.ts`、`tests/browser/im-read-full-scenarios.spec.ts`：同步移除旧 `好友私聊.*暂无未读` 断言。

## 风险边界

- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key。
- 不新增依赖。
- 不删除旧链路。
- 不改客户资料详情页字段展示口径。

## 登录后 DOM 验证

普通 IM 会话 `测试客户A`：

```json
{
  "title": "测试客户A",
  "headerText": "测测试客户A",
  "chips": [],
  "hasFallbackPrivateChat": false,
  "hasContactSourceFallback": false
}
```

说明：

- 当前样本只有 `客户通讯录` 这类 contact fallback，没有真实渠道应用或来源渠道，因此 header 不展示 chip。
- `客户通讯录` 仍可作为客户资料里的资料来源/客户来源线索存在，但不再作为 header 来源渠道展示。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx vitest run tests/unit/message-lookup-ui.spec.ts` | 通过 | 先红后绿，验证 header 真实渠道派生。 |
| `npx vitest run tests/unit/message-lookup-ui.spec.ts tests/unit/customer-profile-model.spec.ts tests/unit/customer-profile-workspace.spec.ts` | 通过 | 覆盖客户资料相关回归。 |
| `npm run check:quick` | 通过 | 类型检查、核心 lint、架构边界、docs、P19 审计和 shape 均通过。 |
| `npm run docs:check` | 通过 | 验证矩阵和验证记录格式。 |
| `git diff --check` | 通过 | 无空白错误。 |
| `npx playwright test tests/browser/workspace-smoke.spec.ts tests/browser/im-read-full-scenarios.spec.ts --project=chrome --workers=1` | 部分通过 | Header 无 meta chip 断言所在步骤未失败；3 个既有已读/实时消息断言失败，表现为消息状态仍为 `未读` 或实时新增消息未出现，需另行按 IM 已读链路排查。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 原因 | 本轮是纯展示口径和测试修正，不新增运行时链路或异常分支。 |
| Codex 检索方式 | `MessageChatHeader` 中不再出现 `conversationMetaText`；`MessageCenterConversationStage` 中检索 `excludedHeaderSources`。 |
| 敏感信息处理 | 未新增日志，无新增敏感信息输出。 |

## 遗留风险

1. 如果后端某些真实来源字段也返回 `客户通讯录`，本轮会按 fallback 排除；后续需要服务端给出更明确的业务渠道枚举。
2. 当前浏览器样本没有真实渠道应用/来源渠道，只验证了 fallback 不展示；有真实样本后应再补一条 DOM 证据。

## 下一步

1. 有真实 app/source 样本后，验证 header 同时显示 `渠道应用`和 `来源渠道` chip。
