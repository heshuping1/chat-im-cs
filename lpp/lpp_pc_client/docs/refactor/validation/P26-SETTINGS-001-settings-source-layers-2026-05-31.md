# P26-SETTINGS-001 Settings Source Layers

日期：2026-05-31

## 目标

设置模块按来源分层：本机设置、账号服务端设置、企业规则和系统能力接入状态一眼可辨；未接入能力不再显示成可正常保存的开关。

## 修改范围

- `settings/models/settingsCatalog`：新增 settings catalog，统一 5 个分组、来源标签、能力状态和行级元数据。
- `MePage`：按 `账号与身份 / 隐私与好友 / 消息与客服提醒 / 聊天与工作台 / 本机与诊断`重组设置页。
- `SettingsRows`：扩展来源 badge、能力状态、禁用原因和行内保存状态。
- `MePrivacySections`、`ChatArchiveSection`、`AccountSecuritySection`、`DiagnosticsSettingsSection`：复用 catalog 元数据，保持原 API/query/diagnostics owner。

## 风险边界

- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key，继续使用 `lpp.pc.settings`。
- 不新增依赖。
- 不接入真实开机自启、托盘、线路切换等 Electron 系统能力，只展示待接入状态。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx vitest run tests/unit/settings-catalog.spec.ts` | 通过 | 覆盖 5 个设置分组、来源语义、未接入能力不渲染为 fake switch。 |
| `npx vitest run tests/unit/settings-catalog.spec.ts tests/unit/pc-settings.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts` | 通过 | 覆盖 catalog、既有 settings store、诊断和架构边界。 |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 | 验证 renderer 类型闭环。 |
| `npm run check:quick` | 通过 | 类型检查、Electron 类型检查、核心 lint、hooks lint、架构边界、docs、P19 审计和 shape 均通过。 |
| `git diff --check` | 通过 | 未发现空白错误或冲突标记。 |

## 浏览器验证

- 已通过登录后的 in-app browser 验证 `http://127.0.0.1:5173/` 设置页。
- DOM 结果：左侧只有 5 个设置分组；来源说明包含 `本机 / 账号 / 企业 / 系统`；`开机自启 / 最小化到托盘 / 网络线路 / 界面语言 / 时区 / 断线自动重连 / 弱网诊断`均为 disabled 行，显示 `待接入`或`仅记录`。
- 截图证据：`/private/tmp/p26-settings-source-layers.png`。

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否。 |
| 原因 | 本轮只重组设置 UI 与来源元数据，不新增核心链路、副作用或系统能力。 |
| 既有诊断 | 设置持久化继续走 `settings-diagnostics`，诊断包导出继续走 `settings/runtime/diagnosticsExport`。 |

## 遗留风险

1. 开机自启、托盘、线路切换、语言和时区只是稳态展示，真实接入需另起 Electron/运行时任务。
2. 企业级设置目前仅做来源与待接入口径，不伪造管理员配置能力。
