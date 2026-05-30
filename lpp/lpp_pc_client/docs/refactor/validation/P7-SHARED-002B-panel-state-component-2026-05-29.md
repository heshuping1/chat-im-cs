# P7-SHARED-002B PanelState Component

日期：2026-05-29

## 变更

新增 `src/renderer/components/PanelState.tsx`：

- `PanelState`
- `PanelStateTone`

## 输入协议

- `text`: 展示内容。
- `tone`: `muted | error | false`，`false` 用于保持既有 class 完全不附加 tone。
- `className`: 默认 `panel-state`，支持 feature 样式如 `e-panel-state`。
- `as`: `div | p`，兼容内联状态。
- `role`: 由调用方按语义传入。

## 边界

- 不包含图标。
- 不负责错误格式化。
- 不负责重试按钮。
- 不决定空态/错误态文案。
