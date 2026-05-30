# PC 端 P10 代码健康审计清单

日期：2026-05-30

适用范围：`lpp/lpp_pc_client`

## 1. 审计方式

本清单来自无新增依赖的本地审计脚本：

```bash
npm run p10:audit
```

脚本只报告，不阻断。当前阶段用于发现重构后残留、重复实现风险和坏味道，不直接作为 hard gate。

## 2. 大文件信号

| 文件 | 行数 | 处理建议 |
| --- | ---: | --- |
| `src/main/main.ts` | 900 | P1。继续拆截图窗口、通知、文件动作、托盘、诊断导出等 main process capability。 |
| `src/renderer/components/MePage.tsx` | 893 | P1。设置/账号/诊断/安全模块继续拆 view components。 |
| `src/renderer/components/MessageCenter.tsx` | 884 | P2。已低于 shape hard gate，但仍接近阈值，后续新增 IM 功能不得回填主文件。 |
| `src/renderer/components/MessageComposer.tsx` | 827 | P1。需要判断是否仍是实际入口，若与 Lexical composer 重叠，进入 dead code 删除评估。 |
| `src/renderer/components/MessageBodyView.tsx` | 825 | P1。媒体展示和消息类型渲染继续拆到 message content registry。 |
| `src/renderer/components/ContactsPage.tsx` | 822 | P2。通讯录详情、申请、成员列表可继续拆 presentation。 |
| `src/renderer/components/LexicalChatInput.tsx` | 812 | P2。编辑器 glue 可接受，但新增能力必须先走 editor adapter。 |
| `src/renderer/components/CustomerProfileWorkspace.tsx` | 811 | P2。客户资料子区块可继续拆。 |

结论：当前没有超过 `lint:shape` 900 行 hard gate 的 renderer 大页面，但多个文件处于 800+ 行黄色区。P10 不建议马上大拆，建议按新增需求或 dead code 删除顺手收窄。

## 3. 无用代码候选

| 文件 | 证据 | 分级 | 处理建议 |
| --- | --- | --- | --- |
| `src/renderer/components/ResizableDivider.tsx` | `p10:audit` 显示生产 source 无入边；仅历史 validation 提到。 | 已删除 | P10-CLEAN-001B 第一批已删除。 |
| `src/renderer/lib/imagePrecache.ts` | 仅 re-export `media/runtime/imagePrecache`，生产代码直接引用 runtime 入口。 | 已删除 | P10-CLEAN-001B 第一批已删除。 |
| `src/renderer/data/im-command-executor.ts` | 当前只被 `tests/unit/im-core.spec.ts` 引用。 | 中置信 | 暂不删。先判断 `im-core.spec.ts` 是否仍是核心回归入口，或迁移到 `im-read`/message use case 测试后再删。 |
| `src/renderer/data/performance/performance-samples.ts` | 生产 source 无入边，但被单测覆盖；CLI 脚本当前重复实现采样逻辑。 | 低置信 | 不删。建议后续让 `perf:samples` 复用该模型，或记录 CLI 独立实现原因。 |

## 4. 兼容层评估

当前直接依赖 `src/renderer/data/store.ts` 的文件均为 owner facade：

1. `src/renderer/data/auth/auth-store.ts`
2. `src/renderer/data/settings/settings-store.ts`
3. `src/renderer/data/workspace-ui/workspace-ui-store.ts`
4. `src/renderer/data/im-read/im-read-store.ts`
5. `src/renderer/data/reminder/reminder-store.ts`

结论：`store.ts` 仍作为内部 backing store 保留是合理的。页面/feature 禁止直连 backing store 已由 `architecture-boundaries` 保护。P10 暂不删除 `store.ts`，只要求新增状态继续通过 owner facade。

## 5. 公共能力重复信号

| 信号 | 证据 | 判断 | 后续任务 |
| --- | --- | --- | --- |
| 头像 fallback/initial 逻辑 | `ChatMessageBubble`、`MessageListPanel`、客服 message stage 等仍出现 avatar initial 相关信号。 | 需要人工区分：有些只是使用 `avatarInitial`，不一定是重复实现。 | P10-GOV-001B 将“本地实现 avatar fallback”做成更精确的结构测试。 |
| 桌面媒体动作 | `MessageBodyView`、`ServiceMessageContextMenu`、`MessageOverlayLayer`、`video-player-window` 有直接 `desktopApi` 媒体动作信号。 | 需要区分 runtime owner 与 UI 触发点。 | 优先检查是否都经过 `desktopMediaActions` 或 `messageMediaActions`。 |
| 诊断 console | 诊断目录、状态机和脚本存在 `console.*`。 | 多数为允许的诊断输出。 | 保持 `lint:shape` 只阻断非诊断散落 console。 |

## 6. 坏味道 Backlog

| 编号 | 优先级 | 问题 | 建议任务 |
| --- | --- | --- | --- |
| SMELL-001 | P1 | `src/main/main.ts` 达到 900 行，后续任何 main 能力新增都会触发 shape 风险。 | 抽 screenshot selector window、notification、tray/file/media IPC handler 到 main 子模块。 |
| SMELL-002 | P1 | `app.css` 仍有 12597 行，是最大样式风险源。 | 继续将 feature/shared 样式迁出，并建立 CSS selector owner 清单。 |
| SMELL-003 | P1 | 高置信无用入口 `ResizableDivider.tsx`、`lib/imagePrecache.ts` 已删除。 | 后续继续观察 `p10:audit` orphan-source-candidates。 |
| SMELL-004 | P1 | `MessageComposer.tsx` 与 `LexicalChatInput.tsx` 同时较大，可能存在旧 composer 和新 composer 并存。 | 盘点实际入口，确认是否可删除旧 composer 或继续抽 adapter。 |
| SMELL-005 | P1 | `perf:samples` CLI 与 `performance-samples.ts` 模型存在逻辑重复。 | 评估用 build 后 JS 复用模型，或把 CLI 逻辑记录为 Node-only 独立实现。 |
| SMELL-006 | P2 | 多个页面 800+ 行但低于 hard gate。 | 不主动大拆；后续需求触碰时顺手拆子组件，不回填主文件。 |
| SMELL-007 | P2 | `as any` 当前只剩 `src/main/main.ts` IPC handler rest args。 | 可用 typed tuple 或 `unknown[]` 包装收窄。 |
| SMELL-008 | P2 | `store.ts` 仍是 backing store。 | 当前保留；只要 owner facade 和 architecture gate 存在，不作为立即删除项。 |

## 7. 第一批建议执行

1. 保留 `im-command-executor.ts`，先迁移或确认 `im-core.spec.ts` 价值。
2. 保留 `performance-samples.ts`，后续评估 `perf:samples` 是否能复用模型。
3. 继续让 `p10:audit` 作为 P10 期间每批清理后的报告入口。
