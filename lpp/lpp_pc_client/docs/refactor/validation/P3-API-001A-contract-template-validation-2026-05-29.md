# 验证记录：P3-API-001A DTO -> Domain -> ViewModel 模板与命名规则

日期：2026-05-29

任务编号：P3-API-001A

## 修改范围

- `docs/refactor/API合同与数据模型治理规范.md`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 API 合同治理的统一模板，让后续 IM 会话、IM 消息、客服线程、Gateway payload 的重构有明确的命名、目录、分层、降级、测试和日志规则。

## 现状依据

| 现有文件 | 观察 |
| --- | --- |
| `src/renderer/data/im-api-contract.ts` | 已有 `validate*Contract` 和 normalized 类型基础，但 result 语义仍是 `ok/degraded/blocking`，与后续 API error 和日志不完全统一。 |
| `src/renderer/data/im-message-normalize.ts` | 已有消息 body/media 兼容处理，可作为 message contract/domain 的迁移起点。 |
| `src/renderer/data/message-display.ts` | 混合身份判断、会话展示、未读计算，后续应拆到 domain/view model。 |
| `src/renderer/data/customer-service-display.ts` | 客服状态展示逻辑已有基础，后续应成为客服 thread domain/view model 的输入能力。 |

## 规范结论

| 项 | 结论 |
| --- | --- |
| 数据链路 | `Raw DTO -> Contract Result -> Domain Entity -> ViewModel -> Component`。 |
| DTO 命名 | 保留后端形态，使用 `*Dto`。 |
| Contract 命名 | 使用 `normalize*Dto`、`validate*Contract`。 |
| Domain 命名 | 使用 `*Entity`、`*State`，禁止兼容字段并存。 |
| ViewModel 命名 | 使用 `*ViewModel`，面向具体 UI 展示。 |
| Reason code | 使用稳定英文 code，例如 `im.message.missing_seq`。 |
| 测试要求 | 覆盖完整 DTO、兼容字段、缺核心字段、未知枚举、异常 shape。 |
| 日志要求 | 后续统一进入 `api-contract` 诊断，不落完整 raw DTO。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg --files src/renderer/data | rg 'contract|normalize|display|view|model'` | 通过 | 确认已有 contract/normalize/display 相关文件。 |
| `sed -n '1,240p' src/renderer/data/im-api-contract.ts` | 通过 | 确认现有 contract 形态和迁移基础。 |
| `sed -n '1,180p' src/renderer/data/im-message-normalize.ts` | 通过 | 确认现有消息 normalizer 基础。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为规范模板。 |
| 日志入口 | P3-API-001C 建立 `api-contract` 诊断日志。 |
| traceId/correlationId | P3-API-001C 统一定义。 |
| 可用于排查的问题 | 字段缺失、兼容降级、invalid/failed 原因将在后续任务接入。 |
| 敏感信息处理 | 文档明确禁止记录 token、Authorization、完整 raw DTO、消息正文、用户隐私字段。 |

## 结论

P3-API-001A 已完成。后续 P3 任务必须按 `API合同与数据模型治理规范.md` 执行，不允许页面继续新增 raw DTO 字段解释逻辑。
