# P26-SETTINGS-003 Settings Visible Copy Distillation

日期：2026-05-31
执行人：Codex

## 背景

P26-SETTINGS-002 将设置页来源文案改成用户语言，但行级常驻 `仅当前电脑 / 所有设备同步 / 由管理员配置` 仍然让页面像“设置架构说明”。本轮继续收敛：这些同步范围概念保留在内部模型中，默认不进入设置 UI。

## 修改范围

- `settingsCatalog`：保留 `source/capability`，移除展示层 `scopeLabel` 派生；`settingSourceMeta` 改为内部语义标签。
- `SettingsRows`：普通设置行不再渲染 source/scope pill，只展示标题、说明、控件和保存状态。
- `MePage`：Hero 文案改为当前可用能力优先；个人资料行不再传来源展示。
- `AccountSecuritySection`、`MePrivacySections`：移除子卡片头部来源 pill。
- `settings.css`：删除 source/scope pill 样式，保留保存状态和未支持状态样式。
- `settings-catalog.spec.ts`：新增去标签化回归，防止同步范围标签回流到可见设置组件。

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
- DOM 不出现 `所有设备同步`、`仅当前电脑`、`由管理员配置`、`客户端能力`、`Electron main/preload`、`服务端口径`。
- `.settings-scope-pill` 和 `.settings-source-pill` 数量均为 0。
- “待支持能力”仍显示能力名与 `暂未支持`。
- 截图：`/private/tmp/p26-settings-no-labels.png`

## 备注

本轮不接入新的开机自启、托盘、语言、时区或线路切换能力。后续如需真实生效，需要单独确认 Electron IPC/preload/main 和持久化边界。
