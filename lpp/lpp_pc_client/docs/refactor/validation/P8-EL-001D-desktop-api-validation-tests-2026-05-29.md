# P8-EL-001D Desktop API Validation Tests

日期：2026-05-29

## 测试

新增 `tests/unit/desktop-api-validation.spec.ts`，覆盖：

- notification/tray/no-argument calls。
- media payload 正常路径和非法 kind。
- video metadata number coercion。
- poster data URL 约束。
- diagnostics 数量上限和必填字段。
- null byte 和超大 `saveFile.content` 拒绝。

## 快速验证

- `vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/media-message.spec.ts tests/unit/reminder-service.spec.ts`
- `tsc -p tsconfig.electron.json --noEmit --pretty false`
- `tsc --noEmit --pretty false --skipLibCheck`
- `git diff --check -- src/shared/desktop-api.ts src/shared/desktop-api-validation.ts src/preload/preload.cts tests/unit/desktop-api-validation.spec.ts`
