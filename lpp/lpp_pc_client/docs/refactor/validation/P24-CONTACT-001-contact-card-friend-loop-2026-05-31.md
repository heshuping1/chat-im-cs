# P24-CONTACT-001 名片消息与好友关系闭环验证记录

## 背景

按服务端 client API 合同补齐 PC 端普通 IM 的名片消息和好友关系动作。用户要求保留头像功能，但禁用群成员头像资料查看和成员列表；名片消息要参考微信的信息密度，同时与当前主题一致。

## 风险边界

- 涉及：API client/DTO、`messageType=contact_card` 发送 wire shape、React Query 缓存失效、消息/联系人 UI。
- 不涉及：Electron IPC/preload/main、Gateway event、Zustand persist key、新依赖、技术替换、删除旧链路。

## 修改范围

- 新增 `contactCardModel`，统一名片字段兼容、发送 body 和好友关系状态。
- 新增服务端合同方法：发送好友申请、删除好友、加入黑名单、查看用户资料、发送 `contact_card` 消息。
- 输入框“更多”开放“名片”入口，选择联系人后确认发送。
- 名片消息点击打开关系感知资料弹窗：本人、好友、非好友、已申请、收到申请分别展示不同动作。
- 群资料移除成员列表页签；群成员消息头像点击不再弹资料卡，但群头像、消息头像和 @ 数据仍使用现有数据链路。

## 验证命令

- `npx vitest run tests/unit/contact-card-model.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/message-display-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/media-message.spec.ts tests/unit/im-core.spec.ts`：通过，6 个文件 101 条测试通过；Vitest 输出 `localStorage` experimental warning，不影响结果。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、architecture/desktop API 单测、docs、P19 audit 和 shape 检查。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收建议

1. 群聊头像正常展示，群资料不展示成员列表；点击群成员消息头像不弹资料卡。
2. 普通 IM 输入框“更多 > 名片”可打开联系人选择器，选择后发送名片消息。
3. 点击好友名片显示资料弹窗，可发消息、删除好友、加入黑名单。
4. 点击非好友名片可发送好友申请，成功后进入“好友申请已发送”状态。
5. 收到好友申请的名片状态可通过或拒绝。

## 诊断与隐私

- 发送名片复用现有 send diagnostics，新增 `P24-CONTACT-001` taskId，不记录完整资料 payload。
- API 错误通过产品文案展示，服务端 raw code 只用于本地判断，不直接暴露给用户。
