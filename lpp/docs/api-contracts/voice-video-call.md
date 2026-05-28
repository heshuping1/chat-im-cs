# 音视频通话接入文档

> 文档校对快照:2026-05-14

本文档说明如何为第三方 APP / Web 客户端接入 ZTChat 的 WebRTC 音视频通话能力,以服务端对外暴露的 HTTP / SignalR Hub / WebSocket 事件契约为准。

字段、枚举、事件与状态值域速查见 [voice-video-call-reference.md](./voice-video-call-reference.md)。
缺失字段与补充枚举统一见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 概述

ZTChat 音视频通话采用“服务端媒体中转”架构,不走浏览器 / APP 之间的 P2P:

```text
浏览器/APP A ←─ DTLS-SRTP ─→ 媒体中继(relay) ←─ DTLS-SRTP ─→ 浏览器/APP B
```

当前对外契约要点:

- 音频与视频共用同一个媒体中继路径,服务端做包级转发,不做转码
- 通话信令使用 relay 上的 SignalR Hub:`/hubs/voicecall`;来电通知走客户端常驻的 Gateway 连接 `/ws/client`(事件 `voicecall.incoming`)
- 媒体中继可多节点部署。**会话亲和由服务端在分配阶段保证**:主叫先调 `POST /api/client/v1/voicecall/sessions`,后端会把本次通话锁到某一台 relay 节点,并把该节点的连接地址通过 `relayUrl` 同时下发给主叫(REST 响应)和被叫(`voicecall.incoming` envelope)——双方据此连同一台 relay(见 §2、§8)。**对客户端的硬性要求**:整个通话期内不要主动断开 relay hub;任何断线重连都必须使用 `relayUrl` 回到原节点,否则可能错过服务端推送的 `CallRinging` / `CallAnswered` / `CallEnded` / `DtmfReceived` 等事件(见 §8 已知限制)
- 音频编码固定为 `OPUS`,RTP 时钟 `48000`;按聊天语音场景使用单声道、FEC + DTX。OPUS 的目标码率(`maxaveragebitrate`)、`complexity`、完整 `fmtp` 串、RTP payload type 均可在管理后台「通话编码与录音」页全局配置(默认 **32kbps** / complexity 5 / payload type 111),改动仅对**新发起**的通话生效
- 视频编码固定为 `VP8`,RTP 时钟 `90000`
- 当前不做音视频转码;双方都需要支持 `OPUS + VP8`
- ICE 策略为"仅 host candidate",所有媒体强制经服务端中转(包级转发)。每个中继节点对外宣告的公网 IP 可在管理后台「通话节点」页按节点改写,改动对该节点**新发起**的通话生效,生效延迟约 30 秒
- 通话录音默认**关闭**;需在管理后台「通话编码与录音」页打开总开关后,新通话才会在中继节点上同时落盘录音。录音从通话**接通(Active)**那一刻开始计,文件时长等于实际接通时长;最终产物为双声道 MP3(左声道主叫,右声道被叫),录音管线与媒体转发解耦——录音失败不会影响通话本身

这意味着：

- 纯语音通话仍然兼容，客户端只发音频轨即可
- 音视频通话时，客户端需要同时发音频轨和视频轨
- 如果任一端不发视频轨，该通话就退化为语音或单向视频协商，不会触发服务端转码
- 后台录音下载只能回放音频，但可通过左右声道区分主叫/被叫

## 2. 连接与鉴权

### 2.0 两条连接：常驻 Gateway 连接 + 按需 relay 连接

跨节点架构下客户端需要维护**两条** SignalR 连接：

| 连接 | 地址 | 生命周期 | 用途 |
|---|---|---|---|
| 常驻连接 | `wss://{gateway}/ws/client` | 登录后一直保持 | 接收来电事件 `voicecall.incoming`（以及其它实时消息） |
| relay 连接 | `wss://{relay}/hubs/voicecall` | 仅通话期间存在 | 通话信令（StartCall / AnswerCall / Hangup / DTMF）+ 收 `CallRinging`/`CallAnswered`/`CallEnded` |

