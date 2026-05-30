# P8-ENG-005 Docs Check

日期：2026-05-29

## 修改范围

- 新增 `scripts/validate-refactor-docs.mjs`。
- 新增 `npm run docs:check`。
- `npm run check:quick` 追加 `docs:check`。

## 校验内容

- 必要文档存在。
- `docs/refactor/README.md` 链接核心文档。
- 任务矩阵状态值合法。
- 已完成任务存在对应验证记录。
- ADR 编号连续且包含必要章节。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run docs:check` | 通过 | 输出 `refactor docs ok`。 |
| `npm run check:quick` | 通过 | typecheck、Electron typecheck、边界测试、desktopApi validation、docs check 均通过。 |

## 说明

本任务不新增运行时日志，因为它是文档门禁脚本，不进入用户运行链路。
