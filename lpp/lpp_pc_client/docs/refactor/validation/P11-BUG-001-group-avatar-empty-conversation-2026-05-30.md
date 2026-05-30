# P11-BUG-001 group avatar empty conversation validation

日期：2026-05-30

范围：

- `src/renderer/messages/models/groupAvatarModel.ts`
- `src/renderer/components/MessageCenter.tsx`
- `tests/unit/group-avatar-model.spec.ts`

## 问题

PC 端启动后 Error Boundary 显示：

```text
Cannot read properties of undefined (reading 'groupAvatarUrl')
```

根因是群头像解析链路在运行期可能收到空 conversation，但 model 和 profile dock 调用层都没有兜底。

## 修复

1. `resolveGroupConversationAvatar`、`groupCompositeAvatarAllowed`、`groupCompositeAvatarCells` 支持空 conversation 并安全返回。
2. `MessageProfileDock` 仅在 `activeConversation` 存在时渲染，避免无会话时计算群头像。
3. 补 `group-avatar-model` 单测覆盖空 conversation。

## 验证命令

```bash
npx vitest run tests/unit/group-avatar-model.spec.ts tests/unit/message-center-view-model.spec.ts
```

结果：通过，2 个测试文件、8 个测试通过。

```bash
npx tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

```bash
npm run check:quick
```

结果：通过。

```bash
npm run p10:audit
```

结果：通过，`tracked-generated-artifacts` 为 `none`；剩余大文件、头像、日期、CSS、type escape 信号继续由 P11 清单跟踪。

```bash
npm run dev
```

结果：通过，Vite 监听 `http://127.0.0.1:5173/`，Electron 已重启。Chromium Autofill protocol 输出仍是 DevTools 噪音。

## 未执行

- Windows 实机验证：按要求跳过，归 `P11-WIN-001`。
