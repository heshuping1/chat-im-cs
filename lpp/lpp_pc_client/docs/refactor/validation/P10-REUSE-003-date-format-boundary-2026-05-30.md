# P10-REUSE-003 date format boundary 验证记录

日期：2026-05-30

任务编号：P10-REUSE-003

## 变更

- `npm run p10:audit` 新增 `date-format-signals`。
- 报告 renderer 页面、customer-service、messages、settings 中的展示型 `new Date` / `toLocale*` / `Intl.DateTimeFormat` 候选。
- 本批只做报告，不升级 hard gate。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npm run p10:audit` | 通过，输出 date-format-signals |
| `npx tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 下一步

1. 人工区分排序/状态计算和展示格式化，再将高置信展示格式化迁到 `src/renderer/lib/format.ts`。
