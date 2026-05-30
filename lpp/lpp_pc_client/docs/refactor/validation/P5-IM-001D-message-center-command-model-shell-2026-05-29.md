# P5-IM-001D MessageCenter Command Model Shell

日期：2026-05-29

## 变更

新增普通 IM 页面命令入口壳：

- `src/renderer/messages/hooks/useMessageCenterCommandModel.ts`

首批接入命令：

- `sendText`
- `sendMedia`
- `uploadAction`
- `menuAction`
- `deleteSelectedMessages`
- `unreadJump`

`MessageCenter.tsx` 中对应 JSX 调用已改为通过 `messageCenterCommands` 入口触发。

## 边界控制

本任务只迁移命令入口，不重写命令实现：

- 文本/媒体发送函数仍保持原行为。
- 上传 pause/resume/cancel/retry 仍保持原行为。
- 删除、右键菜单、未读跳转仍保持原行为。
- cache patch、mutation、副作用仍未移动。

这样先让页面 JSX 不再直接散落调用命令函数，为后续 `P5-IM-004B` 发送用例下沉、`P5-IM-005B` action map 和 `P5-IM-003B` 滚动规则迁移留出稳定入口。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/send-state-machine.spec.ts
```

结果：通过，9 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。发送/上传诊断仍由 `P4-MSG-005C` 覆盖；页面级入口诊断由 `P5-IM-001E` 补齐。

## 遗留风险

命令实现仍在 `MessageCenter.tsx`，文件体积和副作用耦合尚未明显下降。下一步应先补页面级诊断，再按发送、消息操作、滚动三个方向继续拆 use case。
