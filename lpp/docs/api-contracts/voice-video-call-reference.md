# 音视频通话字段与状态速查

> 文档校对快照:2026-05-14

本文档补充 [voice-video-call.md](./voice-video-call.md) 中的接入说明,重点列出当前公开 Hub 方法、事件参数、媒体协商约定、实时 reason 和持久化状态枚举。
缺失字段与补充枚举统一见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 连接与鉴权

| 项目 | 值 |
|---|---|
| Relay Hub 路径 | `/hubs/voicecall`(**调用前必须先通过 `POST /api/client/v1/voicecall/sessions` 拿到对应 relay 节点的 `relayUrl`,再用 `relayUrl + /hubs/voicecall` 建链**) |
| 鉴权方式 | 客户端业务 `accessToken` |
| 连接 URL(直传 Token) | `wss://{relayHost}/hubs/voicecall?access_token={jwt}` |
| 信令协议 | SignalR(**JSON Hub Protocol;勿启用 MessagePack**) |
| 音频编码 | `OPUS/48000/2`(m-line 写双声道是 WebRTC 惯例,实际单/双声道由 fmtp `stereo=0;sprop-stereo=0` 控制——服务端固定单声道) |
| 视频编码 | `VP8/90000` |

鉴权边界:

- 只接受客户端业务 Token,不接受平台 `platformToken`、访客 Token
- 个人空间 Token 与租户空间 Token 都属于客户端业务 Token,均可连接 `/hubs/voicecall`
- 鉴权失败的具体值见 §1.2

### 1.1 来电通知不在本 Hub 上

被叫端**先**在常驻的 `/ws/client`(Gateway,详见 [client-api.md §10](./client-api.md))上收到 `voicecall.incoming` envelope(含 `callId / callerUserId / callerDisplayName / relayUrl / mediaMode / callerVideoProfile`),**然后**才用 `relayUrl + /hubs/voicecall` 建立到 relay 的 SignalR 连接,调用 `AnswerCall(callId, …)` 接听。`/hubs/voicecall` 本身**不**广播来电事件。

### 1.2 Auth 错误码

Hub 连接或方法调用因鉴权失败时,服务端以信令异常形式抛回。客户端 SDK 通常表现为 `invoke(...)` 返回的 Promise 被 reject,`error.message` 取以下值之一(连接建立阶段失败则表现为 `start()` 抛出):

| message | 含义 |
|---|---|
| `AUTH_TENANT_REQUIRED` | Token 中缺租户上下文,空间引导态/平台态都会触发 |
| `AUTH_USER_REQUIRED` | Token 中缺用户身份 |
| `AUTH_CLIENT_TOKEN_REQUIRED` | Token 类型不是客户端业务 Token(例如错传了平台 Token 或访客 Token) |
| `Invalid call ID.` | `callId` 参数不是合法 GUID 字符串 |

## 2. Client Invokable 方法

### 2.1 `StartCall(callId, sdpOffer, videoProfile?) -> CallStartResult`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string (GUID) | **必填**，由 `POST /api/client/v1/voicecall/sessions` 预先下发的会话 ID（被叫身份也在此次 REST 调用中被绑定） |
| `sdpOffer` | string | 主叫端本地 Offer SDP |
| `videoProfile` | string? | 可选视频档位，支持 `360p` / `720p` / `1080p` |

返回：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | bool | 是否成功 |
| `callId` | string? | 通话 ID |
| `sdpAnswer` | string? | 服务端返回给主叫侧的 Answer SDP |
| `errorMessage` | string? | 失败时的错误码,值域见 §2.6 |
| `relayUrl` | string? | **仅当 `errorMessage = "CALL_WRONG_RELAY_NODE"` 时有值**;指向正确的 relay 节点公网地址,客户端应切换到该地址重连 `/hubs/voicecall` 重试 |

### 2.2 `AnswerCall(callId, sdpOffer, videoProfile?) -> CallAnswerResult`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID，GUID 字符串 |
| `sdpOffer` | string | 被叫端本地 Offer SDP |
| `videoProfile` | string? | 可选视频档位，支持 `360p` / `720p` / `1080p` |

返回：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | bool | 是否成功 |
| `callId` | string? | 通话 ID |
| `sdpAnswer` | string? | 服务端返回给被叫侧的 Answer SDP |
| `errorMessage` | string? | 失败时的错误码,值域见 §2.6 |
| `relayUrl` | string? | **仅当 `errorMessage = "CALL_WRONG_RELAY_NODE"` 时有值**;含义同 §2.1 |

### 2.3 `RejectCall(callId)`

