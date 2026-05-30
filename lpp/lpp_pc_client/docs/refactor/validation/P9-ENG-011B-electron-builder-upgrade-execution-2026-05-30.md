# P9-ENG-011B Electron/electron-builder 升级执行记录

日期：2026-05-30

## 目标

- 按 P9-ENG-011A 评估结论执行最小安全升级。
- 清零当前 Electron/electron-builder dev audit high 风险。
- 不直接跳到 Electron 42，降低桌面运行时升级破坏面。

## 变更

| 依赖 | 升级前 | 升级后 | 说明 |
| --- | ---: | ---: | --- |
| `electron` | 33.4.11 | 39.8.10 | 修复当前 `<=39.8.4` 范围内 Electron runtime 安全公告。 |
| `electron-builder` | 25.1.8 | 26.8.1 | 修复 `app-builder-lib`、`tar`、`@electron/rebuild`、`node-gyp` 等构建链高危。 |
| `app-builder-lib` | 25.1.8 | 26.8.1 | 随 electron-builder 升级。 |
| `@electron/rebuild` | 3.6.1 | 4.0.4 | 随 app-builder-lib 升级。 |
| `node-gyp` | 9.4.1 | 12.3.0 | 随 @electron/rebuild 升级。 |
| `tar` | 6.2.1 | 7.5.15 | 随 app-builder-lib/node-gyp 升级。 |

执行命令：

```bash
npm install -D electron@39.8.10 electron-builder@26.8.1
```

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/electron --version` | 通过 | 输出 `v39.8.10`。 |
| `npm ls electron electron-builder app-builder-lib tar tmp glob @electron/rebuild node-gyp --depth=4` | 通过 | 确认解析到 Electron 39.8.10、electron-builder 26.8.1、app-builder-lib 26.8.1、tar 7.5.15。 |
| `npm audit --audit-level=high` | 通过 | 输出 `found 0 vulnerabilities`。 |
| `npm run check:quick` | 通过 | TS、Electron TS、core lint、架构边界、desktop API validation、docs、shape gate 全部通过。 |
| `npm run build` | 通过 | production renderer build 与 Electron TS 编译通过。 |
| `npm run test:coverage:core` | 通过 | 58 个测试文件、258 个测试用例通过。 |

核心覆盖率结果：

| 指标 | 结果 |
| --- | ---: |
| Statements | 69.18% |
| Branches | 58.76% |
| Functions | 74.70% |
| Lines | 72.99% |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 原因 | 本任务只升级桌面运行时和构建链依赖，不改变业务运行时日志结构。 |
| 可排查问题 | 通过 `electron-runtime`、`runtime-error`、diagnostics package 继续排查升级后的主进程/渲染进程异常。 |
| Codex 检索方式 | `rg -n "P9-ENG-011B|electron-builder|39.8.10|26.8.1" docs/refactor package.json package-lock.json`。 |
| 敏感信息处理 | 验证输出不包含 token、Authorization header 或用户个人数据。 |

## 遗留风险

1. Mac 本地 production build 已通过，但尚未启动 Electron 应用做截图、视频预览、托盘、safeStorage 登录态恢复的人工回归。
2. Windows 打包态尚未验证。仍需在 Windows 环境执行 `npm run dist:win`，检查 NSIS 安装包、图标、安装目录、快捷方式、启动、托盘、截图、文件打开和 diagnostics 导出。
3. Electron 42 仍作为后续独立技术栈升级项，不纳入本次最小安全修复。

## 结论

P9-ENG-011B 已完成。当前完整 `npm audit --audit-level=high` 已清零，Mac 可执行工程门禁和 production build 均通过。
