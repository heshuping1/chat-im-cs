# PC 普通 IM 会话与批量接口任务清单

状态：当前有效

日期：2026-06-06

适用范围：`lpp_pc_client/src/renderer/messages`、`lpp_pc_client/src/renderer/data/api`

## 1. 范围

本文档跟踪以下两个已准入需求的实现和联调状态：

1. `PC-REQ-20260606-003`：会话置顶、免打扰、隐藏、删除、恢复持久化。
2. `PC-REQ-20260606-005`：批量转发和批量删除服务端 batch 接口。

需求正文见 `01-PC端需求池.md`，详细方案见 `../technical/06-普通IM-P1服务端能力补齐详细方案.md`。

## 2. 分层规则

1. API 路径只维护在 `src/renderer/data/api/endpoints.ts`。
2. 服务端调用只放在 `src/renderer/data/api/messages-client.ts`。
3. batch 返回结构归一化放在 `src/renderer/data/message/message-batch-action-result.ts`。
4. 会话操作的动作模型放在 `src/renderer/messages/models/messageConversationActionModel.ts`。
5. UI 组件只发起动作，不拼接口路径，不解释服务端返回结构。

## 3. 任务清单

| ID | 需求 | 任务 | 服务端 API | 前端状态 | 联调状态 | 验证 |
| --- | --- | --- | --- | --- | --- | --- |
| PC-P1-CONV-001 | PC-REQ-20260606-003 | 会话置顶/取消置顶持久化 | `PUT /api/client/v1/conversations/{conversationId}/pin` | 已接入 | 待真实联调 | `message-p1-service-api-source.spec.ts` |
| PC-P1-CONV-002 | PC-REQ-20260606-003 | 会话免打扰/取消免打扰持久化 | `PUT /api/client/v1/conversations/{conversationId}/mute` | 已接入 | 待真实联调 | `message-p1-service-api-source.spec.ts` |
| PC-P1-CONV-003 | PC-REQ-20260606-003 | 会话隐藏/恢复持久化 | `PUT /api/client/v1/conversations/{conversationId}/visibility` | 已接入 | 待真实联调 | `message-p1-service-api-source.spec.ts` |
| PC-P1-CONV-004 | PC-REQ-20260606-003 | 会话删除入口 | 复用 `visibility`，按隐藏处理 | 已接入 | 待确认删除语义 | 人工验收 |
| PC-P1-CONV-005 | PC-REQ-20260606-003 | 恢复入口 | API 已接入 | 待产品确认 UI 入口 | 待排期 | 人工验收 |
| PC-P1-BATCH-001 | PC-REQ-20260606-005 | 批量删除调用 batch-delete | `POST /api/client/v1/messages/batch-delete` | 已接入 | 待真实联调 | `message-batch-action-result.spec.ts`、`message-p1-service-api-source.spec.ts` |
| PC-P1-BATCH-002 | PC-REQ-20260606-005 | 多选批量转发调用 batch-forward | `POST /api/client/v1/messages/batch-forward` | 已接入 | 待真实联调 | `message-batch-action-result.spec.ts`、`message-p1-service-api-source.spec.ts` |
| PC-P1-BATCH-003 | PC-REQ-20260606-005 | 成功/部分失败/全部失败结果模型 | 返回 `successIds`、`failedItems` | 已完成 | 待真实联调 | `message-batch-action-result.spec.ts` |

## 4. 本轮完成

1. 新增 conversation pin/mute/visibility endpoint 和 `MessagesApiClient` 方法。
2. 会话右键置顶、免打扰、隐藏、删除改为服务端 mutation；成功后刷新会话列表。
3. 新增 batch-delete 和 batch-forward endpoint；多选批量操作优先调用 batch 接口。
4. 新增 batch 结果归一化，支持 `successIds`、`failedItems` 和缺省成功推断。
5. 新增单测覆盖 endpoint、client 方法、会话动作模型和 batch 结果模型。

## 5. 剩余闭环

1. 用真实服务端验证五个 endpoint 的路径、鉴权、请求体和返回结构。
2. 明确“删除会话”是否等同隐藏；如果服务端有永久删除语义，需要新增 delete endpoint 和需求变更。
3. 明确“恢复会话”的产品入口；当前代码已接入 API，但当前会话列表右键入口只覆盖可见会话。
4. 真实联调后把 `前端状态/联调状态` 从 `待真实联调` 更新为 `已完成` 或登记缺陷。

## 6. 验证命令

```bash
cmd /c npm.cmd run typecheck
cmd /c npx vitest run tests/unit/message-batch-action-result.spec.ts tests/unit/message-conversation-action-model.spec.ts tests/unit/message-p1-service-api-source.spec.ts
```
