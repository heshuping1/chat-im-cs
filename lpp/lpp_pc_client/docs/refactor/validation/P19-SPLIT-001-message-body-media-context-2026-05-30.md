# P19-SPLIT-001 Message Body Media Context Validation

日期：2026-05-30

任务：P19-SPLIT-001

## 修改范围

- 从 `src/renderer/components/MessageBodyView.tsx` 迁出 image、voice、video 媒体展示和加载生命周期。
- 新增 `src/renderer/messages/components/message-content/MessageMediaParts.tsx` 作为媒体内容展示 owner。
- `MessageBodyView.tsx` 保留消息 part 分发、text/markdown/event/contact/location/call 装配。

## 边界确认

- 不改变 `MessageBodyView` props。
- 不改变 API DTO、query key、Gateway event、Electron IPC contract。
- 不新增公共抽象，不新增依赖。

## 验证命令

```bash
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/message-domain.spec.ts tests/unit/media-message.spec.ts tests/unit/architecture-boundaries.spec.ts
```

## 结果

通过。`MessageBodyView.tsx` 从 569 行降到 190 行，新增 `MessageMediaParts.tsx` 为 390 行；类型检查、消息/媒体局部测试、`check:quick` 和 `build` 均通过。
