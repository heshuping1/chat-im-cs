# P8-EL-005A File Action 盘点

日期：2026-05-29

## 文件动作入口

| API | 用途 |
| --- | --- |
| `cacheMediaFile` | 下载远程媒体到本地缓存目录。 |
| `openMediaFile/editMediaFile/openDownloadedFile` | 下载或复用缓存后通过系统打开。 |
| `copyMediaFile/copyImageFromUrl` | 下载或复用缓存后复制文件/图片。 |
| `saveMediaAs/revealMediaInFolder` | 另存为或显示缓存文件位置。 |
| `openFile/copyFilePath` | 作为旧 fallback 使用，传入缓存路径或父目录。 |

## 风险

- 旧 `openFile/copyFilePath` 可接受 renderer 传入的任意本地路径。
- `ensureLocalMediaFile` 旧逻辑允许任意 `file:` URL 或绝对路径直接返回。

## 策略

- 远程 URL 下载到 `app.getPath('userData')/LPP Files/...`。
- 本地路径/`file:` URL 只允许访问 `app.getPath('userData')` 下的文件。
- 文件名和路径 segment 继续复用已有清理逻辑。