被叫拒绝通话，主叫会收到：

```text
CallEnded(callId, "rejected")
```

**失败行为**:服务端校验失败时以信令异常形式抛回——在 SignalR JS SDK 里通常表现为 `invoke(...)` 返回的 Promise 被 reject,`error.message` 可能为 `CALL_NOT_FOUND` / `CALL_FORBIDDEN` / `AUTH_*` 等;调用方自身不会收到 `CallEnded`(本端发起即知道结果)。

### 2.4 `Hangup(callId)`

任一方挂断，对端会收到：

```text
CallEnded(callId, "hangup")
```

**失败行为**:同 §2.3,服务端以信令异常形式抛回(`invoke(...)` Promise 被 reject)。调用方自身不会收到 `CallEnded`。

### 2.5 `SendDtmf(callId, digits)`

支持 `0-9`、`*`、`#`、`A-D`。

**重要语义**:digits 通过信令通道(SignalR)送达对端,以 `DtmfReceived` 事件形式触发;**不会**写入 RTP 媒体流(无 `telephone-event` 包)。若对端是非 ZTChat 客户端(例如纯标准 WebRTC),则不会收到任何 DTMF。该方法**不返回成功/失败状态、也不抛信令异常**,客户端不要依赖它的错误反馈。

### 2.6 Hub 方法 `errorMessage` 值域

`StartCall` / `AnswerCall` 在 `success=false` 时返回的 `errorMessage` 可能取值:

| `errorMessage` | 触发场景 | `relayUrl` |
|---|---|---|
| `CALL_NOT_READY` | 会话状态尚未达到可调用条件(`POST /voicecall/sessions` 尚未返回成功,或已超过 60 秒预留窗口) | — |
| `CALL_NOT_FOUND` | `callId` 不存在或不属于当前用户 | — |
| `CALL_FORBIDDEN` | 当前用户既不是主叫也不是被叫 | — |
| `CALL_ALREADY_STARTED` / `CALL_ALREADY_ANSWERED` / `CALL_ALREADY_ENDED` | 状态机不允许该动作 | — |
| `CALL_VIDEO_PROFILE_INVALID` | `videoProfile` 不在 `360p / 720p / 1080p` 中 | — |
| `CALL_WRONG_RELAY_NODE` | 客户端连错了 relay 节点;请按 `relayUrl` 切换后重试 | **有值** |
| `CALL_RELAY_NODE_OFFLINE` | 会话所绑定的 relay 节点已离线/失联;**无 `relayUrl` 重试** | — |
| `AUTH_TENANT_REQUIRED` / `AUTH_USER_REQUIRED` / `AUTH_CLIENT_TOKEN_REQUIRED` | 见 §1.2 | — |

收到 `CALL_RELAY_NODE_OFFLINE` 时客户端应**直接结束 UI 并提示用户重新发起**;会话本身已被 relay 标记 `Failed`,不需要再走 `Hangup`。

## 3. 服务端推送事件

> 来电通知 `voicecall.incoming` **不在本 Hub 上**;它通过常驻 `/ws/client`(Gateway)推送,详见 [client-api.md §10](./client-api.md) 与本文档 §1.1。`/hubs/voicecall` 上**没有** `IncomingCall` 事件。

`/hubs/voicecall` 仅推送以下 4 类事件:

### 3.1 `CallRinging(callId)`

主叫收到"对方已振铃"。

### 3.2 `CallAnswered(callId)`

主叫收到"对方已接听"。

### 3.3 `CallEnded(callId, reason)`

| 参数 | 类型 | 说明 |
|---|---|---|
| `callId` | string | 通话 ID |
| `reason` | string | 实时结束原因；完整值域见第 5 节 |

**仅推送给对端**:本端动作发起方(`Hangup`/`RejectCall` 的调用者)**不会**收到自己触发的 `CallEnded`。
**前置连接要求**:`CallEnded` 仅经 `/hubs/voicecall` 推送;若被叫端在 `voicecall.incoming` 后还**没有连**到 relay 的 hub,则**不会**收到 `CallEnded`,需要根据用户操作自行结束 ringing UI。

### 3.4 `DtmfReceived(callId, digits)`

对端收到 DTMF（**仅 SignalR 应用层信道**,RTP 流不携带 telephone-event）。

## 4. SDP / 媒体模式判断

客户端**应通过 `voicecall.incoming` envelope 中的 `mediaMode` 字段判断来电类型**(`"audio"` 或 `"audioVideo"`),**不要**依赖解析 SDP 中是否存在 `m=video`——服务端在做 SDP 转换时会按目的端能力裁剪 m-line。

