# P22-STATUS-014 媒体上传进度与文件状态承载验证记录

日期：2026-05-30

## 目标

修正微信式媒体发送状态二次问题：视频圆形控件必须真实表达上传进度或加载中；文件消息不再使用气泡左侧独立圆圈，而由文件卡片自身承载上传、失败和重试状态。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 视频上传 label 改为 `上传中 xx%`，无进度时保留 `上传中` 并触发不确定加载环。
  - 增加本地 `sending` 状态识别，发送接口等待阶段不可播放。
  - 文件失败文案改为 `发送失败，点击重试`。
- `src/renderer/data/message/message-status-model.ts`
  - 文件本地上传、暂停、发送、失败、取消不再显示气泡外状态位。
  - 文本和图片继续使用气泡外状态位。
- `src/renderer/media/components/FileMessageCard.tsx`
  - 增加卡片内部细进度线，支持确定进度和不确定流动加载。
- `src/renderer/messages/components/message-content/FileMessageContent.tsx`
  - 文件失败点击卡片触发现有 upload retry。
  - 文件未成功前仍不可打开或下载。
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
  - 普通 IM 媒体上传完成后、发送 API 返回前切换为 `sending + 100%`。
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
  - 客服媒体同样在发送 API 等待阶段切换为 `sending + 100%`。

## 验证命令

```bash
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

- 红灯验证：新增用例先失败，确认旧实现仍让文件走外侧状态位，视频上传 label 不体现 `上传中 xx%`，文件卡片没有内部进度和卡片点击重试。
- targeted tests：通过，5 个测试文件、33 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 视频上传 42%：圆形控件显示确定进度，文案为 `上传中 42%`。
2. 视频上传无进度：圆形控件显示不确定旋转加载，不是静止空圈。
3. 视频发送中：上传环停在完成态，仍不可播放。
4. 文件上传中：没有气泡左侧独立圆圈，文件卡片 meta 显示上传状态，内部细进度线显示进度或流动加载。
5. 文件失败：没有气泡左侧红点，文件卡片显示 `发送失败，点击重试`，点击文件卡片重试。
6. 文件成功：恢复文件大小展示，可打开或下载。