**为什么是两条**:同一通话的主叫和被叫**必须连到同一台 relay**(媒体路径是服务端中转,通话上下文绑定在某一台 relay 节点上)。所以发起通话前先调一个 REST 接口让后端选好 relay 节点并返回它的 hub 地址;被叫收到的 `voicecall.incoming` 里也带着同一个 relay 地址。常驻的 Gateway 连接是用户登录后就一直在的,跨节点来电就经它送达——这条连接不绑定任何特定 relay。

### 2.1 发起通话前：分配 relay 节点

```text
POST /api/client/v1/voicecall/sessions
Authorization: Bearer {租户级 accessToken}
Content-Type: application/json

{ "targetUserId": "<被叫用户GUID>", "mediaMode": "audio" | "audioVideo", "videoProfile": "720p" | null }
```

> **关于 `mediaMode` 字段的兼容性**(自 2026-05-14 起)
>
> 推荐传 `"audio"` 或 `"audioVideo"`(camelCase,与服务端 JSON 命名风格一致)。
> 为保护旧版客户端,服务端同时接受:`"Audio"` / `"AudioVideo"`(PascalCase,旧文档示例)、`"audio-video"`(旧 cross-node 内部表示)、整数 `0` / `1`。
> 字段省略时默认为 `"audio"`。
> 注意:**真正决定本次通话是不是视频的是 SDP offer 里是否有 `m=video` 行**。`mediaMode` 只影响被叫方"来电界面是显示语音还是视频图标"这种派生展示,不影响媒体协商本身。

响应 `data`：

```json
{ "callId": "<预创建的通话GUID>", "nodeId": "relay-2", "relayUrl": "https://relay-2.example.com/hubs/voicecall", "expiresAt": "<ISO8601>" }
```

主叫拿到 `relayUrl` 后连那台 relay 的 `/hubs/voicecall`，再调 `StartCall(callId, sdpOffer)`（注意：`callId` 由本接口下发，不再由 relay 生成）。`expiresAt` 是预留窗口——超过这个时间还没连上并 StartCall，relay 视该会话为废弃。

错误码：`CALL_TARGET_INVALID`（targetUserId 不是 GUID）、`CALL_TARGET_SELF`（自呼）、`CALL_VIDEO_PROFILE_INVALID`、`CALL_NO_RELAY_AVAILABLE`（HTTP 503，当前无在线 relay 节点）。

### 2.2 relay hub 地址

```text
wss://{relay}/hubs/voicecall?access_token={jwt}
```

`{relay}` 来自上一步 `/sessions` 的 `relayUrl`(主叫侧),或来自 `voicecall.incoming` 事件的 `relayUrl`(被叫侧)。也可以使用 SignalR SDK 的 `accessTokenFactory` / `withAccessTokenProvider` 注入租户级 JWT。

**SignalR 协议**:使用 **JSON Hub Protocol**,**勿启用 MessagePack**。

**`RTCPeerConnection` 配置建议**:服务端走强制中转,SDP answer 中只保留指向 relay 的 host 候选,客户端**无需也不应**配置外部 STUN / TURN。直接传空数组即可:

```javascript
new RTCPeerConnection({ iceServers: [] });
```

不要强行设置 `iceTransportPolicy: 'relay'`——那是 P2P 模式下指示浏览器只使用 TURN 候选的开关,跟服务端的强制中转策略不同;在本场景下设置它反而可能因为没有 TURN 候选导致 ICE 失败。

### 2.3 Token 要求

- 上述所有接口/连接都使用同一个租户级 `accessToken`
- 平台级 `platformToken` 不能用于 `/hubs/voicecall` 或 `/voicecall/sessions`
- 需要先通过 `select-personal-space` 或 `select-tenant` 换取客户端业务 `accessToken`
- 典型获取方式:

```text
POST /api/platform/v1/auth/select-personal-space
POST /api/platform/v1/auth/select-tenant
```

### 2.4 Hub 鉴权错误

`/hubs/voicecall` 连接建立或 invoke 调用时,如果 token 不满足要求,服务端以信令异常形式抛回——在 SignalR JS SDK 里通常表现为 `invoke(...)` 返回的 Promise 被 reject(`error.message` 取下表值之一),建立连接阶段失败则表现为 `start()` 抛出:

| `message` | 触发场景 |
|---|---|
| `AUTH_TENANT_REQUIRED` | Token 中缺租户上下文,空间引导态 / 平台态都会触发——需要先 `select-personal-space` 或 `select-tenant` 换取客户端业务 `accessToken` |
| `AUTH_USER_REQUIRED` | Token 中缺用户身份 |
| `AUTH_CLIENT_TOKEN_REQUIRED` | Token 类型不是客户端业务 Token(例如错传了平台 Token 或访客 Token) |

