# P9-DOC-001 doc garden focus 验证记录

日期：2026-05-30

## 目标

- 降低 `docs:garden` 噪音，让 Codex 新会话优先看到活跃文档中的可行动线索。
- 避免历史 validation 记录中的“后续/暂未”等上下文性文字被逐条误报为当前阻塞。

## 变更

- `report-refactor-doc-gaps.mjs` 将 validation 历史记录汇总展示，不再逐条展开。
- `temporary-wording` 移除泛化的“后续”匹配，仅保留 `暂未`、`TODO`、`FIXME`。
- 巡检脚本忽略自身说明、状态枚举说明和业务状态文案，减少误报。
- `文档巡检机制.md` 和任务矩阵同步新的巡检描述。
- 同步 RISK-004 状态：消息与客服大页面经 P5/P6/P9 拆分和 `lint:shape` 门禁后，已从待处理调整为已缓解。

## 验证

- `npm run docs:garden`
  - 结果：通过；活跃文档信号为 none，validation archive 汇总为 9 处、4 个文件。
- `npm run check:quick`
  - 后续统一执行。

## 结论

P9-DOC-001 已完成。文档巡检从“全量噪音提示”调整为“活跃文档优先 + 历史记录汇总”，更适合 Codex 在新会话中快速定位真实待办。
