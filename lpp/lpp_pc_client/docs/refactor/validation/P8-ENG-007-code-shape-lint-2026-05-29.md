# P8-ENG-007 Code Shape Lint

日期：2026-05-29

## 修改范围

- 新增 `scripts/check-code-shape.mjs`。
- 新增 `npm run lint:shape`。
- `npm run check:quick` 追加 `lint:shape`。

## 校验内容

- 非 allowlist 文件超过 900 行时失败。
- renderer/shared/main/preload 中非诊断路径的散落 `console.*` 失败。
- `desktopIpcChannelByMethod` 和 `validateDesktopApiCall` 缺失时失败。

## 历史 allowlist

- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/components/MePage.tsx`
- `src/main/main.ts`

这些文件当前只输出 warning，不阻断 quick check；后续继续按任务拆分。

## 验证

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run lint:shape` | 通过 | 输出历史大文件 warning 后通过。 |

## 说明

本任务不替代 ESLint。它是本项目架构重构期间的轻量 code shape 门禁，后续可以升级为正式 lint 规则。
