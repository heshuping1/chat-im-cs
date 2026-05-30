# P22-STATUS-027 微信式文件上传卡片精修验证记录

日期：2026-05-31

## 目标

文件上传卡片继续对齐微信式信息架构：状态由文件卡片自己承载，右侧文件 icon 中央显示暂停/继续/重试控件；圆弧默认不自旋，有真实进度时从 12 点方向按百分比推进；成功态恢复文件类型文字；底部来源继续跟随客户端程序名。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 文件 `queued/preparing/uploading` 缺进度时也返回 0% 确定进度，避免默认 `loading/is-indeterminate`。
- `src/renderer/media/components/FileMessageCard.tsx`
  - 文件上传控件改为 SVG 圆环，圆弧通过 `stroke-dashoffset` 表达确定进度。
  - 上传、暂停、发送、失败控件保持 icon 中心位置。
- `src/renderer/styles/messages/message-media-content.css`
  - 文件 icon 改为更柔和的文档形态。
  - 删除文件上传默认自旋动画和 conic-gradient loading 表现。
  - 精修文件名、meta、来源区和 icon 视觉层级。
- `tests/unit/upload-state.spec.ts`、`tests/unit/media-message.spec.ts`
  - 补充缺进度静态 0%、SVG 确定圆弧、不使用默认自旋的断言。

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

- TDD 红灯：新增“缺进度也必须是静态 0% 确定圆弧”“不出现 `is-indeterminate`/自旋动画/conic-gradient”的断言后，旧实现失败，证明测试覆盖了本轮视觉与状态缺口。
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

1. 文件等待上传/上传中不再默认自旋，圆弧静止或按进度增长。
2. 暂停键位于右侧文件 icon 中心。
3. 上传成功后右侧 icon 恢复文件类型文字。
4. 文件卡片底部来源仍显示客户端程序名。
5. 底部不恢复进度条、暂停、取消按钮。
