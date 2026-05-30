# P22-STATUS-023 视频上传进度证据化验证记录

日期：2026-05-31

## 目标

补充视频上传 progress summary 诊断，用证据区分“一次性上传完成是网络快”还是“上传耗时较长但 progress 事件稀疏”。本任务不人为拖慢上传，也不改变视频上传协议或 UI 成功条件。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不向用户展示诊断细节。

## 修改范围

- `src/renderer/data/send/send-state-machine.ts`
  - 新增 `createUploadProgressDiagnosticSummary`，输出 `eventCount/firstPercent/lastPercent/durationMs/completedByProgress/fastCompleted/progressSparse`。
  - 新增 progress tracker，避免 IM/客服 hook 重复维护事件数组和开始时间。
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
  - 普通 IM 视频文件上传和封面上传完成后记录 progress summary。
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
  - 客服视频文件上传和封面上传完成后记录同类 progress summary。
- `src/renderer/data/customer-service/cs-send-outbox-restore.ts`
  - 迁出客服 outbox 恢复纯数据逻辑，让客服发送 hook 保持在 P10 大文件阈值内。
- `tests/unit/send-state-machine.spec.ts`、`tests/unit/media-message.spec.ts`
  - 覆盖多事件、快速单事件、长耗时稀疏事件判定，以及 IM/客服接入结构。

## 验证命令

```bash
npx vitest run tests/unit/send-state-machine.spec.ts tests/unit/media-message.spec.ts
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- `npx vitest run tests/unit/send-state-machine.spec.ts tests/unit/media-message.spec.ts`：通过，18 tests。
- `npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts`：通过，43 tests。
- `npm run p10:audit`：通过，全部 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`，剩余 data/main 观察项为既有例外。
- `npm run p19:audit`：通过，`ai-context-split-candidates = none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup 既有 warning。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 开启 send diagnostics 后，发送视频可看到 `upload_progress` 诊断记录。
2. 如果上传很快且只收到一次 100%，记录 `fastCompleted=true`、`progressSparse=false`。
3. 如果上传耗时较长但事件很少，记录 `progressSparse=true`。
4. UI 继续保持静态进度弧，不恢复自旋。
