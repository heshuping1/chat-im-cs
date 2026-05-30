# P10-REUSE-002 media IPC boundary 验证记录

日期：2026-05-30

任务编号：P10-REUSE-002

## 变更

- `architecture-boundaries` 新增 desktop media IPC hard gate。
- 允许 `src/renderer/media/runtime/**` 和 `src/renderer/messages/runtime/**` 调用桌面媒体 IPC。
- 将 `MessageBodyView` 和 `useMessageMenuActionController` 的直接媒体 IPC 调用迁入 runtime owner。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/media-action-capabilities.spec.ts` | 通过，12 tests |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 |
