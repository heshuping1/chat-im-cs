# Web 端视频消息封面接入指南

适用范围:Web/H5 客户端(标准客户端 + Widget 访客端)发送视频类富媒体消息时,如何让消息体里的 `thumbnailUrl` 带上封面图。

更新日期:2026-05-28

---

## 1. 背景与服务端行为

服务端的 `/media/upload` 接口(`/api/client/v1/media/upload` 与 `/api/widget/v1/media/upload`)对上传的视频文件**不做任何抽帧或封面生成**。

不论上传的是 `video/mp4` 还是其它视频 MIME,响应里 `data.thumbnailUrl` 始终为 `null`,例如:

```json
{
  "mediaId": "019e6f49-5329-7aa1-82eb-0e4b9088efc7",
  "mediaKind": "video",
  "mimeType": "video/mp4",
  "sizeBytes": 2933257,
  "thumbnailUrl": null
}
```

> 注:`client-api.md §0.3 媒体上传` 表格里关于"图片 / 视频通常有值"的注脚仅描述协议字段语义,**当前实现下视频上传不会主动产出封面**,该字段对视频永远是 `null`。

消息体里的 `MessageBody.video.thumbnailUrl` 是一个**纯透传字段**——服务端只存储与下发,不校验、不重算。

因此,Web 端如果想让其他端在播放前看到一张静态预览图,**必须在客户端本地抓帧、单独上传成图片,再把图片 URL 写入消息体的 `video.thumbnailUrl`**。下面给出可直接复制的实现。

> ⚠️ 容易混淆的两个 `thumbnailUrl`,务必分清:
>
> | 出现位置 | 字段值 | 说明 |
> |---|---|---|
> | 上传接口响应 `MediaUploadResponse.thumbnailUrl` | **永远 `null`** | 不论上传图片还是视频,服务端都不会再生成嵌套缩略图 |
> | 发消息接口的 `body.video.thumbnailUrl` | 由**客户端填值** | 透传字段,你填什么对端收到就是什么 |
>
> 正确做法:封面 jpeg 上传后,取响应里的 **`url`**(那张 jpeg 本身的访问地址),把这个 url 手动写入下一步发消息时的 `body.video.thumbnailUrl`。**不要去读封面上传响应里的 `thumbnailUrl`(它是 null)**。

---

## 2. 总体流程

发一条带封面的视频消息,客户端要走 4 步:

```
①  本地抓首帧 (<video> + <canvas>)
        │
        ├─► ② 上传视频原文件      → 拿 videoUrl / mediaId / 宽高 / 时长
        └─► ③ 上传封面 jpeg 图片  → 拿 thumbnailUrl
                                     │
                                     ▼
                       ④ 发消息,把 thumbnailUrl 塞进 body.video
```

② 和 ③ 是两次独立的 `multipart/form-data` 上传,可以并发,谁先回都无所谓。

---

## 3. 抓首帧

### 3.1 实现

```ts
export interface VideoCover {
  blob: Blob;           // jpeg 封面
  width: number;        // 视频原始宽
  height: number;       // 视频原始高
  durationSeconds: number;
}

export async function captureVideoCover(file: File | Blob): Promise<VideoCover> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = objectUrl;
  video.muted = true;            // iOS Safari 必须
  video.playsInline = true;      // iOS Safari 必须
  video.preload = 'metadata';
  video.crossOrigin = 'anonymous';

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('video metadata load failed'));
      // 兜底超时:8s 还没读出元数据就放弃
      setTimeout(() => reject(new Error('video metadata timeout')), 8000);
    });

    // 跳到 0.1s,避免某些编码首帧是黑屏
    const seekTo = Math.min(0.1, (video.duration || 1) / 2);
    video.currentTime = seekTo;

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('video seek failed'));
      setTimeout(() => reject(new Error('video seek timeout')), 5000);
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (!blob) throw new Error('canvas toBlob returned null');

    return {
      blob,
      width: video.videoWidth,
      height: video.videoHeight,
      durationSeconds: Math.round(video.duration || 0),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.src = '';
  }
}
```

### 3.2 注意点