管理后台会基于持久化的主叫/被叫 SDP 计算:

| 字段 | 说明 |
|---|---|
| `mediaMode` | `audio` 或 `audioVideo`(服务端 JSON 输出的规范值;客户端**提交**时也接受 legacy `audio-video`,响应一律输出 `audioVideo`) |
| `callerHasVideo` | 主叫 SDP 是否包含视频 |
| `calleeHasVideo` | 被叫 SDP 是否包含视频 |
| `audioCodec` | 当前会话音频编码 |
| `videoCodec` | 当前会话视频编码 |
| `callerVideoProfile` | 主叫声明的视频档位 |
| `calleeVideoProfile` | 被叫接听时选择的视频档位 |
| `negotiatedVideoProfile` | 当前后台识别的最终档位，优先使用被叫选择值 |

## 5. 实时 `reason` 字符串

| `reason` | 触发场景 |
|---|---|
| `rejected` | 被叫拒绝(`RejectCall`) |
| `hangup` | 任一方主动挂断(`Hangup`) |
| `connection_lost` | SignalR 连接断开后 relay 端清理本端 media leg |
| `failed` | WebRTC / 媒体中继异常终止(含 `AnswerCall` 失败的销毁) |
| `admin_force_end` | 管理员后台强制结束 |
| **超时(描述性句子)** | 服务端的自动清理触发;**当前下发的是描述性句子**(例如 `"caller did not start the call within 60s"` 或 `"callee did not answer within 45s"`),客户端**不应做精确字符串匹配**,应按是否包含 `did not` / `within ...s` 等关键字识别为超时 |

接入方需要知道的超时约束:`POST /voicecall/sessions` 拿到 `callId` 后必须在 **60 秒**内成功调用 `StartCall`,否则会话会被自动清理并下发上述超时 `reason`;被叫端必须在 **45 秒**响铃内成功调用 `AnswerCall`,否则同样自动清理并下发超时 `reason`。

## 6. 持久化状态枚举

### 6.1 `CallState`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `Initiating` | 发起中 |
| `1` | `Ringing` | 振铃中 |
| `2` | `Active` | 通话中 |
| `3` | `Ended` | 已结束 |
| `4` | `Failed` | 失败（接通后中途出错） |
| `5` | `Rejected` | 已拒绝 |
| `6` | `Timeout` | 超时 |
| `7` | `Cancelled` | 已取消 |
| `8` | `InitiationFailed` | 通话建立阶段失败（接通前；与中途 `Failed` 区分） |

转移规则：`Initiating → Ringing → Active` 单调向前；任意非终止态可直接到任意终止态（`Ended`/`Failed`/`Rejected`/`Timeout`/`Cancelled`/`InitiationFailed`）；终止态粘性（后续写入为无操作，不报错，并发结束路径先到先得）。

### 6.2 `HangupCause`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `Normal` | 正常 |
| `1` | `CallerHangup` | 主叫挂断 |
| `2` | `CalleeHangup` | 被叫挂断 |
| `3` | `Rejected` | 被叫拒绝 |
| `4` | `Timeout` | 超时 |
| `5` | `Cancelled` | 主叫取消 |
| `6` | `Failed` | 失败 |
| `7` | `AdminForceEnd` | 管理员强制结束 |
| `8` | `NodeOffline` | 中继节点离线 |
| `9` | `ConnectionLost` | 连接断开 |

## 7. 节点字段

管理后台节点接口会返回：

| 字段 | 说明 |
|---|---|
| `nodeId` | 节点唯一标识 |
| `address` / `port` | 节点对外宣告的媒体地址(写入 SDP/ICE candidate 的公网 IP)。可在管理后台「通话节点」页按节点改写 |
| `region` | 节点地域，例如 `asia-shanghai` |
| `capabilities` | 节点能力，当前默认 `audio,video,audio:opus,video:vp8` |
| `maxCalls` | 节点最大并发通话数 |
| `activeCalls` | 当前活跃通话数 |
| `cpuUsage` | 当前 CPU 使用率 |

每个节点在管理后台还会展示自己的对外信令基址(例如 `https://relay-cn.example.com`),用于让 `POST /api/client/v1/voicecall/sessions` 把同一个 `relayUrl` 下发给主叫和被叫,实现会话亲和。长时间未续约的节点会被服务端视为离线、不再被选中分配新通话——具体心跳周期与离线阈值是服务端内部参数,客户端只需把 `CALL_NO_RELAY_AVAILABLE`(REST)与 `CALL_RELAY_NODE_OFFLINE`(Hub)当作"当前没有可用节点 / 原节点失联"处理即可。

