# PC 端公共能力复用与技术选型约束

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 目标

重构后的核心风险不再是“没有架构”，而是后续新增需求绕过现有 owner，重新出现重复实现、散落逻辑和隐式耦合。

本约束用于回答两个问题：

1. 同样的能力应该复用哪里？
2. 什么时候可以引入成熟开源方案？

## 2. 禁止重复实现清单

| 能力 | 默认 owner | 禁止事项 | 允许扩展方式 |
| --- | --- | --- | --- |
| 头像/身份展示 | `PcAvatar`、avatar identity/view model | 页面内手写头像颜色、fallback、initial 规则。 | 给 `PcAvatar` 或 identity model 增加输入字段。 |
| 空态/错误态/加载态 | `PanelState` | 页面内定义局部 `PanelState` 或复制空态结构。 | 页面只提供文案和 tone。 |
| 时间/日期/badge | `src/renderer/lib/format.ts`、badge/time helper | 页面内重复 `new Date` 格式化、未读 badge 裁剪。 | 新增格式化 helper，并补测试。 |
| 媒体桌面动作 | `media/runtime/desktopMediaActions`、`messages/runtime/messageMediaActions` | IM/客服页面直接包装 copy/open/save/reveal/edit。 | UI 只触发 action，平台能力留在 runtime。 |
| 通知/提醒 | `data/reminder`、客服 notification hook | 页面直接 new notification、重复去重/权限判断。 | 新增 reminder channel 或 notification adapter。 |
| Gateway 事件 | `data/gateway` adapter/dispatcher/handler | 页面或 feature 直接解释 raw event payload。 | 新事件先补 event type、adapter、handler、diagnostics、test。 |
| API DTO | `data/api-contract` 和各 domain contract | 页面或 feature 直接兼容 snake_case/legacy DTO。 | DTO 变化先补 fixture、normalizer、diagnostics。 |
| 状态 owner | auth/settings/workspace-ui/im-read/reminder owner facade | 页面/feature 直连 `useWorkspaceStore` backing store。 | 新状态先定义 owner、selector/action、持久化和回滚策略。 |
| 诊断日志 | `data/*/diagnostics`、runtime diagnostics | 业务页面散落 `console.*` 或自定义日志格式。 | 新日志先定义 module/event/phase/result/reason/context。 |
| Electron IPC | `shared/desktop-api`、`desktop-api-validation` | renderer 直接假设 IPC payload shape。 | 新方法先补 typed API、validation、main handler、测试。 |

## 3. 机械约束演进

当前已经具备：

1. `architecture-boundaries`：禁止 renderer 依赖 main/preload/Node，禁止页面直连 backing store，禁止页面直连 API contract normalizer，禁止本地 `PanelState`。
2. `architecture-boundaries`：禁止本地重新定义 `avatarInitial`，头像 fallback 生成必须集中在 `PcAvatar`。
3. `lint:shape`：阻断超大文件和非诊断 `console.*`。
4. `lint:core`：覆盖已重构核心 data/messages/customer-service/runtime diagnostics 路径。
5. `p10:audit`：报告大文件、孤儿候选、公共能力重复信号、类型逃逸和全局 CSS 风险。

后续应升级为 hard gate 的高价值约束：

1. 本地头像 fallback/initial 重复实现检测。
2. UI 组件直接调用桌面媒体 `desktopApi` 检测。
3. 页面内直接 `new Date` 格式化检测，允许 domain/model/helper。
4. CSS owner 检测，避免继续向 `app.css` 回填 feature 样式。

## 4. 技术选型规则

不重复造轮子，但也不盲目加依赖。

新增依赖必须先回答：

1. 本地是否已有 owner 或平台 API？
2. 自研复杂度是否明显高于引入库？
3. 库是否成熟、活跃、许可证可接受？
4. 包体积和首屏影响是否可接受？
5. 是否能动态加载或隔离到低频 chunk？
6. 是否影响 Electron main/preload/renderer 安全边界？
7. 是否有替换隔离层？
8. 是否需要 Windows 实机验证？

默认判断：

| 场景 | 策略 |
| --- | --- |
| 富文本编辑、虚拟列表、拖拽、日期国际化、复杂媒体处理 | 优先成熟开源方案。 |
| DTO normalizer、业务状态机、权限矩阵、诊断记录、简单 view helper | 优先本地实现。 |
| Electron 安全边界、token/session、文件系统能力 | 优先平台 API 和最小封装，不随便引库。 |
| 一次性页面展示 | 不抽通用库，除非出现第三个稳定复用点。 |

## 5. 新增能力执行要求

新增 PC 端能力前，先判断它属于：

1. Gateway 边界
2. API/DTO 边界
3. Store 状态 owner
4. Message/CS domain
5. Shared UI primitive
6. Electron IPC/platform
7. 页面 presentation

如果属于 1-6，不能直接写进页面。必须先补 owner，再由页面装配。

## 6. 验收方式

每个相关任务至少执行：

```bash
npm run check:quick
```

涉及核心模型、diagnostics 或公共能力时加：

```bash
npm run test:coverage:core
```

涉及 P10 收尾治理时加：

```bash
npm run p10:audit
```
