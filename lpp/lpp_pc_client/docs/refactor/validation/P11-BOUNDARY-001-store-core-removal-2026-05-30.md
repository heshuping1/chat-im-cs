# P11-BOUNDARY-001 Store Core 移除旧入口验证记录

日期：2026-05-30

范围：

- `src/renderer/data/workspace-ui/workspace-store-core.ts`
- `src/renderer/data/auth/auth-store.ts`
- `src/renderer/data/settings/settings-store.ts`
- `src/renderer/data/im-read/im-read-store.ts`
- `src/renderer/data/reminder/reminder-store.ts`
- `src/renderer/data/workspace-ui/workspace-ui-store.ts`
- `tests/unit/architecture-boundaries.spec.ts`
- `tests/unit/im-core.spec.ts`
- `scripts/report-p10-code-health.mjs`

## 变更摘要

1. 删除旧入口 `src/renderer/data/store.ts`，将 Zustand backing store 迁移为 `workspace-ui/workspace-store-core.ts`。
2. auth/settings/workspace-ui/im-read/reminder owner facade 全部改读新 core，避免继续依赖旧 `data/store` 路径。
3. `architecture-boundaries.spec.ts` 更新为禁止 feature/page 层直连新 backing store core。
4. 桌面媒体和桌面通知已确认分别归属 `video-player-window.ts` 与 `desktop-notification.ts` main owner，并更新审计 allowlist。

## 验证命令

```bash
rg -n "from ['\"].*data/store|from ['\"]\\.\\./store|src/renderer/data/store" src tests
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/auth-store.spec.ts tests/unit/settings-store.spec.ts tests/unit/im-read-store.spec.ts tests/unit/reminder-store.spec.ts tests/unit/workspace-ui-store.spec.ts tests/unit/im-core.spec.ts
npm run p10:audit
npm run check:quick
npm run build
npm run test:coverage:core
```

## 验证结果

- 旧 `data/store` 引用扫描：无生产引用。
- `npx tsc --noEmit --pretty false --skipLibCheck`：通过。
- focused store tests：通过，5 个文件 / 75 个测试。
- `npm run p10:audit`：通过；`compat-store-imports`、`public-ability-signals`、`type-escape-signals` 均为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。
- `npm run test:coverage:core`：通过，59 个文件 / 262 个测试；覆盖率阈值通过。

## 遗留事项

- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
