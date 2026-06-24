# 在线客服(Widget)消息发件人头像 `senderAvatarUrl`

> 增量补充:2026-06-17。在线客服 Web 挂件的消息体新增**发件人头像**字段 `senderAvatarUrl`,供客户端在客服/AI 消息气泡旁展示头像。

适用接口(`/api/widget/v1/*` 与对应实时帧):

| 出处 | 字段路径 |
|---|---|
| `GET /api/widget/v1/sessions/{sessionId}/messages` 列表项 | `senderAvatarUrl` |
| 发送消息返回 `POST /api/widget/v1/sessions/{sessionId}/messages` 的 `data` | `senderAvatarUrl` |
| 实时帧 `msg.new`(`/ws/widget`)的 `data` | `senderAvatarUrl` |

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `senderAvatarUrl` | string? | 发件人头像 URL。**仅客服/AI 发件人有值;访客自己的消息恒为 `null`。** 客服未设头像时也为 `null`。当头像为平台托管资源时,该 URL **已带签名**(形如 `…/media/{id}?tenantId=…&exp=…&sig=…`),可直接作为图片地址加载,**无需附加任何 token / 鉴权头**;若客服头像是外部地址,则原样返回该外部 URL。 |

该字段为**可选新增**,旧客户端忽略即可,不影响既有解析。

## 客户端使用建议

1. 消息模型增加可选字段 `senderAvatarUrl?: string | null`。
2. 渲染客服/AI 气泡:`senderAvatarUrl` 非空时直接用作 `<img src>`(已签名或外部直链,**不要再拼接 token**);为空时回退到「显示名首字母」占位,避免空白。
3. 访客自己的气泡不展示头像(该字段恒为 `null`)。
4. 实时帧若来自旧版本服务未带该字段,按 `undefined` 处理(回退占位),与历史列表一致。
