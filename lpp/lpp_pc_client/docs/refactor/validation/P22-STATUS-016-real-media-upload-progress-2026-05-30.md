# P22-STATUS-016 真实媒体上传进度验证记录

日期：2026-05-30

## 目标

按真实上传链路展示媒体发送状态：不人为拖慢上传，不伪造百分比；文件、视频、封面上传和发送 API 等待都必须完成后才进入成功态。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 新增本地 `uploadPhase`：`preparing/uploading_media/uploading_poster/sending/failed/sent`。
  - 新增真实阶段进度映射：文件上传 0-90%，视频上传 0-75%，视频封面上传 75-90%，发送等待 95%。
  - 无真实进度时返回 `undefined`，由 UI 显示不确定加载。
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
  - 普通 IM 媒体上传、视频封面上传、发送 API 等待、失败阶段写入 `uploadPhase`。
  - 视频封面上传接入 XHR `onProgress`。
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
  - 客服媒体发送同步写入同一阶段模型。
  - 视频封面上传接入 XHR `onProgress`。
- `src/renderer/data/send/send-outbox.ts`
  - outbox 记录与恢复保留 `uploadPhase`，中断恢复统一转 failed。
- `src/renderer/data/message/message-domain.ts`
  - shared message entity 保留本地 upload phase 扩展字段。

## 验证命令

```bash
npx vitest run tests/unit/upload-state.spec.ts tests/unit/message-domain.spec.ts tests/unit/send-outbox.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-failure-marker-style.spec.ts tests/unit/send-state-machine.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- 红灯验证：新增用例先失败，确认旧实现没有 `uploadPhase`，视频/文件阶段进度无法区分真实文件上传、封面上传和发送等待。
- targeted tests：通过，8 个测试文件、51 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文件上传 50%：文件卡片显示约 `上传中 45%`，不显示气泡左侧圆圈。
2. 文件发送 API 等待：文件卡片显示 `发送中`，不可打开或下载。
3. 文件发送成功：显示文件大小，可打开或下载。
4. 视频上传 50%：圆环位于视频上传阶段约 38%，不直接跳 100%。
5. 视频封面上传中：仍不可播放，圆环进入后段进度。
6. 视频发送 API 等待：显示 `发送中`，不可播放。
7. 任一阶段失败：消息保留，进入失败态，可重试。
8. 快速上传允许快速完成，但必须经过完整状态链路，不提前成功。
