# P22-STATUS-012 媒体消息底部上传控件去重验证记录

日期：2026-05-30

## 目标

移除图片、视频、文件消息气泡底部重复的横向上传进度条、暂停和取消按钮。媒体发送状态统一由气泡左侧微信式状态位表达；视频额外保留封面内圆形上传控件。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。

## 修改范围

- `src/renderer/messages/components/message-content/MessageMediaParts.tsx`
  - 图片不再渲染底部上传控件。
  - 视频不再渲染底部备用上传控件，保留封面内圆形上传 overlay。
- `src/renderer/messages/components/message-content/FileMessageContent.tsx`
  - 文件不再渲染底部上传控件，卡片 meta 继续显示简洁状态。
- `src/renderer/media/components/UploadControls.tsx`
  - 删除无调用组件。
- `src/renderer/styles/messages/message-media-content.css`
  - 删除 `message-upload-*` 底部上传控件样式。
- `src/renderer/styles/messages/message-center.css`
  - 移除 `message-upload-meta` 相关布局引用。

## 验证命令

```bash
npx vitest run tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-failure-marker-style.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- targeted tests：通过，5 个测试文件、29 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无新增拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 图片上传中：图片下方不再出现横向进度条、暂停、取消。
2. 图片发送态：只由气泡左侧小转圈/红色 `!` 表达。
3. 视频上传中：只显示封面内圆形上传控件，不显示底部上传控件。
4. 文件上传中：文件卡片下方不显示进度条和操作按钮。
5. 失败重试仍通过气泡左侧红色 `!` 和重发确认完成。
