# P8-ARCH-001A Boundary Inventory

日期：2026-05-29

## 可机械校验边界

- renderer 不能导入 main/preload。
- renderer 不能直接导入 Electron/Node runtime 模块。
- main/preload 不能导入 renderer。
- shared 不能导入 renderer/main/preload。
- preload 只能通过命名最小 API 暴露能力。

## 暂不机械校验的边界

- 页面是否直接解释 raw DTO。
- Gateway raw event 是否只走 adapter。
- API contract 是否覆盖所有后端字段。

这些边界仍需要后续结合 AST/lint 和现有重构成果逐步收紧，避免一次性引入大量历史违规导致门禁无法落地。
