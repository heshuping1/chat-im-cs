# P22-STATUS-022 视频上传圆弧禁止默认自旋验证记录

日期：2026-05-30

## 目标

将视频上传控件从 loading 自旋语义改为静态进度弧语义。上传中圆环本体不旋转，只有进度弧按真实百分比变长；上传完成前仍不可播放。

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
  - `queued/uploading` 无阶段 progress 时返回 0%，并保持 `progressMode = determinate`。
  - 视频上传路径不再返回 `indeterminate`。
- `src/renderer/media/components/VideoMessagePreview.tsx`
  - 视频上传圆环不再生成 `is-indeterminate` class。
- `src/renderer/styles/messages/message-media-content.css`
  - 移除视频上传自旋动画和 `is-indeterminate` 样式。
- `tests/unit/upload-state.spec.ts`、`tests/unit/media-message.spec.ts`
  - 补充 queued/uploading 默认 0% 确定进度、禁止 `video-upload-spin` 和 `is-indeterminate` 的断言。

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

- TDD 红灯：新增断言后，旧实现因 `queued/uploading` 无 phase 时仍返回 `indeterminate`、CSS 仍包含 `video-upload-spin`、组件仍生成 `is-indeterminate` 而失败。
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

1. 视频上传刚出现时是静态 0% 圆弧，不自旋。
2. 收到 progress 后圆弧变长，圆环本体不旋转。
3. 封面上传和发送 API 等待阶段不回退为 loading 自旋。
4. 失败、取消、暂停状态都不出现自旋。