| 现象 | 原因与处理 |
|---|---|
| iOS Safari `loadedmetadata` 不触发 | 必须设置 `muted = true` + `playsInline = true`,且 `<video>` 元素不能脱离 DOM 树之外的 `display: none`(可放在 `position: fixed; left: -9999px`)。 |
| `currentTime = 0` 抓出黑帧 | 改用 `0.1s` 或 `duration / 2`。 |
| 跨域 video 抓帧报 `SecurityError` (canvas tainted) | 远程视频要求源服务器返回 `Access-Control-Allow-Origin`,并且 `<video>` 设 `crossOrigin = 'anonymous'`。本地选择的 `File`(`URL.createObjectURL`)不受影响。 |
| 抓帧整体失败 | 不要让整条消息发不出去,降级走"无封面"路径,把 `thumbnailUrl` 留空即可,见 §6。 |

---

## 4. 上传封面与视频

两次上传走同一个接口,只是 `file` 字段一个传 jpeg blob、一个传原视频。

接口与服务端响应字段定义见 `client-api.md §0.3 媒体上传`。

```ts
type MediaUploadResponse = {
  mediaId: string;
  mediaKind: 'image' | 'video' | 'voice' | 'file';
  url: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl: string | null;   // 视频上传永远是 null
};

async function uploadMedia(
  endpoint: string,                       // '/api/client/v1/media/upload' 或 '/api/widget/v1/media/upload'
  token: string,                          // accessToken 或 visitorToken
  blob: Blob,
  fileName: string
): Promise<MediaUploadResponse> {
  const fd = new FormData();
  fd.append('file', blob, fileName);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (!res.ok) {
    throw new Error(`upload failed: ${res.status}`);
  }
  const json = await res.json();
  // 项目统一 envelope:{ code, message, data }
  return json.data as MediaUploadResponse;
}
```

并发执行:

```ts
const [videoRes, coverRes] = await Promise.all([
  uploadMedia(uploadEndpoint, token, videoFile, videoFile.name),
  uploadMedia(uploadEndpoint, token, cover.blob, 'cover.jpg'),
]);
```

服务端校验扩展名 + 文件头白名单,`.jpg / .mp4` 均在允许列表中,上传失败的常见错误码:

| code | 含义 | 处理 |
|---|---|---|
| `MEDIA_FORM_REQUIRED` | 没用 `multipart/form-data` | 检查 `FormData` 是否被覆盖了 `Content-Type` 头 |
| `MEDIA_FILE_REQUIRED` | 表单里没有 `file` 字段 | 字段名固定是 `file` |
| `MEDIA_TYPE_FORBIDDEN` | 扩展名不在白名单 | jpeg / mp4 不会撞到,自定义扩展名要先和后台确认 |
| `MEDIA_CONTENT_TYPE_MISMATCH` | 扩展名和 MIME 对不上 | `canvas.toBlob` 第二参传 `'image/jpeg'`,文件名用 `.jpg` |

---

## 5. 组装并发送消息

视频消息 body 的字段约定(见 `client-api.md` / `client-api-reference.md` 的 `MediaResourceDto`):

```json
{
  "clientMsgId": "web-msg-20260528-001",
  "messageType": "video",
  "body": {
    "video": {
      "url": "/media/视频mediaId.mp4",
      "fileName": "movie.mp4",
      "mimeType": "video/mp4",
      "sizeBytes": 2933257,
      "width": 1920,
      "height": 1080,
      "durationSeconds": 8,
      "thumbnailUrl": "/media/封面mediaId.jpg"
    }
  }
}
```

拼装代码:

```ts
const body = {
  clientMsgId: makeClientMsgId(),
  messageType: 'video',
  body: {
    video: {
      url: videoRes.url,
      fileName: videoRes.fileName,
      mimeType: videoRes.mimeType,
      sizeBytes: videoRes.sizeBytes,
      width: cover.width,
      height: cover.height,
      durationSeconds: cover.durationSeconds,
      thumbnailUrl: coverRes.url,        // ← 关键:用封面那次上传返回的 url
    },
  },
};

await fetch(sessionMessagesEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});
```

字段语义:

