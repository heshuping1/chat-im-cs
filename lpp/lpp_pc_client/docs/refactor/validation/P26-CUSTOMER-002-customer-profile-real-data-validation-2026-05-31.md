# P26-CUSTOMER-002 Customer Profile Real Data Validation

日期：2026-05-31

## 目标

验证普通 IM 与在线客服客户信息在登录后真实页面中的展示结果，确认四行处理区可见、错误策略符合场景、真实资料字段按当前可用数据降级展示。

## 验证环境

- 页面：`http://127.0.0.1:5173/`
- 浏览器：Codex in-app browser，已登录状态
- 验证方式：读取当前页面真实 DOM、computed style、当前页面文字；不读取或输出 token。

## 普通 IM 验证结果

选中会话：`测试客户A`

- `CustomerProfileWorkspace` 场景：`im`
- 红色阻断错误：无
- 四行区：
  - `.customer-profile-actions` 高度：`172px`
  - `flex-shrink`：`0`
  - 行：
    - `remark`：`备注 暂无备注 编辑`
    - `tags`：`标签 暂无标签 +`
    - `follow-up`：`跟进 未设置跟进 设置`
    - `tickets`：`工单 暂无工单 查看`
- 指标区位于四行区下方。
- 当前可见字段：
  - 客户 ID：`019e3a14-d731-7cbe-960c-e992d77e2fef`
  - 姓名：`测试客户A`
  - 客户来源：`客户通讯录`
  - 归属客服：`--`
  - 最后活跃：`2026-05-31`

结论：普通 IM 增强资料失败或缺字段时，页面继续展示基础会话/通讯录/profile-extra 可用资料，不再显示“客户资料暂不可用”阻断条。

## 在线客服验证结果

入口：`在线客服`

当前数据状态：

- 当前会话：`0`
- 历史会话：`50`
- 自动选中历史访客会话：`访客`

客户信息 DOM：

- `CustomerProfileWorkspace` 场景：`customerService`
- 四行区：
  - `.customer-profile-actions` 高度：`172px`
  - `flex-shrink`：`0`
  - 行：
    - `remark`：`备注 暂无备注 编辑`
    - `tags`：`标签 暂无标签 +`
    - `follow-up`：`跟进 未设置跟进 设置`
    - `tickets`：`工单 暂无工单 查看`
- 当前可见字段：
  - 客户 ID：`019e63ff-a6bc-7cf4-9e4d-d733a53e20a0`
  - 姓名：`访客`
  - 会话 tab 计数：`25`
  - 归属客服：`--`

结论：在线客服资料页复用同一四行区，并保持 `customerService` 场景。当前选中历史会话没有 profile-card 阻断错误；如 profile-card/detail 失败，在线客服仍保留 blocking 错误策略。

## API 与路径验证

自动化覆盖已确认：

- `getThreadProfileCard("im_direct", "c1")` 请求 `/api/client/v1/customer-service/workbench/threads/im_direct/c1/profile-card`
- `getThreadProfileCard("temp_session", "t1")` 请求 `/api/client/v1/customer-service/workbench/threads/temp_session/t1/profile-card`
- `sendWorkbenchTextMessage("im_direct", "c2")` 仍请求旧消息路径 `/api/client/v1/customer-service/workbench/threads/direct-customer/c2/messages`
- `getFriendProfileExtra("u2")` 请求 `/api/client/v1/friends/u2/profile-extra`
- 备注保存提交 `note`，标签保存提交 `tags`

## 验证命令

- `npx vitest run tests/unit/customer-profile-workspace.spec.ts tests/unit/customer-profile-model.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/message-lookup-ui.spec.ts`
- `npm run check:quick`
- `git diff --check`

## 限制与后续

- 本次不输出或转储登录 token。
- Codex in-app browser 的只读 `evaluate` 可读取真实 DOM 和 computed style，但不允许在页面上下文直接动态 import 或创建脚本执行任意模块；因此接口响应体以自动化 fetch mock 路径测试和真实 DOM 渲染证据共同覆盖。
- 归属客服当前真实数据仍为 `--`，后续需用有 `assignedAgentName` 的真实样本继续验证。
- 跟进接口仍未确认，继续显示 `未设置跟进`，不做本地假保存。
