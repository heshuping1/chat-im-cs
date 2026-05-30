# P22-STATUS-011 微信式消息发送状态位验证记录

日期：2026-05-30

## 目标

将自己发送消息的发送中和失败态收敛到同一个气泡左侧状态位。发送中显示微信式小转圈；快速失败不立刻显示红色感叹号，而是保持转圈至少 650ms 后原地切换；失败消息继续保留并可重发。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。

## 修改范围

- `src/renderer/data/message/message-status-model.ts`
  - 新增 `sendStatusSlot: none | sending | failed`。
  - 新增 650ms 快速失败 reveal 规则。
  - `sending/uploading/queued` 统一走 sending 状态位。
- `src/renderer/data/message/message-view-model.ts`
  - 将状态位传给展示层。
- `src/renderer/components/ChatMessageBubble.tsx`
  - 将 sending marker 和 failure marker 收敛为一个 `pc-chat-send-status-slot`。
  - 根据状态模型定时刷新快速失败展示。
- `src/renderer/messages/models/messageCacheMutationModel.ts`
  - 失败 patch 写入 `localFailedAt`。
- `src/renderer/data/send/send-outbox.ts`
  - outbox 记录和恢复消息保留 `localFailedAt`。
- `src/renderer/styles/messages/message-center.css`
  - 统一状态位尺寸和紧凑红色 `!` 视觉。

## 验证命令

```bash
npx vitest run tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-retry-model.spec.ts tests/unit/message-failure-marker-style.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/send-outbox.spec.ts tests/unit/upload-state.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- targeted tests：通过，7 个测试文件、38 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无新增拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文本消息发送后，气泡左侧状态位立即显示小转圈。
2. 快速失败时，小转圈至少保持 650ms，再原地切换为红色 `!`。
3. 失败消息刷新恢复后直接显示红色 `!`，不重新播放发送中。
4. 连续多条短消息失败时，每条仍保留，但状态位紧凑、不大面积发光。
5. 点击 `!` 进入“重发该消息?”确认，不直接静默重发。
