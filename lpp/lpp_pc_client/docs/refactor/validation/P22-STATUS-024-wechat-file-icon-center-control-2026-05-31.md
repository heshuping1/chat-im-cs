# P22-STATUS-024 微信式文件图标居中控件验证记录

日期：2026-05-31

## 目标

修正文件消息上传态与微信参考不一致的问题：上传、发送、暂停、失败控件统一在图标中心承载；文件类型信息继续由左侧文件名扩展名表达。成功态文件类型可见性在 P22-STATUS-025 补齐。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/media/components/FileMessageCard.tsx`
  - 移除上传态独立 `message-file-type-layer` 展示。
  - 保留右侧文件图标容器，上传控件仍通过 `controlState/controlProgress` 驱动。
- `src/renderer/styles/messages/message-media-content.css`
  - 文件上传控件 glyph 居中显示，不再压到右下角。
- `tests/unit/media-message.spec.ts`
  - 补充上传控件居中的结构断言。

## 验证命令

```bash
npx vitest run tests/unit/media-message.spec.ts
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

- TDD 红灯：更新结构断言后，旧实现因 `message-file-type-layer` 仍存在而失败，证明测试能捕获“上传态仍有独立类型层”的偏差。
- 单元验证：`npx vitest run tests/unit/media-message.spec.ts` 通过，11 tests。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、36 tests。
- `npm run p10:audit`：通过，全部 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`；data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过，`ai-context-split-candidates = none`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 上传 `.7z/.zip/.apk` 时右侧图标的上传控件居中显示。
2. 上传中右侧图标中心显示圆形进度和暂停按钮。
3. 暂停后中心按钮切为继续，失败后中心按钮切为重试。
4. 文件名区域未成功前不可打开文件；成功后整卡可打开。
5. 底部不恢复进度条、暂停、取消按钮。
