# 屏幕共享接入文档

> 文档校对快照:2026-05-15

本文档说明如何在 ZTChat 的 WebRTC 通话基础上为第三方 APP / Web 客户端实现「屏幕共享」。屏幕共享**不是独立通道**——它复用现有的音视频通话信令与媒体通路,差异只在客户端如何采集视频源、以及一些档位与权限上的注意事项。

整体音视频通话契约见 [voice-video-call.md](./voice-video-call.md);本文只覆盖屏幕共享相关的差异点。

---

## 1. 概述

ZTChat 的媒体中继在协议层把屏幕共享视为「一路 VP8 视频轨」,与摄像头视频走完全相同的 SDP / RTP / RTCP 链路:

```text
浏览器/APP A ──screen track (VP8)──→ 媒体中继(relay) ──→ 浏览器/APP B
                                  ⇅ DTLS-SRTP
                                  音频轨与原音视频通话相同
```

要点:

- 复用现有 `POST /api/client/v1/voicecall/sessions` + `StartCall` / `AnswerCall` 调用,**不需要新的接口**
- 屏幕画面用 `mediaMode = "audioVideo"`,**与摄像头视频共用同一个枚举值**——服务端不区分,只看 SDP 中是否包含 `m=video`
- 服务端不做编码转换、不做画面合成、不做录制;屏幕共享的画面**不会**落入后台录音(后台只录音频,见 [voice-video-call.md §10](./voice-video-call.md#10-录制说明))
- 视频编码仍固定为 `VP8 / 90000`;音频仍固定为 `OPUS`
- 不能在一次通话里**同时**发送摄像头视频轨 + 屏幕共享视频轨。一次通话每方向只有一条视频轨(`m=video` 行只有一条);切换屏幕共享需要替换该视频轨上的 source
- 屏幕共享不影响通话本身的状态机:仍是 `initiating → ringing → active → ended`,屏幕的开/关由客户端在本地控制
- 屏幕共享期间,远端事件 `CallRinging` / `CallAnswered` / `CallEnded` / `DtmfReceived` 行为不变

---

## 2. 客户端如何采集屏幕画面

这是各平台**唯一**的差异。WebRTC SDK 只负责传输——屏幕画面的获取由各操作系统提供,客户端必须使用各平台**官方批准**的屏幕录制 / 广播机制,然后把得到的 video track 喂给 `RTCPeerConnection`。

### 2.1 平台能力对照

| 场景 | Web (Chrome / Edge / Safari) | Android | iOS |
|---|---|---|---|
| APP 内共享自己的画面 | `navigator.mediaDevices.getDisplayMedia` | `MediaProjection` (用户授权后) | `RPScreenRecorder` (in-app, 仅 APP 自身画面) |
| 共享整个手机屏幕 | 同上,Chrome 会让用户选择窗口 / 标签 / 屏幕 | `MediaProjection` + 前台服务 | `ReplayKit Broadcast Extension`(由系统屏幕广播选择器启动) |
| APP 切后台后继续传屏 | 视浏览器策略而定,一般可以(标签后台 ≠ 标签关闭) | 可以,但必须有 Foreground Service + 持续通知 | 可以,但必须用 Broadcast Extension(主 APP 已退后台) |
| 静默后台抓屏 / 后台启动屏幕共享 | 不允许 | 不允许 | 不允许 |

> 一句话:**手机上可以传输屏幕数据,但后台场景必须走系统认可的屏幕录制 / 广播机制**。Android 用 `MediaProjection` + Foreground Service;iOS 用 `ReplayKit Broadcast Upload Extension`。WebRTC 只负责把采集到的视频帧编码发出去。

### 2.2 Web (`getDisplayMedia`)

```ts
// 在用户点击「开始共享」时调用,必须由用户手势触发
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    // 推荐配置:屏幕内容文字较多,优先保证清晰
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 15, max: 30 },
    // Chrome / Edge:可指定 displaySurface 提示用户选择哪种来源
    // 'monitor' | 'window' | 'browser' | undefined
  } as MediaTrackConstraints,
  // ZTChat 不混音,音频走麦克风轨;系统音频通常不传(后台录音也不录)
  audio: false,
});

const screenTrack = screenStream.getVideoTracks()[0];

// 用户手动停止共享(点浏览器原生的「停止共享」)时收到通知
screenTrack.onended = () => {
  // 通知 UI 共享已停止;按业务决定是切回摄像头还是结束通话
};
```

### 2.3 Android (`MediaProjection`)

要点:

- 必须先请求 `MediaProjectionManager.createScreenCaptureIntent()`,由用户在系统弹窗中确认
- Android 10+ 要求在用户授权**之前**就启动 `Foreground Service`,并在通知里说明正在录屏。否则 `getMediaProjection()` 会抛 `SecurityException`
- 把 `MediaProjection` 包成一个 `VideoCapturer`(常用做法是 `org.webrtc.ScreenCapturerAndroid`),`startCapture` 后即可获得 `VideoTrack`
- APP 进入后台时**不要**停掉 Foreground Service,否则录屏立即终止

```kotlin
// 简化伪代码
val capturer = ScreenCapturerAndroid(resultData, object : MediaProjection.Callback() {
  override fun onStop() { /* 用户在通知里点了「停止」 */ }
})
val videoSource = peerConnectionFactory.createVideoSource(true /* isScreencast */)
capturer.initialize(surfaceTextureHelper, applicationContext, videoSource.capturerObserver)
capturer.startCapture(1920, 1080, 15)
val screenTrack = peerConnectionFactory.createVideoTrack("ARDAMSv0", videoSource)
```

注意:`isScreencast = true` 这个参数很重要——它会调整 libwebrtc 的码控策略,适应屏幕内容的低运动、高细节特征,减少马赛克与码率震荡。

### 2.4 iOS (`ReplayKit Broadcast Extension`)

iOS 平台的硬性约束:

- **APP 自身画面分享**(主 APP 在前台):可以用 `RPScreenRecorder.shared().startCapture` 直接拿到 `CMSampleBuffer`,在主 APP 进程内塞给 `RTCPeerConnection`
- **整机屏幕共享**(主 APP 可退后台):必须创建一个 **Broadcast Upload Extension**(独立进程),由用户从系统「屏幕录制选择器」启动,样本帧通过 `processSampleBuffer:` 回调进入 Extension 进程
- Broadcast Extension 是**独立进程**,内存上限约 50MB,**不能复用主 APP 内的 `RTCPeerConnection`**。常见做法:
  - 在 Extension 里把帧通过 App Group + 共享内存 / IPC 发回主 APP,主 APP 持有 WebRTC 连接;或者
  - 在 Extension 内单独建一条与服务端的连接(需要为屏幕共享单独发起一次通话,主 APP 进程做信令)
- 主 APP 进程因 iOS 后台限制不能持续编码视频帧,**通话不能掉**——这一点必须仔细评估;真正稳的做法是 Extension 内自己跑 WebRTC

> iOS 屏幕共享接入实现复杂度明显高于 Android / Web,且 50MB 内存上限要求你必须用硬件编码(`H.264` Hardware Encoder 或精简 VP8 实现)。如果你的客户端只需要「APP 内共享自身画面」,优先用 `RPScreenRecorder` 在前台进程内完成,**不要**碰 Broadcast Extension。

### 2.5 不同来源对码控的提示

| 内容类型 | 推荐 framerate | 推荐分辨率 | 备注 |
|---|---|---|---|
| 静态文档 / PPT / 代码 | 5-10 fps | 1080p / 1440p | 文字清晰度优先,低帧率即可 |
| 视频播放 / 动画 | 30 fps | 720p / 1080p | 与摄像头视频同档 |
| 滚动 / 拖拽窗口 | 15-20 fps | 720p / 1080p | TWCC + GCC 会自适应,无需手动调 |

ZTChat 媒体中继支持 RTCP TWCC 反馈与 NACK→PLI 视频自愈,客户端无需在切换内容时手动重新协商。

---

## 3. 发起一次屏幕共享通话

完全复用音视频通话流程:

```text
1. POST /api/client/v1/voicecall/sessions
   { "targetUserId": "<被叫>", "mediaMode": "audioVideo", "videoProfile": "1080p" }
   ⇒ 拿到 { callId, relayUrl }

2. 客户端本地:
   - getUserMedia({ audio: true })     ← 麦克风
   - getDisplayMedia({ video: ... })   ← 屏幕(Android/iOS 走对应 API)

3. 建 RTCPeerConnection,addTrack(audio) + addTrack(screen)

4. 连接 wss://{relayUrl}/hubs/voicecall(JWT 鉴权,见 voice-video-call.md §2.3)

5. invoke("StartCall", callId, sdpOffer, "1080p")
   ⇒ { success, sdpAnswer }

6. 被叫端从 voicecall.incoming 收到 mediaMode="audioVideo"
   - 业务侧自行决定 UI 显示「来电:屏幕共享」还是「来电:视频通话」
     —— 服务端 SDP 不区分,客户端可以用约定的元数据字段或
     直接展示「视频来电」让用户接听后再看内容
   - 接听流程与 voice-video-call.md §6.3 完全一致
```

**建议的 `videoProfile` 取值**:

- 屏幕共享建议传 `"1080p"`(若被叫接收端能力允许)。屏幕内容的可读性比帧率更重要
- 若网络较差,客户端可主动降到 `"720p"`,但服务端不强制限制档位

> `videoProfile` 是业务侧的提示字段,服务端会记录到通话审计;真正生效的清晰度仍由 SDP 协商与 GCC 码控决定。

---

## 4. 通话中切换:屏幕共享 ↔ 摄像头视频

屏幕共享与摄像头共用同一条视频轨。切换方法是替换轨道的 source,**不需要重新协商 SDP**:

```ts
const sender = pc.getSenders().find((s) => s.track?.kind === "video");

// 从摄像头切到屏幕
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
await sender.replaceTrack(screenStream.getVideoTracks()[0]);

// 切回摄像头
const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
await sender.replaceTrack(camStream.getVideoTracks()[0]);
```

注意:

- `replaceTrack` 不触发新的 offer/answer,对端会无感切换
- 切到屏幕时,**关键帧之间会有一两秒画面延迟或马赛克**——服务端的关键帧守卫会主动触发对端重发关键帧,通常 0.5-1.5 秒内恢复清晰
- 在 Android 上,切到屏幕**前**必须先启动 Foreground Service;切回摄像头**后**才能停止 Foreground Service
- 切换前后,音频轨不动

---

## 5. 双向屏幕共享

ZTChat 媒体中继**支持双向视频**,因此 A 共享屏幕、B 也共享屏幕的双向共享场景是允许的:每方各自发自己的视频轨,服务端独立转发。客户端 UI 自行决定如何并排展示两侧的画面。

**不支持的场景**:

- 同一端**同时**发送摄像头 + 屏幕共享两条视频轨(需要单端两条 `m=video`,服务端当前的 SDP 协商只接受一条视频 m-line)。若有此需求,客户端可在本地用 Canvas 合成成单路视频再发送
- 一对多广播(N 人同时观看一份屏幕):当前通话是 1:1,群组屏幕共享需等待后续多方通话能力开放

---

## 6. 兼容性与回退

如果某一端不支持屏幕共享 API(例如旧版浏览器、未开放权限的 iOS 客户端):

- 建议在用户尝试开启屏幕共享前**做一次能力检测**(Web 端 `'getDisplayMedia' in navigator.mediaDevices`;Android 检查 `MediaProjectionManager`;iOS 检查 `RPScreenRecorder.isAvailable`)
- 检测失败时,弹出明确文案:「当前设备不支持屏幕共享」并禁用按钮
- 双方至少一方不支持视频时(纯语音 SDK),通话会退化为音频——服务端不会因为屏幕共享而失败,只是看不到画面

---

## 7. 性能与体验建议

- **屏幕分辨率**:Web 端 `getDisplayMedia` 默认会按浏览器窗口尺寸采集,建议 `ideal: 1920x1080` 而不是 `max`,让浏览器在性能不足时自动降档
- **帧率**:静态内容用 5-10 fps 即可,服务端不限制;动态内容(视频播放、滚动)按 15-30 fps
- **CPU 占用**:Android `ScreenCapturerAndroid` 与 iOS Broadcast Extension 都用硬件路径采集,主要 CPU 开销在 VP8 编码本身;低端设备建议把分辨率上限设到 720p
- **回声**:屏幕共享通常不传系统音频,所以不会出现共享端的回声;若客户端选择传系统音频,需要自行处理与麦克风音频的混音
- **隐私**:屏幕共享会暴露用户屏幕上的全部内容(包括通知)。建议客户端在开始共享前给出明确提示;Android 系统会自动叠加录屏指示条,iOS 会在状态栏显示红色录制标记

---

## 8. 已知限制

- 当前不提供服务端屏幕**录制**(后台录音也仅录音频,见 [voice-video-call.md §10](./voice-video-call.md#10-录制说明))
- 当前不提供服务端视频转码,双方均须支持 VP8
- 同一通话**不能同时**发摄像头视频轨 + 屏幕共享视频轨(单端两条 m=video 不被接受)
- 当前不支持多方屏幕共享(只支持 1:1)
- iOS Broadcast Extension 的 50MB 内存上限是系统强制,任何 VP8 软件编码实现都会触及上限——必须使用硬件编码或精简实现
- Android 在某些机型上,启动 `MediaProjection` 后第一帧延迟可达 1-2 秒(系统行为,无法绕过)
- Web 端 `getDisplayMedia` 在跨域 iframe 内无法工作;必须在主页面上下文调用

---

## 9. 与音视频通话文档的关系

| 主题 | 看哪里 |
|---|---|
| REST 接口 `POST /voicecall/sessions` 完整字段 | [voice-video-call.md §2.1](./voice-video-call.md#21-发起通话前分配-relay-节点) |
| relay Hub 鉴权(JWT via query string) | [voice-video-call.md §2.3](./voice-video-call.md#23-token-要求) |
| `StartCall` / `AnswerCall` / `Hangup` 方法签名 | [voice-video-call.md §4](./voice-video-call.md#4-relay-hub-方法连接-hubsvoicecall) |
| `voicecall.incoming` 事件 payload | [voice-video-call.md §5.1](./voice-video-call.md#51-常驻连接wsclient上的来电事件) |
| 状态机 / `state` / `hangupCause` | [voice-video-call.md §9](./voice-video-call.md#9-管理后台联动) |
| 节点亲和与重连规则 | [voice-video-call.md §8](./voice-video-call.md#8-节点亲和与客户端接入约束) |
| 录音契约 | [voice-video-call.md §10](./voice-video-call.md#10-录制说明) |

字段值域速查:[voice-video-call-reference.md](./voice-video-call-reference.md) 与 [field-enum-reference.md](./field-enum-reference.md)。
