# P22-STATUS-032 视频打开失败后可重试验证记录

日期：2026-05-31

## 目标

修复已发送视频显示“打开失败”后点击无效的问题。旧实现把内联 `<video>` 加载失败的 `failed` 状态直接作为整张卡片不可点击条件，导致有视频源、有封面、有播放图标时，用户点击封面或失败文案仍不会再次尝试打开桌面播放器。

本轮将“是否有视频源可尝试打开”与“内联预览是否加载失败”拆开：只要存在 `src` 且不处于上传 overlay 阻断态，卡片仍可点击并继续调用现有 `openDesktopVideoPlayer`。`failed/openError` 只负责展示“打开失败”文案，不阻断重试。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不替换技术栈。
- 不删除旧链路。
- 不扩大公共抽象。

## 修改范围

- `src/renderer/media/components/VideoMessagePreview.tsx`
  - 用 `canAttemptOpen = Boolean(src)` 作为打开重试交互条件。
  - 内联视频加载失败时不再把整张卡片降为不可点击。
  - 保留 `failed/openError` 的“打开失败”展示，继续避免在上传态打开播放器。
- `tests/unit/media-message.spec.ts`
  - 补充断言，确保视频打开能力不再依赖 `!failed`，防止“打开失败后无法再次点击”回归。

## 验证命令

```bash
npx vitest run tests/unit/media-message.spec.ts
npx vitest run tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts tests/unit/video-player-runtime.spec.ts
npx tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

- TDD 红灯：新增 `canAttemptOpen = Boolean(src)` 和 `!canAttemptOpen` 断言后，旧实现失败，证明覆盖了打开失败后不可点击的问题。
- 局部验证：3 个测试文件、21 tests 通过。
- TypeScript：通过。

## 诊断日志

- 是否新增日志：否。
- 原因：本轮未新增请求、发送阶段或 IPC 能力，只修正 renderer 点击条件。
- 可排查方式：桌面播放器打开失败仍沿用既有 open failure UI 和 Electron runtime diagnostics。
