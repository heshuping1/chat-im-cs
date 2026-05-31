# P26-CUSTOMER-001 Customer Profile Shared Layer

日期：2026-05-31

## 目标

建立客户信息“底层共用、场景分层”的维护边界，避免普通 IM 与在线客服复制两套客户资料页，也避免共享组件承载过多业务分支。

## 修改范围

- 共用展示层：`CustomerProfileWorkspace`、`CustomerProfileModel`、`CustomerProfileActionRows`、`CustomerProfileBits`
- IM adapter：`ConversationInfoPanel`、`MessageCenter`
- 在线客服 adapter：`CustomerContextPanel`
- API client：`customer-service-client`
- 样式：`customer-service.css`
- 测试：`customer-profile-workspace`、`customer-profile-model`、`contact-card-api`、`message-lookup-ui`

## 架构结论

- `CustomerProfileWorkspace` 继续公用，但只负责展示、布局和 `variant/errorMode` 场景配置。
- 普通 IM 使用 `variant="im"` 和 `errorMode="silent"`，profile-card 失败时降级到 `conversation/contact/profileExtra`。
- 在线客服使用 `variant="customerService"` 和 `errorMode="blocking"`，profile-card/detail 失败保留明确提示。
- profile-card 使用专用路径映射：`temp_session -> temp_session`、`im_direct -> im_direct`。
- 消息发送、线程详情、客服动作等旧 workbench 路由继续使用原有 `temp-session/direct-customer`，避免连带回归。
- 四行处理区增加稳定 DOM 标识，CSS 明确禁止 flex 压缩。

## 风险边界

- 涉及 API client 方法行为：仅限 `getThreadProfileCard` 的 profile-card 路径。
- 不新增 API DTO。
- 不改 React Query query key。
- 不改 Gateway event。
- 不改 Electron IPC/preload/main。
- 不改 Zustand persist key。
- 不新增依赖。
- 不删除旧链路。

## 验证

- `npx vitest run tests/unit/customer-profile-workspace.spec.ts tests/unit/customer-profile-model.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/message-lookup-ui.spec.ts`
- `npm run check:quick`
- `git diff --check`

## 结果

- 客户信息共用层和场景 adapter 边界已写入任务矩阵与 AI 文件路由表。
- 自动化测试覆盖：
  - IM profile-card error silent 降级。
  - 在线客服 profile-card error blocking 保留。
  - profile-card 路径使用 `temp_session/im_direct`。
  - 旧 workbench message 路径仍使用 `direct-customer`。
  - 四行区真实渲染在指标区上方。
