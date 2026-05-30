# P6-CS-002A CS Thread State Invariants

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/data/api/types.ts`
- `src/renderer/data/customer-service/cs-contract.ts`

## 状态不变量

| 业务态 | 识别规则 | UI/动作不变量 |
| --- | --- | --- |
| `queued` | `queued`、`queue`、`waiting`、`pending`、包含 queue/waiting | 非只读；回复入口关闭；主动作是 `claim`。 |
| `serving` | 未命中其他规则的活动状态 | 非只读；允许人工回复；主动作是 `close`。 |
| `ai` | `bot`、包含 ai/assist | 非只读；回复入口关闭；主动作是 `takeover`。 |
| `closed` | closed/ended/finished/resolved/expired/canceled 等终态 | 只读；禁止回复；隐藏动作条。 |
| `rated` | `rated`、reviewed/evaluated 或包含 rated | 只读；禁止回复；隐藏动作条。 |
| `readonly` | readonly/read_only/history | 只读；禁止回复；隐藏动作条。 |

## 兼容决策

未知活动状态默认归入 `serving/open`。这是为了保持旧行为：旧 `customerServiceReplyGate` 对未知状态默认允许回复。
