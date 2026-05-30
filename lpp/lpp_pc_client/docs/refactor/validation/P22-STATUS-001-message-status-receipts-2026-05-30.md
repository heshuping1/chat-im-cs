# P22-STATUS-001 消息状态与已读回执统一验证

日期：2026-05-30

## 任务

- 任务编号：P22-STATUS-001 / P22-STATUS-002 / P22-STATUS-003 / P22-STATUS-004 / P22-STATUS-005
- 范围：普通 IM 与在线客服消息状态展示、失败红点、私聊逐条已读、群聊聚合回执最小消费。
- 风险边界：不改 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract、Zustand persist key；不新增依赖；不新增群聊 read receipt 请求接口。

## 结论

已将消息状态展示收敛到 `data/message` 纯模型，由 IM 与客服共用：

1. 失败态最高优先级，失败消息不显示已读/未读/已发送。
2. 自己消息失败时在气泡外显示微信式红色 `!`，hover/click 展示失败提示；媒体失败可复用现有上传重试。
3. 文本消息不再展示“发送中/已发送”。
4. 私聊每条自己发送成功的消息显示 `未读` 或 `已读`。
5. 群聊只消费现有 `readCount/unreadCount/allRead` 字段；没有服务端字段时只显示时间，不伪造“已发送”。
6. 客服去掉固定“已发送”，使用同一状态模型。

## 服务端依赖登记

群聊完整 read receipt 需要后续服务端提供批量聚合接口，例如：

```text
GET /api/client/v1/groups/{groupId}/message-read-receipts?messageIds=m1,m2
```

建议返回最小字段：`messageId/readCount/unreadCount/memberCount/allRead`。本轮未接入该请求。

## 验证命令

```bash
npx vitest run tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-domain.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/upload-state.spec.ts tests/unit/cs-cache-adapter.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

## 人工验收建议

- 文本失败：气泡外红色 `!`，提示为“发送失败，点击重试”或具体失败原因。
- 文本成功：不显示“已发送/发送中”。
- 私聊：每条自己成功消息显示 `未读/已读`。
- 群聊：有服务端聚合字段才显示 `x人已读/全部已读/x人未读`，无字段只显示时间。
- 客服：失败、重试、已读展示与 IM 保持一致。
- 视频失败：封面保留，卡片内重试和外侧失败点都可用。
