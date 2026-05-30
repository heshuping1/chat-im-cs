# P9-ENG-011 Electron/electron-builder 升级评估

日期：2026-05-30

## 背景

当前 PC 客户端生产依赖审计已通过，但完整 dev audit 仍报告 Electron 与 electron-builder 构建链高危漏洞。该项涉及桌面运行时和 Windows 安装包构建链，属于技术栈升级，不能混入普通 lint/coverage 任务直接执行。

## 当前版本

| 依赖 | 当前解析版本 | package.json 范围 | 角色 |
| --- | ---: | ---: | --- |
| `electron` | 33.4.11 | `^33.3.1` | 桌面运行时。 |
| `electron-builder` | 25.1.8 | `^25.1.8` | Windows NSIS 安装包构建。 |
| `app-builder-lib` | 25.1.8 | transitive | electron-builder 核心构建库。 |
| `tar` | 6.2.1 | transitive | 构建链解包依赖。 |

## 审计事实

| 命令 | 结果 | 结论 |
| --- | --- | --- |
| `npm audit --omit=dev --audit-level=high` | 通过，0 vulnerabilities | 生产依赖无高危。 |
| `npm audit --audit-level=high --json` | 失败，12 high | 高危集中在 dev/build/runtime 工具链。 |
| `npm audit fix --dry-run --json` | 建议直接升级到 `electron@42.3.0`、`electron-builder@26.8.1`，并可单独修复 `tmp`、`glob` | `audit fix --force` 会跨多个 Electron major，风险偏高。 |

主要漏洞来源：

1. `electron <=39.8.4`：包含多个 Electron runtime 安全公告，其中高危包括 offscreen child window paint callback、fullscreen/pointer-lock/keyboard-lock permission callback、PowerMonitor、renderer command-line switch injection 等。
2. `electron-builder 23.0.7 - 26.5.0`：通过 `app-builder-lib`、`@electron/rebuild`、`node-gyp`、`tar`、`cacache` 等带入构建链高危。
3. `glob 10.2.0 - 10.4.5`、`tmp <0.2.6`：可由非破坏性 lockfile 修正，但不是主风险。

## 方案比较

| 方案 | 版本 | 安全收益 | 破坏性 | 结论 |
| --- | --- | --- | --- | --- |
| A. 不升级 | 保持 Electron 33 / builder 25 | 无 | 无 | 不建议。Windows 客户端运行时和构建链安全债继续存在。 |
| B. 最小安全升级 | `electron@39.8.10` + `electron-builder@26.8.1` | 清零当前 high audit | 中 | 推荐。跨 Electron 33 -> 39，但不跳到 latest 42。 |
| C. 直接 latest | `electron@42.3.0` + `electron-builder@26.8.1` | 清零当前 high audit，贴近 latest | 高 | 暂不建议。Electron 42 要求 Node `>=22.12.0`，且 Chromium/Node/Electron 主版本跨度更大。 |

## 临时副本验证

为避免污染当前工作区，已在 `/private/tmp/lpp-pc-electron-upgrade-eval-1780077557` 临时副本中验证方案 B。

执行步骤：

```bash
npm install --ignore-scripts --no-audit
npm install -D electron@39.8.10 electron-builder@26.8.1 --ignore-scripts --no-audit
npm audit --audit-level=high --json
npm run build
npm run check:quick
```

验证结果：

| 项 | 结果 |
| --- | --- |
| `electron` | 39.8.10 |
| `electron-builder` | 26.8.1 |
| audit high | 0 |
| `npm run build` | 通过 |
| `npm run check:quick` | 通过 |

## 项目风险面

当前 main/preload 边界已具备较好的升级缓冲：

1. `BrowserWindow` 主窗口、截图窗口、视频窗口均启用 `contextIsolation: true`、`nodeIntegration: false`。
2. `setWindowOpenHandler` 和 `will-navigate` 已拦截外部跳转。
3. `desktopApi` IPC 已有 runtime validation。
4. `safeStorage` 已封装到 `auth-session-storage`。
5. 仍需关注：截图窗口和视频窗口使用 `sandbox: false`，升级后应做 Mac 实机启动、截图、视频预览和 Windows 打包态回归。

## 推荐结论

建议执行方案 B：先升级到 `electron@39.8.10` 与 `electron-builder@26.8.1`，不要直接执行 `npm audit fix --force` 跳到 Electron 42。

理由：

1. 能清零当前 high audit。
2. 避免直接跨到 Electron 42 带来的 Node engine、Chromium 行为和 Electron API 变化风险。
3. 临时副本已证明 TypeScript、production build、quick gate 都能通过。
4. 更符合当前重构原则：可回滚、可验证、小步升级。

## 执行验收建议

正式升级时至少执行：

1. `npm install -D electron@39.8.10 electron-builder@26.8.1`
2. `npm audit --audit-level=high`
3. `npm run check:quick`
4. `npm run build`
5. Mac 本机启动验证：
   - 登录页渲染。
   - 主窗口打开。
   - 外部链接拦截。
   - 截图选择窗口。
   - 视频预览窗口。
   - diagnostics 导出。
6. Windows 环境验证：
   - `npm run dist:win`
   - 安装包安装、启动、托盘、截图、文件打开、safeStorage 登录态恢复。

## 遗留风险

1. 当前评估没有在 Windows 实机执行 `dist:win`，Windows 安装包行为仍需单独验证。
2. `electron-builder@26.8.1` 虽然修复当前 audit，但安装包输出细节可能变化，必须检查 artifact 名称、NSIS 图标、安装目录和快捷方式。
3. Electron 39 到 42 仍应作为后续独立升级项，不建议与本次安全修复混做。
