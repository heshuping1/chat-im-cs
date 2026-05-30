# P8-EL-002D Token Storage Tests

日期：2026-05-29

## 测试

更新：

- `tests/unit/auth-session.spec.ts`
  - secure desktop API 保存。
  - secure desktop API 清理。
  - 异步读取 secure auth session。
- `tests/unit/desktop-api-validation.spec.ts`
  - `saveAuthSession` payload validation。

## 快速验证

- `vitest run tests/unit/auth-session.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/desktop-api-validation.spec.ts`
- `tsc -p tsconfig.electron.json --noEmit --pretty false`
- `tsc --noEmit --pretty false --skipLibCheck`
- `git diff --check` 覆盖 auth/preload/main/shared/test 文件。
