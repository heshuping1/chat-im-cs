# P8-PERF-002A Bundle Inventory

日期：2026-05-29

## 优化前产物

基于已有 `dist/renderer/assets` 和一次 Vite production build 观察：

| 产物 | 原始体积 | gzip |
| --- | ---: | ---: |
| `index-*.js` | 438.55KB | 124.24KB |
| `conversation-domain-*.js` | 254.78KB | 81.52KB |
| `MessageCenter-*.js` | 132.93KB | 41.79KB |
| `index-*.css` | 231.74KB | 38.73KB |

## 发现

- `GatewayBridge` 静态进入 `App`，导致 SignalR/realtime 依赖进入入口路径。
- Lexical 编辑器依赖较重，应作为消息编辑器相关 vendor chunk，而不是混在入口或领域共享 chunk 中。
- qrcode 属于低频弹窗能力，应独立成可缓存 chunk。

## 约束

- 不新增 bundle analyzer 依赖。
- 不改变登录、Gateway、消息发送核心业务语义。
- 首批优化只做 chunk 边界和登录后动态加载，不做大规模组件重写。