## 3. 媒体能力约定

### 3.1 语音通话

- 本地只采集麦克风：`getUserMedia({ audio: true, video: false })`
- Offer 中只包含 `m=audio`

### 3.2 音视频通话

- 本地采集麦克风 + 摄像头：`getUserMedia({ audio: true, video: true })`
- Offer 中同时包含 `m=audio` 与 `m=video`

### 3.3 编码与兼容性

服务端当前为了避免转码,仅协商以下编码:

- 音频:m-line 为 `OPUS/48000/2`(WebRTC 惯例,`/2` 是 RTP 映射约定的双声道占位;实际单/双声道由 fmtp `stereo=0;sprop-stereo=0` 控制——服务端固定单声道)。服务端 fmtp 还包含 `usedtx=1;useinbandfec=1`
- 视频:`VP8/90000`

语音聊天推荐客户端按单声道采集与发送,开启回声消除、噪声抑制、自动增益、OPUS FEC 与 DTX。建议第三方客户端明确保证本地 WebRTC SDK 对 `OPUS + VP8` 都可用。

### 3.4 OPUS 码率与服务端 fmtp 协商

服务端 SDP answer 里的 `a=fmtp:<pt> maxaveragebitrate=N` 是协商上限。**客户端必须按此上限调整 audio sender 的 `maxBitrate`**(浏览器原生 WebRTC 通常自动遵守;某些移动端 SDK 不会自动复检 answer,需要手动重设)。否则客户端持续以高于协商上限的码率发送,服务端转发的 SRTP 包在客户端接收侧表现为零星丢包 → 听感上的噪声/爆音。

- 当前默认 `maxaveragebitrate=32000`(自 2026-05-14 起,匹配主流 WebRTC 客户端默认 32 kbps)
- 管理员可在后台调整 fmtp;客户端如果实现了自动 renegotiate 则无需特别处理,否则建议每次新建 PeerConnection 时按拿到的 SDP answer 重新配置 `RTCRtpEncodingParameters.maxBitrate`

### 3.5 SDP / RTCP 扩展(强制中转模式下的必需声明)

服务端走的是**强制中转(force-relay)**模式,所有媒体经服务端转发;为了让转发链路保留 WebRTC 必需的拥塞控制、抗丢包反馈,客户端 SDP **应保留**以下 extmap / rtcp-fb 声明(浏览器原生 WebRTC 默认就有,native SDK 需要确认):

- 视频:
  - `a=rtcp-fb:<pt> nack` — 包级 NACK 重传请求(服务端会原样转回原发送端)
  - `a=rtcp-fb:<pt> nack pli` — 视频帧丢失时请求关键帧
  - `a=rtcp-fb:<pt> ccm fir` — 强制刷关键帧
  - `a=rtcp-fb:<pt> goog-remb`(可选) — 接收侧带宽估计
  - `a=rtcp-fb:<pt> transport-cc` — Transport-Wide CC
  - `a=extmap:N http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01`
  - `a=extmap:N http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time`
  - `a=extmap:N urn:3gpp:video-orientation`
- 音频:
  - `a=rtcp-fb:<pt> transport-cc`
  - `a=extmap:N urn:ietf:params:rtp-hdrext:ssrc-audio-level`(可选)

服务端在协商时会把 offer 中的 extmap id 直接 echo 到 answer 中。客户端只要保证 offer 里这些扩展存在即可。

**关于 RTCP 反馈的对外现象**:

- RTP 头里的 transport-cc 序号在转发时**会被透传**——保留即可
- **服务端当前不会在两端之间转发 RTCP 层的 TWCC 反馈包**;视频 NACK / PLI / FIR、音频 NACK 等其它反馈则会被正常转发
- 客户端的拥塞控制不能依赖收到对端 TWCC 反馈,应基于自身发送统计 + 对端 RR/SR 估计上下行链路状态

### 3.6 强制中转策略

