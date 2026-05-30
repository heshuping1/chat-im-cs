# PC 端发布检查清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 发布前必须通过

| 类别 | 命令/动作 | 通过标准 |
| --- | --- | --- |
| 依赖安装 | `npm install` | lockfile 可复现安装。 |
| 快速门禁 | `npm run check:quick` | TypeScript、Electron TS、core lint、架构边界、docs、shape 全过。 |
| 生产构建 | `npm run build` | renderer build 与 Electron TS 编译通过。 |
| 安全审计 | `npm audit --audit-level=high` | 0 high vulnerabilities。 |
| 核心覆盖率 | `npm run test:coverage:core` | 达到当前 hard thresholds。 |
| P10 巡检 | `npm run p10:audit` | 新增信号已解释、修复或登记任务。 |
| 文档巡检 | `npm run docs:garden` | active signals 只允许明确待处理任务。 |

## 2. Windows 发布前必须通过

| 类别 | 命令/动作 | 通过标准 |
| --- | --- | --- |
| Windows 打包 | `npm run dist:win` | 生成 NSIS 安装包。 |
| 安装包 | 手工安装 | 安装目录、图标、快捷方式正确。 |
| 启动 | 打开应用 | 无白屏、无崩溃。 |
| 托盘 | 托盘显示/点击/退出 | 行为符合预期。 |
| 登录态 | 登录后重启 | `safeStorage` 恢复正常。 |
| 核心 smoke | 执行 `PC端核心路径Smoke清单.md` | 主链路通过。 |
| 性能采样 | `npm run perf:samples -- <diagnostics.json>` | P75/P95 有记录，超预算需登记。 |

## 3. 回滚原则

发布失败时优先回滚最近一批变更：

1. 依赖升级失败：回滚 `package.json` 和 `package-lock.json` 中对应依赖。
2. Electron/IPC 失败：优先回滚 main/preload/shared desktop API 相关改动。
3. Gateway/API 合同失败：回滚对应 adapter/normalizer，不在页面补兼容。
4. UI 回归：回滚对应 feature component 或 CSS owner，不改全局样式兜底。
5. 数据或安全风险：停止发布，保留 diagnostics，先修复边界问题。

## 4. 发布记录模板

```text
版本：
日期：
执行人：
平台：

验证命令：
- npm run check:quick：
- npm run build：
- npm audit --audit-level=high：
- npm run test:coverage:core：
- npm run p10:audit：
- npm run docs:garden：
- npm run dist:win：

手工 smoke：
- 登录：
- 普通 IM：
- 客服：
- 截图：
- 文件/媒体：
- 托盘：
- diagnostics：
- perf:samples：

遗留风险：
回滚点：
```
