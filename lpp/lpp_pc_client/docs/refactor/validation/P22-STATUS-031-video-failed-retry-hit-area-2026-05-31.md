# P22-STATUS-031 视频发送失败重试点击区验证记录

日期：2026-05-31

## 目标

修复视频发送失败后“点击无法部分”的问题。失败视频卡片已经展示微信式中央重试控件和“发送失败，点击重试”文案，但旧交互只允许中央小按钮触发 `retry`，用户点击封面、失败文案或卡片其他区域时会被上传态外层吞掉，体验上像是不可点击。

本轮将失败/暂停等有上传 action 的 overlay 命中区扩展到整张视频卡片，并补齐键盘 Enter/Space 可达性。失败态仍不打开视频播放器。

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
  - 新增 `triggerUploadOverlayAction`，统一中央按钮、整卡点击和键盘动作的 overlay action 分发。
  - 当 `uploadOverlay.active` 且存在 `uploadOverlay.action` 时，整张视频卡片设置为可点击按钮语义，点击触发 `pause/resume/retry` 等既有上传动作。
  - 当上传失败态点击封面或失败文案时触发 `retry`，不进入播放器打开路径。
- `tests/unit/media-message.spec.ts`
  - 补充静态断言，防止视频失败/上传 overlay 回退到只有中央小按钮可操作。

## 验证命令

```bash
npx vitest run tests/unit/media-message.spec.ts
npx vitest run tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts
npx vitest run tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-state-machine.spec.ts
npx tsc --noEmit --pretty false --skipLibCheck
npm run check:quick
```

结果：通过。

- TDD 红灯：新增 `triggerUploadOverlayAction`、`uploadActive && uploadAction`、整卡触发 `triggerUploadOverlayAction(uploadAction)` 断言后，旧实现失败，证明覆盖了“点击封面/失败文案无效”的缺口。
- 局部验证：`media-message.spec.ts` 与 `upload-state.spec.ts` 通过，2 个测试文件、20 tests。
- 媒体/状态扩展验证：4 个测试文件、33 tests 通过。
- TypeScript：`npx tsc --noEmit --pretty false --skipLibCheck` 通过。
- `npm run check:quick`：通过，含 Electron TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。

## 诊断日志

- 是否新增日志：否。
- 原因：本轮只修正 renderer 内已有上传 action 的点击命中区，没有新增发送阶段、网络请求或 IPC 能力。
- 可排查方式：失败视频点击后仍沿用既有 `onUploadAction(localTaskId, "retry")` 和 send diagnostics。
