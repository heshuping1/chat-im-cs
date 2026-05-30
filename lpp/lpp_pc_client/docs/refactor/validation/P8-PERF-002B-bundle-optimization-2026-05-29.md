# P8-PERF-002B Bundle Optimization

日期：2026-05-29

## 修改范围

- `src/renderer/App.tsx`
  - `GatewayBridge` 从静态 import 改为登录后 `lazy()` 动态加载。
  - Gateway 仍只在已登录 shell 内挂载，业务语义保持不变。
- `vite.config.ts`
  - 配置 `manualChunks`：
    - `vendor-react`
    - `vendor-state`
    - `vendor-realtime`
    - `vendor-editor`
    - `vendor-qrcode`

## 设计理由

- Gateway/realtime 是登录后能力，未登录首屏不需要同步解析 SignalR。
- Lexical 是消息编辑器能力，应随消息/客服编辑区加载。
- qrcode 是低频弹窗能力，独立成稳定缓存 chunk。
- React 和状态库独立成 vendor chunk，便于长期缓存和后续观察入口业务代码体积。

## 回滚方式

- 删除 `vite.config.ts` 的 `rollupOptions.output.manualChunks`。
- 将 `GatewayBridge` 恢复为静态 import，并移除包裹它的 `Suspense fallback={null}`。
