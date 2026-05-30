# 验证记录：P2-ST-004B IM Read Store/Repository 壳

日期：2026-05-29

任务编号：P2-ST-004B

## 修改范围

- `src/renderer/data/im-read/im-read-storage.ts`
- `src/renderer/data/im-read/im-read-store.ts`
- `src/renderer/data/store.ts`
- `tests/unit/im-read-storage.spec.ts`
- `tests/unit/im-read-store.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立 IM read owner/repository 壳，定义 read 状态类型、持久化边界、selectors/actions，为后续迁移 Gateway 和 MessageCenter 调用方做准备。

## 实现内容

| 项 | 说明 |
| --- | --- |
| `im-read-storage.ts` | 迁出 `LocalImConversationRead`、`LocalImPeerReadReceipt`、`StoredImReadState`、storage key、sanitize、read/persist 函数。 |
| `im-read-store.ts` | 新增 read selectors/hooks/actions：本地已读、对端已读、统一 read state、mark/upsert/clear actions。 |
| `store.ts` | 继续作为临时 backing store，但 IM read 类型和持久化逻辑不再定义在大 Store 内。 |
| 兼容出口 | `store.ts` 暂时 re-export IM read 类型和 `imConversationStorageKey/sanitizeStoredImReadState`，保证旧测试和旧调用方可运行。 |

## 不变量

1. 本地 `myReadSeq`、对端 `peerReadSeq`、`lastMessageSeq` 都按非负整数处理。
2. 存储读取必须 sanitize，不接受 key 与 `conversationType/conversationId` 不匹配的数据。
3. 本地 read storage 按 session 维度隔离，避免账号串读。
4. `store.ts` 只是 backing store；新增调用方应依赖 `data/im-read/im-read-store.ts`。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-read-storage.spec.ts tests/unit/im-read-store.spec.ts tests/unit/workspace-ui-store.spec.ts` | 通过 | 3 个测试文件，6 个用例通过，耗时约 137ms。 |
| `./node_modules/.bin/vitest run tests/unit/im-read-storage.spec.ts tests/unit/im-read-store.spec.ts tests/unit/workspace-ui-store.spec.ts tests/unit/im-core.spec.ts` | 通过 | 4 个测试文件，75 个用例通过，耗时约 257ms；`im-core.spec.ts` 现有 localStorage 用法在 Node 26 下有 ExperimentalWarning，但不影响结果。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否 |
| 日志入口 | 本任务先建立 owner/storage 壳；P2-ST-004D 补 read model 诊断日志。 |
| 可排查问题 | Codex 可通过 `im-read-storage.ts` 定位 read 持久化边界，通过 `im-read-store.ts` 定位 read actions。 |
| Codex 检索方式 | `rg -n "useImReadStateByConversation|getImReadActions|persistImReadState|sanitizeStoredImReadState" src/renderer` |
| 敏感信息处理 | storage key 使用 session 范围字段，未新增日志输出。 |

## 结论

P2-ST-004B 已完成。IM read 的 storage 和 selector/action 壳已建立，后续可以迁移 Gateway、MessageCenter、Sidebar 的 read 调用方。

## 下一步

1. P2-ST-004C：迁移 Gateway `msg.read`、消息列表、会话列表对 read model 的更新。
