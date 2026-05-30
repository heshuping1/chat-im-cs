# P13-GOV-005 Electron 边界守卫验证

日期：2026-05-30

## 变更

- 在 P13 职责审计清单中记录 screenshot window、preload 暴露和 desktopApi 的边界。
- 将截图窗口配置/HTML 模板拆分登记为 `P14-RESP-003`。
- 扩展架构边界测试，固定 renderer 直接 `desktopApi` 调用白名单，防止新增私有能力入口。

## 验证命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```

## 结果

- preload 暴露名继续限制为 `desktopApi` 和 `screenshotSelector`。
- renderer 不得新增散落的 direct desktopApi 调用。

## 遗留

- Windows 实机验证仍待 `P16-WIN-001` 覆盖。