- `width / height / durationSeconds` 取自抓帧时的 `<video>` 元素,不依赖服务端探测。
- `thumbnailUrl` 是 `string?`:可以省略(走无封面降级),或填一个**可公开访问的图片 URL**。

---

## 6. 失败降级

抓帧或封面上传任意一步失败时,视频消息本身仍应能发出去,只是不带封面:

```ts
let coverUrl: string | null = null;
try {
  const cover = await captureVideoCover(videoFile);
  const coverRes = await uploadMedia(uploadEndpoint, token, cover.blob, 'cover.jpg');
  coverUrl = coverRes.url;
} catch (err) {
  console.warn('[video] cover capture/upload failed, fallback to no thumbnail', err);
}

// 组装消息时:
// thumbnailUrl: coverUrl   // null 也合法
```

接收端拿到 `thumbnailUrl === null` 应当显示默认占位图(项目内既有的视频消息渲染组件已经支持这种情况)。

---

## 7. 完整示例(整合)

```ts
export async function sendVideoMessageWithCover(opts: {
  videoFile: File;
  token: string;
  uploadEndpoint: string;        // '/api/client/v1/media/upload' 或 '/api/widget/v1/media/upload'
  sessionMessagesEndpoint: string;
}) {
  const { videoFile, token, uploadEndpoint, sessionMessagesEndpoint } = opts;

  let cover: VideoCover | null = null;
  try {
    cover = await captureVideoCover(videoFile);
  } catch (err) {
    console.warn('[video] capture cover failed', err);
  }

  const tasks: Promise<unknown>[] = [
    uploadMedia(uploadEndpoint, token, videoFile, videoFile.name),
  ];
  if (cover) {
    tasks.push(uploadMedia(uploadEndpoint, token, cover.blob, 'cover.jpg'));
  }
  const results = await Promise.all(tasks);
  const videoRes = results[0] as MediaUploadResponse;
  const coverRes = cover ? (results[1] as MediaUploadResponse) : null;

  const body = {
    clientMsgId: crypto.randomUUID(),
    messageType: 'video',
    body: {
      video: {
        url: videoRes.url,
        fileName: videoRes.fileName,
        mimeType: videoRes.mimeType,
        sizeBytes: videoRes.sizeBytes,
        width: cover?.width ?? null,
        height: cover?.height ?? null,
        durationSeconds: cover?.durationSeconds ?? null,
        thumbnailUrl: coverRes?.url ?? null,
      },
    },
  };

  const res = await fetch(sessionMessagesEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`send message failed: ${res.status}`);
  return res.json();
}
```

---

## 8. FAQ

**Q1. 服务端以后会自动出封面吗?**
当前没有 ffmpeg/Worker 任务,roadmap 上也没有该项。客户端自抽是目前唯一方案。如有变化会在 `MediaUploadResponse.thumbnailUrl` 字段上直接体现,客户端可以"有就用、没有就抓帧",兼容性零成本。

**Q2. 视频本体没抓出封面前,可以先发消息后补封面吗?**
不推荐。消息一旦写入对端会话,后续编辑封面需要走"消息修改"接口,跨端体验不一致。建议同步等两次上传都完成再发消息,大头是视频上传时间,封面只是几十 KB 不会成为瓶颈。

**Q3. 抓帧用的 `<video>` 必须挂到 DOM 吗?**
桌面浏览器可以不挂,但 iOS Safari 在部分版本下要求 `<video>` 处于可渲染节点中才会触发 `loadedmetadata`。稳妥做法:挂到 `document.body`,加 `position: fixed; left: -9999px; width: 1px; height: 1px`,用完移除。

**Q4. 封面 URL 一定要是同一个 `media/upload` 上传的吗?**
不强制。`thumbnailUrl` 是任意 `string?`,只要接收端能访问到都可以。但跨端一致性最好,推荐统一走 `media/upload`,这样权限、签名、CDN 都跟视频本体一致。

---

## 9. 生产环境 E2E 实测(2026-05-29)

下面这串调用是在**生产环境 `https://chat.hearteasechat.com`** 上用测试租户跑通的,可以作为对接方的参照基线。

```
租户:mcx953141 (019da959-fdfc-7b4f-a24c-a7ce485a4132)
用户:customer_01 (mcx953141c01)
```

