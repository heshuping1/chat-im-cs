# P22-STATUS-007 失败消息重发与权限错误验证

日期：2026-05-30

## 任务

- 任务编号：P22-STATUS-007
- 范围：普通 IM 失败消息红点、重发确认、文本失败重发、媒体失败重试、IM 发送权限错误展示和 send diagnostics。
- 风险边界：不改 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract、Zustand persist key；不新增依赖；不替换技术栈；不删除旧链路。

## 根因

1. 失败红点此前只在 hover/click 显示 tooltip，文本失败没有进入“确认重发”闭环。
2. 媒体失败可以通过 `localTaskId` retry，但点击红点直接 retry，缺少微信式确认。
3. API 403/FORBIDDEN 被统一映射为“当前账号没有权限执行此操作”，没有按 `MSG_MEMBER_FORBIDDEN`、`MSG_GROUP_MUTED`、`MSG_MEMBER_MUTED` 等服务端 code 给出可理解原因。

## 修改

1. 新增 `data/message/message-retry-model.ts`，纯模型推导失败消息的重发动作：
   - 文本失败：复用原消息内容和 reply id。
   - 媒体失败：复用原 `localTaskId` 触发 upload retry。
2. 点击失败红点不再直接执行动作，而是弹出“重发该消息?”确认弹层。
3. 文本重发复用原 `localMessageId/clientMsgId`，更新同一条本地消息为 sending；成功后替换为服务端消息，失败后保留原消息并更新失败原因。
4. API 错误展示按 IM 发送错误码细分：
   - `MSG_MEMBER_FORBIDDEN`：你不在该会话中，无法发送消息。
   - `MSG_GROUP_MUTED`：群聊已开启全员禁言，暂时无法发送。
   - `MSG_MEMBER_MUTED`：你已被禁言，暂时无法发言。
5. send diagnostics 增加 `status/code/requestId/path` 上下文，便于后续区分前端链路问题和服务端权限拒绝。

## 未改变

- 未改变消息发送 API endpoint 和请求 DTO。
- 未改变 React Query query key。
- 未改变 Gateway 事件。
- 未改变 Electron IPC/main/preload。
- 未改变 Zustand persist key。

## 验证命令

```bash
npx vitest run tests/unit/message-retry-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/api-error-model.spec.ts tests/unit/send-state-machine.spec.ts
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

- 文本发送失败后点击红色 `!`，应出现“重发该消息?”确认弹层。
- 点击取消不改变消息状态。
- 点击重新发送应复用同一条失败消息，不新增重复消息。
- 如果服务端继续返回 `MSG_MEMBER_FORBIDDEN`，失败文案应显示“你不在该会话中，无法发送消息”，并保留失败消息。
