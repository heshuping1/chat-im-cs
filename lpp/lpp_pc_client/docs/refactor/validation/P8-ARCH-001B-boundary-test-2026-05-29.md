# P8-ARCH-001B Boundary Test

日期：2026-05-29

## 修改范围

- 新增 `tests/unit/architecture-boundaries.spec.ts`。

## 已覆盖规则

- renderer 不允许直接依赖：
  - `src/main`
  - `src/preload`
  - `electron`
  - `node:*`
  - `fs/path/child_process`
- main/preload 不允许导入 renderer。
- shared 不允许导入 renderer/main/preload。

## 设计理由

- 先建立能通过的机械门禁，避免架构规则只停留在文档。
- 使用 Node fs/path 做静态 import 扫描，不新增 ESLint 依赖。
- 后续 P8-ENG-007 可把规则升级为更完整的 lint。
