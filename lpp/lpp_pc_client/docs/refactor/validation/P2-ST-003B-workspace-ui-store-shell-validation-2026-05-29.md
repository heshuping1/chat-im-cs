# 验证记录：P2-ST-003B Workspace UI Store 壳

日期：2026-05-29

任务编号：P2-ST-003B

## 修改范围

- `src/renderer/data/workspace-ui/workspace-ui-store.ts`
- `tests/unit/workspace-ui-store.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 workspace-ui store 壳，为导航、选择、布局、筛选等纯 UI 状态提供统一 selectors/actions，避免后续继续从大 Store 直接读取 UI 字段。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 导航 selector | `useActiveModule()`、`useSetActiveModule()`。 |
| 选择态 selector | `useActiveThreadId()`、`useActiveImConversationId()`、`useActiveContactId()` 及对应 setter。 |
| 布局 selector | `useMessageLayoutState()`、`useServiceLayoutState()` 聚合面板宽度和布局动作。 |
| 筛选 selector | `useServiceThreadFilter()`、`useMessageConversationFilter()`、`useContactFilter()` 及对应 setter。 |
| Snapshot | `getWorkspaceUiSnapshot()` 支持 Gateway 等非 React 函数读取当前 active 状态。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/workspace-ui-store.spec.ts tests/unit/pc-settings.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-diagnostics.spec.ts` | 通过 | 7 个测试文件，17 个用例通过，耗时约 168ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务只建立 selector/action 壳，不新增运行时日志。 |
| 可排查问题 | Codex 可通过 workspace-ui selectors 定位 UI 状态访问入口。 |
| Codex 检索方式 | `rg -n "useActiveModule|useMessageLayoutState|useServiceLayoutState|getWorkspaceUiSnapshot" src/renderer` |
| 敏感信息处理 | UI 状态不包含 token；未新增日志。 |

## 结论

P2-ST-003B 已完成。workspace-ui owner 壳已建立，下一步可以逐步迁移调用方。

## 下一步

1. P2-ST-003C：迁移页面布局和临时交互状态调用方，优先 App、Sidebar、MessageCenter、OnlineServicePage、ThreadList、ContactsPage、Gateway active 判断。
