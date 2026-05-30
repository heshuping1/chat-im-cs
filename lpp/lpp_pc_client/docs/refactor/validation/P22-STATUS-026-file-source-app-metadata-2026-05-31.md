# P22-STATUS-026 文件来源跟随客户端程序名验证记录

日期：2026-05-31

## 目标

文件卡片底部来源不再由 `FileMessageCard` 硬编码具体产品名，而是跟随客户端程序名。当前 source of truth 为 `package.json` 的 `build.productName`，通过 Vite build-time define 注入 renderer app metadata，再由消息文件内容 owner 显式传给文件卡片。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不读取运行时 package 文件，不扩大 Electron 边界。

## 修改范围

- `vite.config.ts`
  - 读取 `package.json build.productName`，注入 `__LPP_PC_PRODUCT_NAME__`。
- `src/renderer/app/appMetadata.ts`
  - 新增 renderer app metadata owner，导出 `appProductName`，异常时使用稳定 fallback。
- `src/renderer/vite-env.d.ts`
  - 声明构建期只读常量。
- `src/renderer/messages/components/message-content/FileMessageContent.tsx`
  - 显式把 `appProductName` 传入 `FileMessageCard`。
- `src/renderer/media/components/FileMessageCard.tsx`
  - 内部 fallback 改为中性 `客户端`，不再写死具体产品名。
- `tests/unit/media-message.spec.ts`
  - 锁定 productName define、app metadata helper、显式传参和组件不硬编码具体产品名。

## 验证命令

```bash
npx vitest run tests/unit/media-message.spec.ts
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

- 单项验证：`npx vitest run tests/unit/media-message.spec.ts` 通过，1 个测试文件、11 tests。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、36 tests。
- `npm run p10:audit`：通过；`compat-store-imports/public-ability-signals/date-format-signals/type-escape-signals/global-css-signals/tracked-generated-artifacts` 均为 `none`，`orphan-source-candidates` 仍为既有 `src/renderer/App.tsx` 观察项。
- `npm run p12:audit`：通过；CSS/组件观察项为 `none`，data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过；`ai-context-split-candidates = none`。新增 `src/renderer/app/appMetadata.ts` 被列为过碎观察信号，但本轮保留为明确 app metadata owner，避免消息组件直接消费构建全局。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文件卡片底部来源显示 `package.json build.productName` 对应的客户端程序名。
2. `FileMessageCard` 不再硬编码 `LPP 客服客户端`。
3. 后续修改客户端程序名时，renderer build 输出自动跟随。
