# P8-ARCH-001C Boundary Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/architecture-boundaries.spec.ts` | 通过 | 验证 renderer/main/preload/shared 依赖方向和 preload 暴露 API。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | renderer/shared 类型检查。 |

## preload 暴露白名单

- `desktopApi`
- `screenshotSelector`

## 遗留风险

1. 当前 import 扫描不是完整 AST parser，复杂动态表达式不会识别。
2. 业务级边界仍需后续逐步加入，例如页面禁止解释 Gateway raw payload、DTO 必须经 normalizer。