**Step 1 ── 登录**

```bash
curl -X POST https://chat.hearteasechat.com/api/client/v1/auth/login \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: 019da959-fdfc-7b4f-a24c-a7ce485a4132' \
  -d '{"loginName":"mcx953141c01","password":"<pwd>"}'
# → data.accessToken
```

**Step 2 ── 上传视频(51 KB 的 test.mp4)**

```bash
curl -X POST https://chat.hearteasechat.com/api/client/v1/media/upload \
  -H "Authorization: Bearer <accessToken>" \
  -F 'file=@test.mp4;type=video/mp4'
```

响应关键字段(注意 `thumbnailUrl: null`):

```json
{
  "mediaId": "019e71a1-22ab-7b07-9f5c-68da060fb76f",
  "mediaKind": "video",
  "url": "https://chat.hearteasechat.com/media/019e71a1-22ab-7b07-9f5c-68da060fb76f",
  "mimeType": "video/mp4",
  "sizeBytes": 51236,
  "thumbnailUrl": null
}
```

**Step 3 ── 上传封面(11 KB 的 cover.jpg)**

```bash
curl -X POST https://chat.hearteasechat.com/api/client/v1/media/upload \
  -H "Authorization: Bearer <accessToken>" \
  -F 'file=@cover.jpg;type=image/jpeg'
```

响应(图片上传响应里 `thumbnailUrl` 同样是 null,要用的是 **`url`**):

```json
{
  "mediaId": "019e71a1-3253-777c-9d31-11fbeb90c486",
  "mediaKind": "image",
  "url": "https://chat.hearteasechat.com/media/019e71a1-3253-777c-9d31-11fbeb90c486",
  "mimeType": "image/jpeg",
  "sizeBytes": 11552,
  "thumbnailUrl": null
}
```

**Step 4 ── 发视频消息**

```bash
curl -X POST https://chat.hearteasechat.com/api/client/v1/direct-chats/<chatId>/messages \
  -H "Authorization: Bearer <accessToken>" \
  -H 'Content-Type: application/json' \
  -d '{
    "clientMsgId": "e2e-thumb-1780022880",
    "messageType": "video",
    "body": {
      "video": {
        "url": "https://chat.hearteasechat.com/media/019e71a1-22ab-7b07-9f5c-68da060fb76f",
        "fileName": "test.mp4",
        "mimeType": "video/mp4",
        "sizeBytes": 51236,
        "width": 640,
        "height": 360,
        "durationSeconds": 3,
        "thumbnailUrl": "https://chat.hearteasechat.com/media/019e71a1-3253-777c-9d31-11fbeb90c486"
      }
    }
  }'
# → 200 { messageId, conversationId, conversationSeq:1 }
```

**Step 5 ── 拉历史复核**

```bash
curl https://chat.hearteasechat.com/api/client/v1/direct-chats/<chatId>/messages?limit=10 \
  -H "Authorization: Bearer <accessToken>"
```

返回的 `body.video.thumbnailUrl` 与发送时**完全一致**(透传零修改):

```json
"video": {
  "url": "https://chat.hearteasechat.com/media/019e71a1-22ab-7b07-9f5c-68da060fb76f",
  "thumbnailUrl": "https://chat.hearteasechat.com/media/019e71a1-3253-777c-9d31-11fbeb90c486",
  "signedUrl": "https://chat.hearteasechat.com/media/...?exp=...&sig=...",
  "downloadUrl": "https://chat.hearteasechat.com/media/...?exp=...&sig=...&download=1"
}
```

封面 URL 实测可访问:

- 带 `Authorization: Bearer` 头 → `200 image/jpeg`,`content-length: 11552`
- 用响应里的 `signedUrl`(免 token)→ `200 image/jpeg`,`content-length: 11552`

**单端结论**(发送方自查时)上述流程在生产链路完全可行,字段 100% 透传成功。

---

## 10. ⚠️ 接收方视角实测发现的服务端 Bug(2026-05-29)

把链路扩展到"c01 发给 c02、c02 拉同一个 chatId 历史"以后,发现一个发送方自测发现不了的**真问题**:

### 10.1 现象

