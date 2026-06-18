# 客服工作台会话来源字段(sourceChannel / sourcePlatform)

适用接口:

- 客服端:`GET /api/client/v1/customer-service/workbench/threads`
- 管理端:`GET /api/admin/v1/customer-service/center/threads`

两个接口的 `queueItems` / `activeItems` 列表项(`CustomerServiceThreadListItemDto`)均包含来源字段,用于在「会话池」卡片上展示会话来源。

## 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `sourceChannel` | string | **来源渠道,保证非空。**`temp_session`(Web 访客)为接入渠道:`widget` / `website` 等,缺省 `website`;`direct_customer`(IM 直聊)为 IM 入口:`im_brand_inbound` / `im_staff_outbound` / `im_takeover` / `im_admin_assignment`,缺省 `im`。 |
| `sourcePlatform` | string? | **来源平台。**仅 `temp_session` 有意义:`web` / `h5` / `app` / `miniprogram`(宽松归一);无获客信息时为 `null`。`direct_customer`(IM 直聊)恒为 `null`。 |

`sourceChannel` 与 `sourcePlatform` 的取值口径与 [field-enum-reference.md](./field-enum-reference.md) 一致。

## 渲染建议

- 展示来源徽标时,优先用 `sourcePlatform` 显示更细的平台(如「APP」「网页」),为 `null` 时回退到 `sourceChannel`。
- 两者都建议按 `field-enum-reference.md` 映射成展示文案。
- `sourceChannel` 保证非空,无需对「来源缺失」做兜底文案。

## 示例

`temp_session` 排队项:

```json
{
  "threadType": "temp_session",
  "threadId": "019ed212-e4f2-7786-97be-f6f8bf2ff8c5",
  "status": "queued",
  "title": "访客",
  "sourceChannel": "website",
  "sourcePlatform": "web"
}
```

`direct_customer` 进行中项:

```json
{
  "threadType": "direct_customer",
  "threadId": "019ed20a-5b20-72b2-8ca6-e351dd01eb57",
  "status": "active",
  "title": "张三",
  "sourceChannel": "im_brand_inbound",
  "sourcePlatform": null
}
```
