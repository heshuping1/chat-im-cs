# PC IM Draft And Upload Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PC ordinary IM show WeChat-style per-conversation draft previews and local-first media send/upload state.

**Architecture:** Keep changes inside PC ordinary IM. `MessageComposer` continues to own per-conversation rich draft input and attachment ordering; `MessageCenter` owns conversation list previews, local message cache updates, and upload/send state; `MessageBodyView` stays responsible for rendering image/file content and receives only normalized message data.

**Tech Stack:** React, TypeScript, TanStack Query cache, Playwright browser smoke tests, existing PC white-porcelain CSS.

---

### Task 1: WeChat-Style Draft Preview

**Files:**
- Modify: `src/renderer/components/MessageCenter.tsx`
- Modify: `src/renderer/styles/app.css`
- Test: `tests/browser/workspace-smoke.spec.ts`

- [ ] **Step 1: Add a focused test**

Add an assertion to the existing PC ordinary IM stage two draft test:

```ts
await expect(page.getByRole("button", { name: /Jason/ }).locator(".e-draft-prefix")).toHaveText("[草稿]");
await expect(page.getByRole("button", { name: /Jason/ }).locator(".e-draft-preview")).toContainText("这是 Jason 的草稿");
await expect(page.getByRole("button", { name: /销售协作群/ })).not.toContainText("[草稿]");
```

- [ ] **Step 2: Implement draft preview markup**

In `ConversationRow`, replace the single `small` text branch with:

```tsx
{draftText ? (
  <small className="e-conversation-draft">
    <span className="e-draft-prefix">[草稿]</span>
    <span className="e-draft-preview">{renderWechatEmojiText(draftText)}</span>
  </small>
) : (
  <small>{renderWechatEmojiText(conversation.lastMessage?.preview || "暂无最近消息")}</small>
)}
```

- [ ] **Step 3: Style draft prefix like WeChat**

Add CSS:

```css
.e-conversation-draft {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}
.e-draft-prefix {
  flex: 0 0 auto;
  color: #ef4444;
  font-weight: 760;
}
.e-draft-preview {
  min-width: 0;
  overflow: hidden;
  color: #9aa5b4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Task 2: Local-First Media Upload State

**Files:**
- Modify: `src/renderer/components/MessageCenter.tsx`
- Modify: `src/renderer/components/ChatMessageBubble.tsx`
- Modify: `src/renderer/components/MessageBodyView.tsx`
- Modify: `src/renderer/styles/app.css`
- Test: `tests/browser/workspace-smoke.spec.ts`

- [ ] **Step 1: Add a focused media sending test**

Add to the PC ordinary IM closure interaction test:

```ts
await page.getByTestId("composer-attachment-input").setInputFiles({
  name: "slow-local.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgo=", "base64"),
});
await page.getByRole("button", { name: "发送", exact: true }).click();
await expect(page.getByLabel("消息内容").getByRole("img", { name: "slow-local.png" })).toBeVisible();
await expect(page.getByLabel("消息内容").getByText("上传中")).toBeVisible();
```

- [ ] **Step 2: Add local pending media before upload**

In `sendMediaMutation`, use `onMutate` to create a local object URL and append a local outgoing message with:

```ts
status: "sending"
body: { [kind]: { url: localObjectUrl, thumbnailUrl: localObjectUrl, fileName: file.name, mimeType: file.type, sizeBytes: file.size, localPreviewUrl: localObjectUrl } }
```

- [ ] **Step 3: Replace pending local message after server send**

On success, update the cached message by local id to server id/body/status and revoke the object URL after the remote body is in cache. On error, keep the local message in cache with `status: "failed"` and a `localError` string so the user can see failure rather than losing the media.

- [ ] **Step 4: Show status next to own message**

Update `messageReadStatusText` to return:

```ts
if (status === "sending") return "上传中";
if (status === "failed") return "发送失败";
```

before read/sent checks.

- [ ] **Step 5: Avoid loading placeholder for local images**

In `MessageBodyView`, when image media has a `blob:` URL or `localPreviewUrl`, initialize `imageLoaded` as true and allow direct display. Remote images still use the existing loading placeholder.

### Task 3: Verification

**Files:**
- Test: `tests/browser/workspace-smoke.spec.ts`

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 2: Run PC ordinary IM specialty tests**

Run:

```bash
npx playwright test tests/browser/workspace-smoke.spec.ts -g "PC ordinary IM closure|PC ordinary IM stage two|PC ordinary IM stage three|PC ordinary IM stage four|updates IM unread|marks incoming messages" --workers=1
```

Expected: all matched tests pass.

- [ ] **Step 3: Report scope**

Report changed files, verification output, and whether any service-side gap was found.