业务上 1:1 通话**默认强制中转**,服务端 SDP answer 不会包含 srflx / relay / prflx 候选,只保留 host 候选(指向 relay 节点的公网 IPv4 / IPv6)。客户端不需要也不应该期望直接 P2P,所有媒体经服务端转发(便于审计、合规、录音、跨网络可达)。

管理员后台可关闭强制中转(`/api/admin/v1/voicecall/codec/opus` PUT 里 `forceRelay=false`),这是一个受审计的运维动作,仅用于受信任的内网部署场景。第三方客户端**不依赖此开关**——按 SDP answer 中的候选去 ICE 即可。

## 4. relay Hub 方法（连接 `/hubs/voicecall`）

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `StartCall` | `callId, sdpOffer, videoProfile?` | `CallStartResult` | 主叫发起通话（`callId` 来自 `POST /voicecall/sessions`，不再传 `targetUserId`） |
| `AnswerCall` | `callId, sdpOffer, videoProfile?` | `CallAnswerResult` | 被叫接听通话（`callId` 来自 `voicecall.incoming`） |
| `RejectCall` | `callId` | 无 | 被叫拒绝 |
| `Hangup` | `callId` | 无 | 任一方挂断 |
| `SendDtmf` | `callId, digits` | 无 | 发送 DTMF |

说明:

- 是否包含视频仍然由 SDP 决定
- `videoProfile` 用于业务侧协商视频档位,当前支持:`360p`、`720p`、`1080p`;未传则客户端自行使用默认档位
- 判断"来电是不是视频通话":直接看 `voicecall.incoming` 里的 `mediaMode` 字段(`"audio"` / `"audioVideo"`),不再需要解析 caller SDP
- **连错 relay 的处理**:如果客户端连到的 relay 不是该通话所绑定的节点(负载均衡把 SignalR 连接路由偏了),`StartCall` / `AnswerCall` 会返回 `success=false, errorMessage="CALL_WRONG_RELAY_NODE", relayUrl=<正确的 relay hub 地址>`;客户端应断开当前连接、连到 `relayUrl`、重试一次。
- `AnswerCall` 在主叫还没 `StartCall` 时返回 `errorMessage="CALL_NOT_READY"`(极少见的竞态),客户端可短暂重试。
- **会话所绑定的 relay 节点离线**:`StartCall` / `AnswerCall` 会返回 `errorMessage="CALL_RELAY_NODE_OFFLINE"`,且**不附带 `relayUrl`**(没有可重试的节点);客户端应直接结束通话 UI、提示用户重新发起新通话——会话已被服务端标记失败,无需再调 `Hangup`。
- 已结束 / 已被对方拒绝的通话上调用这些方法会返回 `CALL_ALREADY_ENDED` / `CALL_ALREADY_STARTED` / `CALL_ALREADY_ANSWERED` 等错误。
- `RejectCall` / `Hangup` 失败时(`CALL_NOT_FOUND` / `CALL_FORBIDDEN` / `AUTH_*` 等),服务端以信令异常形式抛回——在 SignalR JS SDK 里通常表现为 `invoke(...)` 返回的 Promise 被 reject,可读 `error.message`。`SendDtmf` 内部异常会被吞掉,客户端不应依赖它的错误反馈;若 DTMF 没送达,可凭对端 `DtmfReceived` 是否触发来判断。

各方法参数与返回结构：

`StartCall(callId, sdpOffer, videoProfile?)` → `CallStartResult`

| 字段 | 类型 | 方向 | 说明 |
|---|---|---|---|
| `callId` | string | 入参 | `POST /voicecall/sessions` 返回的通话 ID |
| `sdpOffer` | string | 入参 | 主叫端本地 Offer SDP |
| `videoProfile` | string? | 入参 | 可选视频档位 |
| `success` | bool | 返回 | 是否成功 |
| `callId` | string? | 返回 | 通话 ID（回显） |
| `sdpAnswer` | string? | 返回 | 服务端返回给主叫侧的 Answer SDP |
| `errorMessage` | string? | 返回 | 失败原因（如 `CALL_WRONG_RELAY_NODE`） |
| `relayUrl` | string? | 返回 | 仅当 `errorMessage=CALL_WRONG_RELAY_NODE` 时给出，需重连到此地址重试 |

`AnswerCall(callId, sdpOffer, videoProfile?)` → `CallAnswerResult`

