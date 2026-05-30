# P18-SEC-001 Electron Security Review 验证记录

日期：2026-05-30

范围：Electron/main/preload 安全边界复核。

## 修改范围

1. `validateDesktopApiCall("openExternal")` 增加协议 allowlist 校验，仅允许 `http:`、`https:`、`mailto:`、`tel:`。
2. main 进程原有 `isAllowedExternalUrl` 二次校验保持不变。
3. `desktop-api-validation.spec.ts` 新增 `javascript:` URL 拒绝测试。

## 边界确认

不新增 IPC，不扩大 renderer 能力，不改变现有 desktopApi 方法签名。

## 验证结果

1. `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts`：通过。
2. `npm run check:quick`：通过。
