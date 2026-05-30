# P9-IM-021 message menu media status 验证记录

日期：2026-05-30

## 目标

- 将消息菜单视频缓存状态探测从 `MessageCenter.tsx` 迁出。
- 保留 `blob:`、`data:`、`file:` 直接视为 cached，以及桌面 API `getCachedMediaStatus` payload 构造行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageMenuMediaStatus.ts`。
- `MessageCenter.tsx` 改为直接读取 hook 返回的 `messageMenuMediaStatus`。
- `MessageCenter.tsx` 行数从 1257 降到 1206。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-context-menu-model.spec.ts tests/unit/media-policy.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，2 个测试文件，9 个测试用例。

## 诊断日志

- 本次为菜单媒体状态副作用抽离，不新增运行时日志字段。
- 桌面 API 调用失败仍按既有行为降级为 `not_cached`；后续如要追踪缓存命中率，应在 `useMessageMenuMediaStatus` 内集中补结构化日志。

## 结论

P9-IM-021 已完成。后续消息菜单媒体缓存状态探测应优先修改 `useMessageMenuMediaStatus`。
