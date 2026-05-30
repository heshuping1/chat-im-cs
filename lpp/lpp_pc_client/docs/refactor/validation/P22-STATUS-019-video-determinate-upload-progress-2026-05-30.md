# P22-STATUS-019 视频上传确定进度验证记录

日期：2026-05-30

## 目标

修复视频上传过程中一直显示不确定转圈的问题。即使 XHR `progress` 事件没有 `percent`，也应使用 `loaded/total` 或 `loaded/File.size` 计算真实确定进度，让视频封面上的圆环像微信一样持续推进。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，也不伪造网络进度。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 新增 `mediaUploadProgressPercent`，优先使用 XHR `percent`，其次使用 `loaded/total`，最后使用 `loaded/File.size`。
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
  - 普通 IM 媒体文件上传和视频封面上传都使用确定进度兜底。
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
  - 客服媒体文件上传和视频封面上传同步使用确定进度兜底。
- `tests/unit/upload-state.spec.ts`
  - 覆盖 `loaded/File.size` fallback、`loaded/total` fallback、无可计算 total 时返回 undefined。

## 验证命令

```bash
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

- TDD 红灯：在实现 `mediaUploadProgressPercent` 前，`upload-state.spec.ts` 中 `loaded/File.size` fallback 用例失败，证明旧链路确实无法把缺失 `percent` 的 progress 事件转成确定进度。
- 单元验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、35 个用例通过。
- `npm run p10:audit`：通过，所有观察项为 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`；data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过，无 `ai-context-split-candidates`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 视频上传过程中圆环按真实进度推进，不一直转圈。
2. XHR 无 `event.total` 但有 `file.size` 时也显示确定进度。
3. 上传暂停后圆环停在当前进度。
4. 上传完成但发送 API 未返回时，仍不可播放。
5. 成功后圆环消失，恢复普通播放按钮。
