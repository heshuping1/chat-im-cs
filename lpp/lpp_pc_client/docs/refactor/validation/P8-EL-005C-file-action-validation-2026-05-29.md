# P8-EL-005C File Action Validation

日期：2026-05-29

## 验证

- `tsc -p tsconfig.electron.json --noEmit --pretty false`
- `tsc --noEmit --pretty false --skipLibCheck`
- `git diff --check -- src/main/main.ts src/main/media-storage.ts`

## 行为保持

- 远程媒体仍可下载、缓存、打开、另存、复制。
- 应用缓存内的 `file:` URL 仍可处理。
- 应用缓存目录之外的本地路径会被拒绝。
