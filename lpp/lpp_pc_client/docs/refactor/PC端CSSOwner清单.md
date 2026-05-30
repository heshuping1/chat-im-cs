# PC 端 CSS owner 清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client/src/renderer/styles`

## 1. 目的

P10 不直接大搬 `app.css`，先建立 selector owner 和迁移队列。后续每批 CSS 迁移必须能回答：

1. selector 属于哪个业务 owner。
2. 是否仍被生产组件使用。
3. 迁移到哪个 feature/shared stylesheet。
4. 是否需要视觉 smoke。

## 2. 当前文件体积

| 文件 | 行数 | 结论 |
| --- | ---: | --- |
| `src/renderer/styles/app.css` | 108 | 已降为基础变量、reset 和全局 focus 行为。 |
| `src/renderer/styles/messages/message-center.css` | 1829 | 低于 2000 行阈值，继续作为消息域 owner。 |

## 3. Owner 分组

| Selector 信号 | 当前文件 | Owner | 建议目标 |
| --- | --- | --- | --- |
| `:root`、`body`、scrollbar、focus-visible、button/input reset | `app.css` | shared/app shell | 保留在 `app.css` 或后续 `styles/shared/base.css`。 |
| `.app-shell`、`.sidebar`、`.nav-*`、`.account-entry`、`.account-button` | `app.css` | app shell / sidebar | 后续迁到 `styles/shared/app-shell.css`。 |
| `.login-*`、`.captcha-*`、`.form-error`、`.inline-error` | `app.css` | account/auth | 后续迁到 `styles/account/auth.css`。 |
| `.account-popover*`、`.tenant-*`、账号切换相关 selector | `app.css` | account/settings | 与账号设置组件拆分时迁移。 |
| `.message-*`、`.pc-chat-*`、`.chat-*`、`.composer-*`、`.group-member-*`、`.pc-forward-*` | `app.css` 与 `message-center.css` | messages | 优先迁到 `styles/messages/message-center.css` 或更细文件。 |
| `.cs-*`、`.service-*`、`.thread-*`、`.customer-*`、`.h-service-*` | `app.css` 与 `message-center.css` 少量交叉 | customer-service | 后续迁到 `styles/customer-service/*.css`。 |
| `.settings-*`、`.me-*`、diagnostics 设置相关 selector | `app.css` | settings | 配合 P10-LARGE-004 迁到 `styles/settings/*.css`。 |
| `.contacts-*`、联系人/组织相关 selector | `app.css` | contacts | 后续迁到 `styles/contacts/*.css`。 |
| `.workbench-*`、数据中心/知识库/AI/工单页面 selector | `app.css` | workbench/pages | 后续按页面 owner 拆分。 |
| `.login-*`、`.captcha-*`、`.form-error`、`.inline-error` | `styles/account/auth.css` | account/auth | 已迁移。 |
| `.app-shell`、`.sidebar`、`.nav-*`、`.account-entry`、`.account-button` | `styles/shared/app-shell.css` | app shell / sidebar | 已迁移。 |
| `.settings-*`、diagnostics 设置相关 selector | `styles/settings/settings.css` | settings | 已迁移。 |
| `.contacts-*`、联系人/组织相关 selector | `styles/contacts/contacts.css` | contacts | 已迁移。 |
| `.h-*`、`.customer-*` 客服上下文 selector | `styles/customer-service/customer-service.css` | customer-service | 已迁移。 |
| 工作台、知识库、AI、轻奢白瓷和滚动条桥接 selector | `styles/pages/*`、`styles/shared/*` | pages/shared | 已迁移。 |
| 无组件引用或仅历史命名 selector | `app.css` | legacy | 每批迁移前用 `rg` 确认，不能直接删除。 |

## 4. 第一批迁移队列

| 优先级 | 范围 | 动作 | 验证 |
| --- | --- | --- | --- |
| P0 | `.message-*`、`.pc-chat-*`、`.composer-*` 中仍留在 `app.css` 的 selector | 迁到 `styles/messages/message-center.css`，不改视觉值。 | `npm run check:quick` + 消息页视觉 smoke。 |
| P1 | `.settings-*`、diagnostics/me page selector | 配合 P10-LARGE-004 settings 子组件拆分迁到 settings stylesheet。 | `npm run check:quick` + 设置页视觉 smoke。 |
| P1 | `.cs-*`、`.thread-*`、`.customer-*` | 迁到 customer-service stylesheet。 | `npm run check:quick` + 客服工作台视觉 smoke。 |
| P2 | `.login-*`、`.captcha-*`、account auth selector | 迁到 account/auth stylesheet。 | 登录页视觉 smoke。 |
| P2 | sidebar/app shell selector | 迁到 shared app shell stylesheet。 | 主导航、消息页、客服页 smoke。 |

## 5. 每批迁移命令

迁移前：

```bash
wc -l src/renderer/styles/app.css src/renderer/styles/messages/message-center.css
rg -n "<selector-prefix>" src/renderer src/renderer/styles/app.css
git diff -- src/renderer/styles/app.css src/renderer/styles
```

迁移后：

```bash
npm run check:quick
npm run p10:audit
npm run docs:check
git diff --check
```

如果没有可用浏览器或实机环境，验证记录必须说明未执行视觉 smoke 的原因。

## 6. 约束

1. 不在 P10-OTHER-001 中直接搬大段 CSS。
2. 不删除无法证明无引用的 legacy selector。
3. 新增页面样式不得继续写入 `app.css`，除非是全局 token/reset/app shell。
4. 每次 CSS 迁移都必须有独立验证记录，避免视觉回归被批量 diff 淹没。
