# PC 端重构后收尾治理计划

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 定位

P0-P9 已完成 PC 客服 IM 客户端的核心重构：Gateway、Store、API contract、消息底座、普通 IM、客服、公共 UI、Electron 安全、性能、工程门禁和文档闭环已经建立。

P10 不再以“继续大重构”为目标，而是做四件事：

1. 发布前验证：尤其补 Windows 打包态实机证据。
2. 清理重构残留：删除无用代码、旧入口、旧样式、旧测试。
3. 固化约束：防止重复实现和边界回流。
4. 坏味道审计：把剩余维护风险拆成小任务。

## 2. 当前结论

当前架构主链路已经闭环，但还不能直接宣布“发布完成”。

原因：

1. 最终用户是 Windows PC 端，当前只完成 Mac 环境 build、audit、quick、coverage 验证。
2. 重构过程中保留过兼容层和回滚点，收尾阶段必须重新判断是否还能删除。
3. 公共能力已经抽出，但必须用规则和结构测试防止后续重复实现。
4. 坏味道不应该靠感觉修，要先审计、分级、建任务，再小步删除。

## 3. 下一阶段优先级

| 优先级 | 事项 | 原因 | 输出 |
| --- | --- | --- | --- |
| P0 | Windows 打包态验证 | 最终交付平台是 Windows，必须补真实证据。 | P10-WIN 验证记录。 |
| P1 | 无用代码盘点和删除 | 重构后旧代码残留会误导后续开发。 | dead code 清单、删除 PR、验证记录。 |
| P1 | 重复实现约束 | 防止“头像/空态/媒体/通知/日志”等公共能力再次散落。 | reuse governance 文档、lint/architecture gate。 |
| P1 | 坏味道审计 | 找出剩余维护风险，避免下一轮靠主观判断。 | code smell backlog。 |
| P1 | 发布检查清单 | 让后续每次发布都有稳定流程。 | release checklist 和 rollback note。 |
| P2 | Electron 42 后续评估 | 当前 Electron 39 已清零 audit；Electron 42 是独立技术栈升级。 | 单独升级评估。 |

## 4. Windows 待办

等切到 Windows 环境后执行：

```bash
npm install
npm run check:quick
npm run build
npm run dist:win
```

手工验收：

1. 安装包名称、图标、安装目录、桌面快捷方式、开始菜单快捷方式。
2. 应用启动、主窗口尺寸、托盘状态、退出逻辑。
3. 登录态写入和重启恢复，重点关注 `safeStorage`。
4. 截图选择窗口：多屏、取消、选区、粘贴到输入框。
5. 文件打开、复制、另存、显示位置。
6. 视频预览窗口。
7. diagnostics 导出，确认不包含 token、Authorization header、敏感 raw payload。
8. 导出 diagnostics 后执行：

```bash
npm run perf:samples -- <diagnostics.json>
```

## 5. 无用代码清理策略

清理顺序：

1. 先盘点，不先删。
2. 标记旧入口、旧 helper、旧组件、旧 CSS、旧测试和旧文档引用。
3. 按模块小批删除，每批只删除一个 owner 范围。
4. 删除后必须跑 `npm run check:quick`；涉及核心模型时加 `npm run test:coverage:core`。
5. 删除兼容层前必须确认没有外部调用和回滚需求。

重点检查：

1. 旧 `useWorkspaceStore` 兼容入口。
2. 重构后未再使用的 message/customer-service hooks。
3. 局部头像、空态、badge/time、媒体动作实现。
4. 被迁移到 feature/shared 后遗留的 `app.css` selector。
5. 旧 validation 记录中提到但代码已不存在的风险引用。

## 6. 重复实现约束

以下能力默认禁止重复实现，新增需求必须优先复用现有 owner：

| 能力 | 默认 owner | 约束 |
| --- | --- | --- |
| 头像/身份展示 | `PcAvatar`、avatar identity model | 不在页面内手写头像 fallback 和颜色规则。 |
| 空态/错误态/加载态 | `PanelState` | 不新增局部 PanelState 变体。 |
| badge/time | shared view helper | 不在页面重复写 `new Date` 格式化和 unread 判断。 |
| 媒体桌面动作 | message media runtime/action model | 不在 IM/客服页面重复包装 copy/open/save。 |
| 通知/提醒 | reminder/notification service | 不在页面直接散落 notification 逻辑。 |
| Gateway 事件 | adapter/dispatcher/handler | 不在页面解释 raw Gateway payload。 |
| API DTO | contract normalizer | 页面/feature 不直接解释 raw DTO。 |
| 诊断日志 | data diagnostics / runtime diagnostics | 不在业务页面散落 `console.*` 或自定义日志格式。 |

后续应把高风险约束逐步接入：

1. `scripts/check-code-shape.mjs`
2. `tests/unit/architecture-boundaries.spec.ts`
3. `eslint.config.js`

## 7. 技术选型规则

不重复造轮子，但也不为了“开源成熟”盲目加依赖。

新增依赖前必须回答：

1. 这个能力是否已有本地实现或平台 API？
2. 自研成本和维护成本是否高于引入成熟库？
3. 库是否活跃、体积是否可接受、许可证是否可接受？
4. 是否影响 Electron 主进程、preload、renderer 的安全边界？
5. 是否有 tree-shaking、按需加载或动态加载方案？
6. 如果将来替换，隔离层在哪里？

默认策略：

1. 复杂编辑器、虚拟列表、拖拽、富媒体处理、日期国际化等优先成熟库。
2. 简单 view helper、业务状态机、DTO normalizer、权限矩阵优先本地实现。
3. 新依赖必须先登记任务并说明理由。

## 8. 坏味道审计清单

P10-SMELL 审计至少覆盖：

1. 文件体积：接近或超过 shape 阈值的文件。
2. 重复逻辑：同类 UI、格式化、状态判断、错误处理重复。
3. 过宽 props：组件 props 超过合理范围，说明组件边界不清。
4. 隐式 any：类型逃逸、`as any`、宽泛 `Record<string, unknown>` 滥用。
5. 魔法字符串：事件名、query key、storage key、状态枚举散落。
6. 散落副作用：页面内直接处理缓存、日志、通知、存储。
7. CSS 泄漏：全局 selector 影响 feature 样式。
8. 兼容层过长：旧入口长期保留但没有 owner 和删除计划。
9. 测试盲区：核心链路有代码无测试或只有快照式测试。
10. 文档漂移：方案、矩阵、代码行为不一致。

## 9. 建议执行顺序

1. P10-WIN-001：Windows 打包态验证。
2. P10-CLEAN-001A：无用代码盘点。
3. P10-GOV-001A：重复实现禁止清单。
4. P10-SMELL-001A：坏味道审计。
5. 基于审计结果拆小任务，不一次性大删。
6. P10-REL-001A：发布检查清单和回滚说明。

## 10. 完成标准

P10 完成时应满足：

1. Windows 安装包可构建、可安装、可启动、核心桌面能力可用。
2. 已知无用代码已删除或记录保留理由。
3. 公共能力复用规则可查，并至少有第一批机械约束。
4. 坏味道清单可查，P0/P1 修复任务已拆分。
5. 发布前检查清单可查，后续新会话无需依赖聊天上下文。