### 7.1 全局 Opus 编码 / 媒体策略设置

管理后台「通话编码与录音」页(需 `voicecall.manage_nodes` 权限)可配置,全局生效,**仅对新通话生效**;后台变更后约 30 秒内对所有新发起的通话生效:

| 字段 | 默认 | 说明 |
|---|---|---|
| `targetBitrateBps` | `32000` | OPUS 目标码率,同时写入 fmtp 的 `maxaveragebitrate`(2026-05-14 起从 24000 调整,与主流 WebRTC 客户端默认值对齐) |
| `complexity` | `5` | OPUS 编码复杂度 0–10 |
| `fmtp` | `minptime=10;useinbandfec=1;stereo=0;sprop-stereo=0;usedtx=1;maxaveragebitrate=32000` | 完整 fmtp 串(服务端会拒绝含控制字符或形如 `a=`/`m=` 的 SDP 注入内容) |
| `rtpPayloadType` | `111` | OPUS 动态 payload type 96–127 |
| `recordingEnabled` | `false` | 通话录音总开关,**默认关闭** |
| `forceRelay` | `true` | **强制中转策略**。`true` 时服务端只在 SDP answer 中保留 host 候选,所有媒体经 relay 转发;`false` 时允许 ICE 协商 srflx/prflx 路径(P2P),受审计日志监控,仅供受信任内网 |

## 8. 当前公开边界与已知限制

- 不支持视频录制下载
- 不支持服务端视频转码
- 不支持把一个视频编码桥接成另一个视频编码
- `CallAnswered` 不会额外回传新的 SDP
- **通话期内不要换 relay 节点**:主叫/被叫初次连接已由 `POST /voicecall/sessions` 下发的 `relayUrl` 锁定到同一台 relay。**若客户端在通话期内断开 hub 并被负载均衡分配到另一节点**,服务端的 `CallRinging` / `CallAnswered` / `CallEnded` / `DtmfReceived` 等推送会**送不到**。客户端务必:(1) 通话期内不要主动断开;(2) 任何重连都必须使用同一个 `relayUrl` 回到原节点。
- **relay 节点重启**:重启后客户端到该节点的 SignalR 连接会被本地 `onclose` 检测到,但**不会**再收到服务端推送的 `CallEnded`。客户端必须按本地连接断开 + WebRTC ICE 失败自行结束通话 UI。
- **同一 `callId` 不要复用**:服务端对同一个 `callId` 在短时间内的重复 invite 会做去重。`StartCall` 失败请重新调 `POST /voicecall/sessions` 取新的 `callId`,不要在同一 `callId` 上反复重试。
- **DTMF 不走 RTP**:`SendDtmf` 仅通过信令通道传给对端,不会写入 RTP 媒体流(详 §2.5)。
- **TWCC RTCP 反馈不转发**:RTP 包头中的 transport-cc 序号会被透传,但 RTCP 层的 TWCC 反馈包当前**不会**在两端之间转发。客户端拥塞控制只能基于自身发送统计与对端 RTCP RR/SR;视频 NACK/PLI/FIR、音频 NACK 等其它反馈会被正常转发。

## 9. 通话记录消息

通话结束后，客户端可在会话中插入一条 `messageType=call_log` 的消息，用于在聊天记录中展示通话摘要。

`body.callLog` 结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 通话会话 ID，对应 `StartCall` / `AnswerCall` 返回的 `callId` |
| `mediaMode` | string | `audio` 或 `audioVideo`(服务端规范输出值;客户端提交也接受 legacy `audio-video`) |
| `durationSeconds` | int | 通话时长（秒），未接通为 `0` |
| `endReason` | string | 结束原因，对应第 5 节的 `reason` 值或第 6.2 节的 `HangupCause` |
| `isCaller` | bool | 当前用户是否为主叫方 |

示例：

```json
{
  "clientMsgId": "calllog-001",
  "messageType": "call_log",
  "body": {
    "callLog": {
      "callId": "019d7a00-1234-7890-abcd-ef0123456789",
      "mediaMode": "audioVideo",
      "durationSeconds": 300,
      "endReason": "hangup",
      "isCaller": false
    }
  }
}
```

客户端展示建议：

- 根据 `mediaMode` 显示"语音通话"或"视频通话"图标
- 根据 `durationSeconds` 显示通话时长，`0` 时显示"未接通"
- 根据 `isCaller` + `endReason` 组合显示"已拨出"/"已接听"/"未接来电"/"对方已取消"等文案
