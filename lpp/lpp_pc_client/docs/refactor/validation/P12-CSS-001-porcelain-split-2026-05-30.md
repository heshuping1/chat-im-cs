# P12-CSS-001 porcelain-shell 拆分验证记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 目标

拆分 `src/renderer/styles/shared/porcelain-shell.css`，让白瓷视觉层从 3000 行级降到 2000 行以下，并按 owner 接回 App 级联。

## 修改范围

- `src/renderer/styles/shared/porcelain-shell.css`
- `src/renderer/styles/customer-service/customer-service-skin.css`
- `src/renderer/styles/messages/composer-rich-input.css`
- `src/renderer/styles/shared/porcelain-presence-footer.css`
- `src/renderer/App.tsx`

## 结果

```text
1842 src/renderer/styles/shared/porcelain-shell.css
562  src/renderer/styles/customer-service/customer-service-skin.css
459  src/renderer/styles/messages/composer-rich-input.css
148  src/renderer/styles/shared/porcelain-presence-footer.css
```

## 验证命令

```bash
npm run p12:audit
npm run docs:check
```

## 验证结果

- `npm run p12:audit`：通过，`porcelain-shell.css` 不再出现在 `css-large-files`，CSS 大文件仅剩 `message-shared.css`。
- `npm run docs:check`：通过。

## 后续

继续执行 `P12-CSS-002`，拆分 `message-shared.css`。