| 字段 | 类型 | 方向 | 说明 |
|---|---|---|---|
| `callId` | string | 入参 | `voicecall.incoming` 里的通话 ID |
| `sdpOffer` | string | 入参 | 被叫端本地 Offer SDP |
| `videoProfile` | string? | 入参 | 可选视频档位 |
| `success` | bool | 返回 | 是否成功 |
| `callId` | string? | 返回 | 通话 ID（回显） |
| `sdpAnswer` | string? | 返回 | 服务端返回给被叫侧的 Answer SDP |
| `errorMessage` | string? | 返回 | 失败原因（如 `CALL_WRONG_RELAY_NODE` / `CALL_NOT_READY`） |
| `relayUrl` | string? | 返回 | 仅当 `errorMessage=CALL_WRONG_RELAY_NODE` 时给出 |

`RejectCall(callId)` / `Hangup(callId)` / `SendDtmf(callId, digits)`

| 字段 | 类型 | 方向 | 说明 |
|---|---|---|---|
| `callId` | string | 入参 | 通话 ID |
| `digits` | string | 入参 | 仅 `SendDtmf` 使用；支持 `0-9`、`*`、`#`、`A-D` |

> 被叫拒绝/挂断时，relay 连接是临时的：客户端可以在收到 `voicecall.incoming` 后只为发 `RejectCall` 而短暂连一下那台 relay，发完即断。

## 5. 服务端事件

### 5.1 常驻连接（`/ws/client`）上的来电事件

| 事件 | 数据形状 | 说明 |
|---|---|---|
| `voicecall.incoming` | `RealtimeEnvelope<VoiceCallIncomingNotification>` | 跨节点来电通知 |

`VoiceCallIncomingNotification`（即 envelope 的 `data` 字段）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID（被叫用它调 `AnswerCall`） |
| `callerUserId` | string | 主叫用户 ID |
| `callerDisplayName` | string | 主叫显示名 |
| `relayUrl` | string | 被叫需要连的 relay hub 地址，与主叫同一台 |
| `mediaMode` | string | `"audio"` 或 `"audioVideo"`——主叫是否打算开视频(自 2026-05-14 起统一为 camelCase,与 `POST /voicecall/sessions` 的入参一致;旧 `"audio-video"` 形式不会再出现) |
| `callerVideoProfile` | string? | 主叫声明的视频档位 |

> 注意：与旧版不同，来电事件**不再携带 caller 的 SDP**——被叫的 `AnswerCall` 是自己出 offer、relay 回 answer 给被叫；被叫从来电里只需要 `callId` + `relayUrl` + `mediaMode`。
> 移动端如果离线（没有活跃的 `/ws/client` 连接），仍会收到 `CreateSession` 触发的 APNs/FCM 离线推送（`PushScenario.Call`，`data` 里含 `callId`/`callerUserId`/`nodeId`）。

### 5.2 relay 连接（`/hubs/voicecall`）上的通话事件

| 事件 | 参数 | 说明 |
|---|---|---|
| `CallRinging` | `callId` | 对方振铃（主叫侧收到，确认被叫端开始响铃） |
| `CallAnswered` | `callId` | 对方已接听（主叫侧收到） |
| `CallEnded` | `callId, reason` | 通话结束（任一方收到） |
| `DtmfReceived` | `callId, digits` | 收到 DTMF |

注意:

- `CallAnswered` 只下发 `callId`,不回传新的 SDP——主叫用 `StartCall` 返回值里的 `sdpAnswer`,被叫用 `AnswerCall` 返回值里的 `sdpAnswer`
- 收到 `CallEnded` 后,客户端应同时断开这条临时的 relay 连接
- **`CallEnded` 只推给对端**:发起 `Hangup` / `RejectCall` 的本端**不会**收到自己触发的 `CallEnded`(本端发起即知道结果,自行收尾即可)
- **未连 relay 的被叫收不到 `CallEnded`**:如果被叫只收到了 `voicecall.incoming` 还没去连 relay hub(例如用户尚未点接听 / 拒绝),即便此时主叫挂断或会话被自动清理,被叫端也**不会**收到 `CallEnded`;客户端应自行结束响铃 UI(可设定本地超时或在用户操作时再检查会话有效性)

各事件参数结构:

`CallRinging(callId)` / `CallAnswered(callId)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID |

`CallEnded(callId, reason)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID |
| `reason` | string | 实时结束原因;当前值域见下表 |

