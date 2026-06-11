# startlink

这是 LPP 的 Windows 客服客户端工程骨架。

## 技术栈

- Electron
- React
- TypeScript
- Vite
- TanStack Query
- Zustand

## 定位

- 交付物是 Windows 本地客户端，不是线上 Web 站点。
- Renderer 前端打包为本地静态文件，由 Electron 加载。
- 客户端直接请求现有服务端 API。
- 首版聚焦客服主工作台，不承载完整管理员后台。

## 开发命令

```bash
npm install
npm run dev:browser
npm run dev
npm run typecheck
npm run build
npm run test:browser
npm run dist:win
```

`dev:browser` 只启动 React Renderer，适合开发和浏览器自动化检查；`dev` 会同时启动 Vite 和 Electron。

## 分层约定

- `src/main`：Electron 主进程，负责窗口、通知、文件、诊断导出等本地能力。
- `src/preload`：安全桥接层，只暴露 `window.desktopApi`。
- `src/renderer`：React 客服工作台 UI。
- `src/shared`：主进程和渲染进程共享类型。

## 安全约束

- Renderer 禁止直接使用 Node。
- 所有本地能力必须通过 preload 暴露的白名单接口。
- 业务权限以后端角色和权限为准，前端只做显示控制。
