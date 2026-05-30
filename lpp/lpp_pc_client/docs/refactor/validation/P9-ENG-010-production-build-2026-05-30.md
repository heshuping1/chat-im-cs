# P9-ENG-010 production build 验证记录

日期：2026-05-30

## 目标

- 在 Mac 开发环境中验证 PC 客户端重构后的 production build 闭环。
- 记录当前 renderer chunk 输出，供后续 Windows 打包态验证和性能采样对比。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run build` | 通过 | 执行 `tsc --noEmit && vite build && tsc -p tsconfig.electron.json`。 |

## 关键产物摘要

| 产物 | 大小 | gzip | 说明 |
| --- | ---: | ---: | --- |
| `dist/renderer/assets/index-BIeTqLnV.js` | 147.48 kB | 40.80 kB | renderer 主入口。 |
| `dist/renderer/assets/vendor-react-Q8QkkACn.js` | 193.13 kB | 61.13 kB | React vendor chunk。 |
| `dist/renderer/assets/vendor-editor-BzKdyyld.js` | 171.52 kB | 55.90 kB | Lexical/editor vendor chunk。 |
| `dist/renderer/assets/vendor-realtime-Z8hsA1bN.js` | 55.54 kB | 14.36 kB | SignalR/realtime vendor chunk。 |
| `dist/renderer/assets/GatewayBridge-DI4N5rgC.js` | 39.44 kB | 8.98 kB | 登录后动态加载的 GatewayBridge chunk。 |
| `dist/renderer/assets/MessageCenter-zZX-p7LN.js` | 113.35 kB | 32.75 kB | 普通 IM 页面 chunk。 |
| `dist/renderer/assets/OnlineServicePage-BNYc2Tof.js` | 41.30 kB | 12.94 kB | 客服页面 chunk。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 原因 | 本任务只执行构建验证，不改变运行时链路。 |
| Codex 检索方式 | 查看本文件或运行 `npm run build` 复现。 |
| 敏感信息处理 | 构建输出不包含 token、Authorization header 或用户个人数据。 |

## 遗留风险

1. 本记录只覆盖 Mac 开发环境 production build，不等价于 Windows 安装包实机验证。
2. `@microsoft/signalr` 构建时出现 Rollup pure annotation warning，Vite 已移除不可解释注释并完成构建；当前不影响产物生成。

## 下一步

1. Windows 环境执行安装包构建与启动验证。
2. Windows 打包态导出 diagnostics 后执行 `npm run perf:samples -- <diagnostics.json>` 回填 P75/P95 数据。
