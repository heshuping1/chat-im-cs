# P10-REUSE-001 media action capabilities 验证记录

日期：2026-05-30

任务编号：P10-REUSE-001

## 变更

- 新增 `src/renderer/messages/runtime/mediaActionCapabilities.ts`。
- 菜单和消息内容组件改为读取 `getMediaActionCapabilities(window.desktopApi)`。
- 新增 `tests/unit/media-action-capabilities.spec.ts` 覆盖无 desktop API、copy fallback 和独立能力判断。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/media-action-capabilities.spec.ts` | 通过，3 tests |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 |
