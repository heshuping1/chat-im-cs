# P8-PERF-002C Bundle Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | renderer/shared 类型检查。 |
| `npm run build` | 通过 | production build、Vite bundle、Electron typecheck 均通过。 |

## 优化后产物

| 产物 | 原始体积 | gzip |
| --- | ---: | ---: |
| `index-*.js` | 145.83KB | 40.22KB |
| `vendor-react-*.js` | 193.13KB | 61.13KB |
| `vendor-editor-*.js` | 171.52KB | 55.90KB |
| `MessageCenter-*.js` | 107.61KB | 31.87KB |
| `conversation-domain-*.js` | 75.80KB | 24.02KB |
| `GatewayBridge-*.js` | 40.91KB | 8.99KB |
| `vendor-realtime-*.js` | 55.54KB | 14.36KB |
| `vendor-qrcode-*.js` | 25.40KB | 9.85KB |

## 结果

- 入口业务 JS 从约 438.55KB 降到约 145.83KB。
- SignalR/realtime 从入口拆到登录后 Gateway chunk。
- Lexical 编辑器从业务共享 chunk 拆到 `vendor-editor`。
- qrcode 从业务 chunk 拆到 `vendor-qrcode`。

## 注意

一次误执行 `npm run build -- --emptyOutDir=false` 时，Vite build 已完成，但额外参数被传给 Electron `tsc` 后失败；最终以无额外参数的 `npm run build` 为有效验证。