`reason` 值域:

| 值 | 触发场景 |
|---|---|
| `rejected` | 被叫调用 `RejectCall` 拒绝通话 |
| `hangup` | 任一方调用 `Hangup` 主动挂断 |
| `connection_lost` | SignalR 连接断开,服务端自动清理活跃通话 |
| `admin_force_end` | 管理员后台强制结束通话 |
| `failed` | 通话建立或运行期间出错(WebRTC 连接失败、`AnswerCall` 服务端处理失败导致整通通话被回收等)。`AnswerCall` 失败时主叫会收到此事件,因为该通话已无重试入口、整体被销毁 |
| 描述性句子(超时) | 服务端自动清理触发的超时。**当前下发的是描述性句子**(例如 `"caller did not start the call within ...s"` 或 `"callee did not answer within ...s"`),客户端**不应做精确字符串匹配**,应按是否包含 `did not` / `within ...s` 等关键字识别为超时(详见 §11) |

`DtmfReceived(callId, digits)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID |
| `digits` | string | 收到的 DTMF 按键内容 |

## 6. 推荐接入流程

> 前提：客户端登录后已建立常驻 `/ws/client` 连接，并监听 `voicecall.incoming` 事件。

### 6.1 主叫发起语音通话

```text
1. POST /api/client/v1/voicecall/sessions { targetUserId, mediaMode: "audio" }
   → { callId, relayUrl }
2. 连接 relayUrl（即那台 relay 的 /hubs/voicecall）
3. 获取本地麦克风流
4. 创建 RTCPeerConnection，添加音频轨
5. createOffer + setLocalDescription
6. 调用 StartCall(callId, localOfferSdp, null)
   ↳ 若返回 errorMessage="CALL_WRONG_RELAY_NODE"：断开、连 result.relayUrl、重试一次
7. 使用返回的 sdpAnswer 设置 remote description
8. 等待 CallRinging / CallAnswered
9. 通话中可调用 SendDtmf
10. 调用 Hangup 结束，并断开 relay 连接
```

### 6.2 主叫发起音视频通话

```text
1. POST /api/client/v1/voicecall/sessions { targetUserId, mediaMode: "audioVideo", videoProfile: "720p" }
   → { callId, relayUrl }
2. 连接 relayUrl 的 /hubs/voicecall
3. 获取本地麦克风 + 摄像头流
4. 创建 RTCPeerConnection，添加音频轨 + 视频轨
5. createOffer + setLocalDescription
6. 调用 StartCall(callId, localOfferSdp, "720p")（必要时按 CALL_WRONG_RELAY_NODE 重连重试）
7. 使用返回的 sdpAnswer 设置 remote description
8. 监听 ontrack，绑定远端音视频流到播放器
9. 调用 Hangup 结束，并断开 relay 连接
```

### 6.3 被叫接听音视频通话

```text
1. 在常驻 /ws/client 连接上收到 voicecall.incoming { callId, callerUserId, callerDisplayName, relayUrl, mediaMode, callerVideoProfile }
2. 看 mediaMode 判断是语音还是视频来电（不需要解析 SDP）
3. 用户点击"语音接听"或"视频接听"（视频可降档，如 720p → 360p）
4. 连接 relayUrl 的 /hubs/voicecall
5. 根据接听方式获取本地媒体流
6. 创建 RTCPeerConnection，添加本地轨道
7. createOffer + setLocalDescription
8. 调用 AnswerCall(callId, localOfferSdp, selectedVideoProfile)
   ↳ CALL_WRONG_RELAY_NODE → 重连 result.relayUrl 重试；CALL_NOT_READY → 稍等重试
9. 使用返回的 sdpAnswer 设置 remote description
10. 监听远端轨道并渲染；收到 CallEnded 后断开 relay 连接

拒绝来电：临时连一下 relayUrl 调 RejectCall(callId)，发完即断。
```

## 7. Web 端示例

```typescript
// 0. 常驻 Gateway 连接（登录后一直保持），监听来电
const gateway = new HubConnectionBuilder()
  .withUrl(`${GATEWAY_BASE_URL}/ws/client`, { accessTokenFactory: () => accessToken })
  .withAutomaticReconnect()
  .build();
