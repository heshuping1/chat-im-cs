# P22-STATUS-028 文件上传卡片最终视觉精修验证记录

日期：2026-05-31

## 目标

在不改变文件发送状态机和协议边界的前提下，继续精修文件上传卡片视觉：上传态不再像禁用灰块；圆环更轻、更细，默认不自旋；卡片内文字、来源区和聊天气泡内 icon 比例更接近微信式密度。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/styles/messages/message-media-content.css`
  - 上传/暂停/发送/失败态文件 icon 改为低饱和文档色，移除灰色禁用观感。
  - SVG 圆环降低背景和线宽，0% 时只保留轻底圈和中央按钮。
  - 收紧文件卡片垂直密度和来源区分隔线。
- `src/renderer/styles/messages/message-center.css`
  - 聊天气泡内文件 icon 由 `36x44` 调整为 `40x48`，避免控件显得局促。
- `tests/unit/media-message.spec.ts`
  - 增加“不回到灰色禁用态”“仍为 SVG 确定圆弧且不自旋”的结构断言。

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

- 单项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts` 通过，2 个测试文件、20 tests。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、36 tests。
- `npm run p10:audit`：通过；除既有 `src/renderer/App.tsx` orphan 观察项外，其余为 `none`。
- `npm run p12:audit`：通过；CSS/组件观察项为 `none`，data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过；`ai-context-split-candidates = none`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文件等待上传/上传中不再呈现整体灰色禁用态。
2. 圆环 0% 时静止且不造假进度；有进度时只增长弧长。
3. 暂停/继续/重试图标保持居中，状态切换不跳动。
4. 成功态仍显示文件类型文字，上传态不显示文件类型文字。
5. 来源仍跟随客户端程序名。