1. c01 加 c02 好友 → 建 direct-chat。
2. c01 复用之前已上传的视频 mediaId + 封面 mediaId,发一条 `body.video.thumbnailUrl` 带封面 url 的视频消息。
3. c02 拉历史:`body.video.thumbnailUrl` 字段值**字节完全一致**地拿到了。
4. **但** c02 用自己的 token 去访问那张封面 url(就是 `body.video.thumbnailUrl` 这个字符串),返回:

   ```json
   { "code": "MEDIA_FORBIDDEN", "message": "media asset is not accessible" }
   ```

5. c02 用 `body.video.signedUrl` 能直接拿到视频本体(200,免 token);但**消息体里没给 thumbnail 单独发 signedUrl**,所以接收方实际看不到封面。

### 10.2 根因(数据库直查)

发完消息后 `im.media_assets` 表的状态:

| media_id | media_kind | uploaded_by | bound_conversation_id |
|---|---|---|---|
| 视频 mediaId | video | c01 | ✅ 绑定到 chat |
| 封面 mediaId | image | c01 | ❌ **NULL** |

服务端 `DirectMessageServiceImpl.BindMediaAssetsAsync` ([src/Modules/Messages/ZTChat.Modules.Messages.Infrastructure/DirectMessageServiceImpl.cs:404-428](src/Modules/Messages/ZTChat.Modules.Messages.Infrastructure/DirectMessageServiceImpl.cs#L404-L428)) 在发消息时只遍历 `body.Image / body.Video / body.Voice / body.File` 这 4 个顶层 `MediaResourceDto`,**完全没看 `Video.ThumbnailUrl` 嵌套字段**。

随后 `GetAuthorizedDownloadAsync` 对非上传者强校验 `BoundConversationId.HasValue` ([:237](src/Modules/Messages/ZTChat.Modules.Messages.Infrastructure/MessageModuleExtensions.cs#L237)),封面 bound 为 NULL → 403 `MEDIA_FORBIDDEN`。

`GroupMessageServiceImpl` 同样问题。`OpenPlatform`、`TempSession`、`EnterpriseBroadcastDispatcher` 内部的 bind 路径也只看顶层 4 个字段。

### 10.3 影响

- ✅ 发送方在自己窗口仍能展示(`asset.UploadedByUserId == requesterUserId` 时直接放行)。
- ❌ 任何接收方/重新拉历史的设备访问封面时 403。
- 这正是第三方反馈"接收方看不到封面、刷新后看不到封面"的真实根因——**不是字段被丢,是封面那张 image 没被服务端 bind 到消息**。

### 10.4 临时绕过(客户端)

在服务端修复前,Web 端可以这样兜底:

- 发消息后,把客户端本地刚生成的 cover blob 用 `URL.createObjectURL(blob)` 缓存,自己窗口直接渲染(不依赖回程 url)。
- 接收方:无 fallback,只能落地修服务端。如果业务允许,可以在 `body.text` 里塞一段 fallback markdown 链接给到对端,但视频消息一般不可行。

### 10.5 待修复(服务端)

最小改动一处:`BindMediaAssetsAsync` / 所有 6 处 bind 路径,在 `EnumerateMedia` 里**额外 yield `resource.ThumbnailUrl`** 对应的 `MediaResourceDto`(可包成一个临时 stub `new MediaResourceDto(ThumbnailUrl, ...)` 让现有循环复用)。这样发消息时封面 image 会一并 bind 到同一 conversation/messageId,接收方裸 url 访问就通了。

另一种思路:历史接口的 DTO 映射层在序列化 `Video` 节点时,如果 `thumbnailUrl` 命中本租户的 media,**再签一份 signedUrl 注入到嵌套节点**(类似当前给 `signedUrl` / `downloadUrl` 字段的处理)。两套修法只要做一套即可,推荐前者(更少业务侵入,接收方拿裸 url 即可)。

**这是个需要排期的服务端修复,不是客户端漏写字段**。在修复合入前,本指南 §1–§9 描述的"客户端抓帧 → 上传 → 透传 thumbnailUrl"流程**仅对发送方本机可用**,跨设备/跨用户看不到封面。