gateway.on("voicecall.incoming", (envelope) => {
  const { callId, callerDisplayName, relayUrl, mediaMode } = envelope.data;
  // 弹来电 UI；用户接听时走下面的 answerCall(callId, relayUrl, mediaMode)
});
await gateway.start();

// 1. 主叫发起通话
async function startCall(targetUserId: string, video: boolean) {
  // 1a. 分配 relay 节点 + 预创建会话
  const res = await fetch(`${API_BASE_URL}/api/client/v1/voicecall/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ targetUserId, mediaMode: video ? "audioVideo" : "audio", videoProfile: video ? "720p" : null }),
  });
  const { callId, relayUrl } = (await res.json()).data;

  // 1b. 连那台 relay
  const relay = new HubConnectionBuilder()
    .withUrl(relayUrl, { accessTokenFactory: () => accessToken })
    .build();
  await relay.start();

  // 1c. WebRTC offer → StartCall
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  const pc = new RTCPeerConnection({ iceServers: [] });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video }));
  let r = await relay.invoke("StartCall", callId, pc.localDescription!.sdp, video ? "720p" : null);
  if (!r.success && r.errorMessage === "CALL_WRONG_RELAY_NODE" && r.relayUrl) {
    await relay.stop();
    /* reconnect to r.relayUrl and retry once */ 
  }
  await pc.setRemoteDescription({ type: "answer", sdp: r.sdpAnswer });

  pc.ontrack = (e) => { remoteVideoEl.srcObject = e.streams[0]; };
  relay.on("CallEnded", () => relay.stop());
}
```

## 8. 节点亲和与客户端接入约束

第三方接入只需要把以下规则当作硬性约束遵守:

- **多节点部署是后端运维细节**。媒体中继可按多节点部署,服务端会自动在 `POST /voicecall/sessions` 阶段为本次通话选好其中一台节点,并把该节点的连接地址通过 `relayUrl` 同时下发给主叫(REST 响应)和被叫(`voicecall.incoming` envelope)。**主叫和被叫拿到的 `relayUrl` 一定相同**——客户端不需要、也不应该自己挑节点。
- **通话期内不要主动断开 / 不要被负载均衡飘走**。任何重连必须使用同一个 `relayUrl` 回到原节点;一旦连到了别的 relay 节点,服务端的 `CallRinging` / `CallAnswered` / `CallEnded` / `DtmfReceived` 推送会**送不到**。万一发生了错连(例如负载均衡把 SignalR 连接路由偏了),`StartCall` / `AnswerCall` 会返回 `errorMessage="CALL_WRONG_RELAY_NODE"` 并带回正确的 `relayUrl`,客户端按它重连重试即可。
- **同一个 `callId` 不要复用**。`StartCall` / `AnswerCall` 失败请重新调 `POST /voicecall/sessions` 取新的 `callId`,不要在同一 `callId` 上反复重试,服务端会做短时间窗口去重。
- **超时窗口**:`POST /voicecall/sessions` 拿到 `callId` 后必须在 **60 秒**内成功调用 `StartCall`;被叫端必须在响铃 **45 秒**内成功调用 `AnswerCall`,否则会话会被服务端自动关闭,并以描述性句子作为 `reason` 下发 `CallEnded`(例如 `"caller did not start the call within 60s"` / `"callee did not answer within 45s"`)。客户端识别超时**只匹配关键字**(`did not` / `within ...s`),不要做精确字符串比对。

> 节点选择策略由服务端决定,客户端不感知;若部署方在管理后台调整了节点列表或权重,对正在进行中的通话没有影响,只影响**后续新发起**的通话。

## 9. 管理后台联动

管理后台现在会同步展示：

- 节点地域 `region`
- 节点能力 `capabilities`
- 通话媒体模式 `mediaMode`
- 主叫/被叫是否发送视频
- 主叫请求视频档位、被叫选择视频档位、最终协商档位
- 音频/视频协商编码

其中：

- `mediaMode = "audio"` 表示纯语音
- `mediaMode = "audioVideo"` 表示该会话至少一侧发起了视频协商(自 2026-05-14 起统一为 camelCase)

后台常见状态值：

| 字段 | 值 | 说明 |
|---|---|---|
| `state` | `0` | `initiating` 发起中 |
| `state` | `1` | `ringing` 振铃中 |
| `state` | `2` | `active` 通话中 |
| `state` | `3` | `ended` 已结束 |
| `state` | `4` | `failed` 失败（接通后中途出错） |
| `state` | `5` | `rejected` 被拒绝 |
| `state` | `6` | `timeout` 超时 |
| `state` | `7` | `cancelled` 已取消 |
| `state` | `8` | `initiation_failed` 通话建立阶段失败（接通前；与中途 `failed` 区分） |
| `hangupCause` | `0` | `normal` 正常结束 |
| `hangupCause` | `1` | `caller_hangup` 主叫挂断 |
| `hangupCause` | `2` | `callee_hangup` 被叫挂断 |
| `hangupCause` | `3` | `rejected` 被拒绝 |
| `hangupCause` | `4` | `timeout` 超时 |
| `hangupCause` | `5` | `cancelled` 已取消 |
| `hangupCause` | `6` | `failed` 失败 |
| `hangupCause` | `7` | `admin_force_end` 管理员强制结束 |
| `hangupCause` | `8` | `node_offline` 中继节点离线 |
| `hangupCause` | `9` | `connection_lost` 连接丢失 |

状态机约定（实现层）：

- 状态转移单调向前：`initiating → ringing → active`，不可回退（如 `active → ringing` 会被拒绝）
- 任意非终止态都可以直接进入任意终止态（`ended` / `failed` / `rejected` / `timeout` / `cancelled` / `initiation_failed`），由 `hangupCause` 区分原因；未显式给 cause 时按终止态取规范默认值（如进入 `rejected` 默认 `hangupCause=rejected`）
- 终止态是"粘性"的：通话一旦终止，后续的状态写入（如用户挂断后管理员又强制结束）都是无操作而不是报错——并发的多个结束路径"先到先得"
- `durationSeconds`（接通时长）= `endedAt - answeredAt`；从未接通的通话（`rejected` / `timeout` / `cancelled` / `initiation_failed`）记 `0` 而不是 `null`

## 10. 录制说明

当前录制能力仅限音频录制,不做视频录制;**默认关闭**:

- 录音开关在管理后台「通话编码与录音」页(需 `voicecall.manage_nodes` 权限),全局生效、默认关闭、改动仅对新通话生效
- 文件格式:双声道 MP3,**左声道主叫,右声道被叫**
- 录音从通话**接通(Active)**那一刻开始计——响铃阶段不录;文件时长等于实际接通时长
- 录音管线与媒体转发解耦,**录音失败不会影响通话本身**(通话照常进行)
- 录音保留期由管理员在后台配置;过期后服务端自动清理

因此,音视频通话的后台录音下载只能回放音频,不包含视频画面。

## 11. 已知限制

- 当前不提供服务端视频录制
- 当前不提供服务端音视频转码
- 当前不提供跨编码桥接(例如一端 VP8、一端 H264)
- 节点选择当前以服务端策略为准,客户端不感知,也不能指定 relay
- **relay 节点重启**:重启后客户端到该节点的 SignalR 连接会被本地 `onclose` 检测到,但**不会**收到服务端推送的 `CallEnded`。客户端必须按本地连接断开 + WebRTC ICE 失败自行结束通话 UI(详见 §8)
- **通话期内不要换 relay 节点**:任何重连必须用 `POST /voicecall/sessions` 下发的 `relayUrl` 回到原节点(详见 §8)
- **同一 `callId` 不要复用**:失败请重新调 `POST /voicecall/sessions` 取新 `callId`(详见 §8)
- **DTMF 不写 RTP**:`SendDtmf` 通过信令通道传给对端,以 `DtmfReceived` 事件形式触发;**不会**写入 RTP 媒体流(无 `telephone-event` 包)。若对端是非 ZTChat 客户端(例如纯标准 WebRTC),不会收到 DTMF
- **TWCC RTCP 反馈**:RTP 头中的 transport-cc 序号会按服务端转发的 RTP 流重新打号,接收侧的 TWCC 反馈包会被服务端读出 / 翻译 / 转发回发送侧,使发送端的码控可以据此调整。客户端需要在 SDP 中声明 transport-cc 扩展以启用此能力(详见 §3.5)

如果你们的客户端需要接入音视频通话,建议统一使用 `OPUS + VP8`;仅支持 PCMU 的旧客户端将无法完成音频协商。
