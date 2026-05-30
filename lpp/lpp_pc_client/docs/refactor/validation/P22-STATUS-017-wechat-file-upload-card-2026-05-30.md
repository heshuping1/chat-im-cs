# P22-STATUS-017 微信式文件上传卡片验证记录

日期：2026-05-30

## 目标

修正文件消息上传态，让文件卡片按微信式信息架构自承载上传状态：右侧文件图标内嵌进度、暂停、继续和重试控件，底部只保留弱来源区，不再使用底部进度线或气泡左侧状态位。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不改变 P22-STATUS-016 的真实上传阶段模型。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 新增文件卡片展示模型，将 `queued/uploading/paused/sending/failed/sent` 映射为文件 icon 内控件状态、meta 文案和上传操作。
- `src/renderer/media/components/FileMessageCard.tsx`
  - 文件卡片改为主内容区、右侧文件 icon 操作区和底部来源区。
  - 上传态不再渲染底部进度线，右侧 icon 内显示圆环/暂停/继续/重试。
- `src/renderer/messages/components/message-content/FileMessageContent.tsx`
  - 文件未成功前不打开/下载。
  - 上传中、暂停和失败操作通过文件 icon 控件触发既有 upload action。
- `src/renderer/styles/messages/message-media-content.css`
  - 删除文件底部进度线样式，新增文件 icon 内控件样式和来源区样式。

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

结果：

- 红灯验证：新增 `fileMessageCardState` 和文件卡片结构断言后，旧实现按预期失败，原因是缺少文件 icon 内控件、仍存在底部上传进度线。
- targeted tests：通过，4 个测试文件、33 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文件上传中：右侧文件 icon 内显示圆形进度和暂停按钮，底部不再出现独立进度条。
2. 文件暂停：右侧 icon 切换为继续按钮，meta 显示 `已暂停`。
3. 文件发送中：meta 显示 `发送中`，文件不可打开或下载。
4. 文件失败：右侧 icon 显示重试态，meta 显示 `发送失败，点击重试`。
5. 文件成功：右侧 icon 恢复普通文件图标，meta 显示文件大小，整卡可打开或下载。
