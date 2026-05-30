# P22-STATUS-018 微信式视频上传圆环验证记录

日期：2026-05-30

## 目标

精修视频上传圆环视觉和交互表达：上传中只用封面内中央圆环表达进度，不显示上传中/发送中文字 pill；失败/取消保留克制短提示。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不改变 P22-STATUS-016 的真实上传阶段模型。

## 修改范围

- `src/renderer/media/components/VideoMessagePreview.tsx`
  - 上传态 aria label 继续保留真实状态文案。
  - 可见状态文案只在失败/取消时渲染，上传中、暂停、发送中不再压在封面上。
- `src/renderer/styles/messages/message-media-content.css`
  - 视频上传控件改为约 56px 中央暗色圆盘、弱底圈、白色短弧进度和中央操作图标。
  - 无真实进度时使用旋转短弧，不出现静止空圈。
- `tests/unit/media-message.spec.ts`
  - 补充视频上传态结构和 CSS 守卫，防止恢复成文字 pill 或完整强 track。

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

- 红灯验证：新增视频上传态结构/CSS 守卫后，旧实现按预期失败，原因是上传态仍直接渲染 `uploadOverlay.label`，圆环仍偏完整播放器式 track。
- targeted tests：通过，4 个测试文件、34 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 视频上传中：封面保留，只显示中央圆环和暂停图标，不显示 `上传中 xx%` 文案。
2. 视频无真实进度：显示旋转短弧，不是静止空圈。
3. 视频暂停：圆环冻结，中央显示继续图标。
4. 视频发送中：不可播放，不显示文字 pill。
5. 视频失败：封面保留，中央重试可点击，可见失败提示克制不遮挡主体。
