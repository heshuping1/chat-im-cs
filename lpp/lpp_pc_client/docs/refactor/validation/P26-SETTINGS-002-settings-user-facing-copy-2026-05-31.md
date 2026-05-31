# P26-SETTINGS-002 Settings User-Facing Copy

日期：2026-05-31
执行人：Codex

## 背景

P26-SETTINGS-001 已完成设置来源分层，但 UI 直接暴露“本机、账号、企业、系统能力”等工程视角。P26-SETTINGS-002 将这些内部治理事实保留在 catalog 中，展示层改为客服、管理员、所有者更容易理解的语言。

## 修改范围

- `settingsCatalog`：保留内部 `source/capability`，新增 `scopeLabel/statusLabel/visibleInMainList` 派生字段。
- `MePage`：移除顶部来源说明卡片；左侧导航显示业务说明；未支持能力收敛到“待支持能力”轻量区。
- `SettingsRows`：行级展示 `仅当前电脑 / 所有设备同步 / 由管理员配置 / 暂未支持`，不再展示工程来源词。
- `settings.css`：替换 scope/status pill 样式，新增待支持能力区样式。
- `settings-catalog.spec.ts`：补用户化文案、防工程词、防未支持能力主列表展示的回归测试。

## 边界确认

| 边界 | 结论 |
| --- | --- |
| API DTO | 未改 |
| React Query query key | 未改 |
| Gateway event | 未改 |
| Electron IPC/preload/main | 未改 |
| Zustand persist key | 未改 |
| 新依赖 | 未新增 |
| 技术替换 | 未涉及 |
| 删除旧链路 | 未涉及 |

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `npx vitest run tests/unit/settings-catalog.spec.ts` | 通过，11 tests |
| `npx vitest run tests/unit/settings-catalog.spec.ts tests/unit/pc-settings.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts` | 通过，34 tests |
| `npm run check:quick` | 通过 |
| `git diff --check` | 通过 |

## 浏览器验证

- URL：`http://127.0.0.1:5173/`
- 已进入设置页并切到 `本机与诊断`。
- DOM 结果：
  - 不存在 `.settings-source-legend`。
  - 不包含 `客户端能力`、`Electron main/preload`、`服务端口径`、`系统能力`。
  - 顶部文案为用户化说明。
  - 行级显示 `仅当前电脑` / `所有设备同步` 等用户语言。
  - 未支持能力统一进入 `待支持能力` 区。
- 截图：`/private/tmp/p26-settings-user-facing-copy.png`

## 备注

本轮只做 UX 文案和展示层收敛。开机自启、托盘、线路切换、语言、时区等真实能力后续如需接入，需要单独评估 Electron IPC/preload/main 和设置持久化边界。
