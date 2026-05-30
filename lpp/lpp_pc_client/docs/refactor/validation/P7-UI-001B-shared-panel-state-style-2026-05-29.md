# P7-UI-001B Shared PanelState Style

日期：2026-05-29

## 变更

- 新增 `src/renderer/styles/shared/panel-state.css`。
- `App.tsx` 在 `theme.css` 后、`app.css` 前引入共享状态样式。
- 从 `app.css` 移除 `.panel-state` 和 `.panel-state.error`。

## 行为保持

- class 名不变。
- CSS 变量仍来自 `theme.css`。
- import 顺序保证共享样式先加载，后续页面级样式仍可覆盖。

## 后续

- `pc-chat-*`、`message-*`、`h-thread-*` 需要按组件拆，不能一次性搬迁。
