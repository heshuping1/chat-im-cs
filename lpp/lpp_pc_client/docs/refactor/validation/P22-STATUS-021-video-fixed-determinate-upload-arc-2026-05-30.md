# P22-STATUS-021 视频上传固定进度弧验证记录

日期：2026-05-30

## 目标

修复视频上传圆环一直以不确定短弧旋转的问题。视频上传、封面上传、暂停和发送阶段必须显示固定确定进度弧，只有完全没有阶段进度信息时才允许短暂不确定加载。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 为 `VideoUploadOverlayState` 增加 `progressMode`。
  - 视频 `uploading_media` 无 progress 时返回 0%，`uploading_poster` 无 progress 时返回 75%，避免进入无限旋转。
  - `paused/sending/failed/canceled` 明确为确定进度模式。
- `src/renderer/media/components/VideoMessagePreview.tsx`
  - 圆环 class 改为由 `progressMode` 决定，不再只看 `typeof progress`。
- `src/renderer/styles/messages/message-media-content.css`
  - 明确 `.message-video-upload-ring.is-determinate` 无 animation。
- `tests/unit/upload-state.spec.ts`、`tests/unit/media-message.spec.ts`
  - 覆盖确定进度模式、无 progress 保底和组件使用 `progressMode` 的断言。

## 验证命令

```bash
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

- TDD 红灯：新增断言后，旧实现因缺少 `progressMode`、`uploading_media` 无 progress 返回 `undefined`、组件仍用 `typeof progress` 推断 class 而失败，证明问题可被测试捕获。
- 单元验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts` 通过，2 个测试文件、19 个用例通过。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、35 个用例通过。
- `npm run p10:audit`：通过，所有观察项为 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`；data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过，无 `ai-context-split-candidates`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 视频上传时圆弧按进度增长，不像 loading 一样持续转圈。
2. 视频上传刚开始时显示 0% 固定弧，收到 progress 后推进。
3. 封面上传阶段从后段进度继续显示，不回退旋转。
4. 发送 API 等待阶段显示接近完成态，不可播放。
