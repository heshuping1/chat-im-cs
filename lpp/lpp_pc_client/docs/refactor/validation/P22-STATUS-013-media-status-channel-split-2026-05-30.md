# P22-STATUS-013 媒体消息状态分流验证记录

日期：2026-05-30

## 目标

按微信式媒体差异拆分消息发送状态承载：图片使用气泡外发送状态位，视频使用封面卡片内圆形控件，文件使用文件卡片自身 meta 信息区。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。

## 修改范围

- `src/renderer/data/message/message-status-model.ts`
  - 视频本地 `queued/uploading/paused/sending/failed/canceled` 不再显示气泡外状态位。
  - 图片和文件继续使用气泡外发送中/失败状态位。
- `src/renderer/messages/components/message-content/FileMessageContent.tsx`
  - 文件未成功前只展示卡片 meta 状态，不允许打开或下载。
  - 文件不恢复底部进度条、暂停、取消按钮。
- `tests/unit/message-status-model.spec.ts`
  - 覆盖图片/文件外侧状态位和视频卡片内状态 owner 分流。
- `tests/unit/message-view-model.spec.ts`
  - 覆盖视频失败仍可作为 upload action 重试，但不显示外侧失败点。
- `tests/unit/media-message.spec.ts`
  - 覆盖文件状态留在卡片 meta 且未成功前不可打开。

## 验证命令

```bash
npx vitest run tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/media-message.spec.ts
npx vitest run tests/unit/upload-state.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/media-message.spec.ts tests/unit/message-failure-marker-style.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- 红灯验证：新增用例先失败，确认旧实现仍把视频上传/失败放到气泡外状态位，文件未覆盖完整未成功阻断。
- targeted tests：通过，5 个测试文件、31 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 图片上传中：图片内无控件，气泡外显示小转圈。
2. 图片失败：图片内无控件，气泡外红色 `!` 可重发。
3. 视频上传中/暂停/失败：气泡外不显示状态位，封面内中央圆形控件承载状态。
4. 文件上传中：文件卡片 meta 显示上传状态/进度，气泡外可显示轻量发送状态位。
5. 文件失败：文件卡片 meta 显示 `发送失败`，气泡外红色 `!` 可进入重发确认。
6. 文件未成功前不可打开或下载。
