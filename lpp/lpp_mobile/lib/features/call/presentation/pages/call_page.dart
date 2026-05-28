import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/call/domain/entities/call_entities.dart';
import 'package:lpp_mobile/features/call/domain/services/webrtc_service.dart';
import 'package:lpp_mobile/features/call/presentation/providers/call_provider.dart';

// ---------------------------------------------------------------------------
// 颜色常量
// ---------------------------------------------------------------------------

const _bgDark = Color(0xFF1C1C1C);
const _bgGradientTop = Color(0xFF2A2A2A);
const _btnWhite = Color(0xFFFFFFFF);
const _btnRed = Color(0xFFFF3B30);
const _btnDark = Color(0xFF3A3A3A);
const _textWhite = Colors.white;
const _textGray = Color(0xFF8E8E93);

// ---------------------------------------------------------------------------
// CallPage
// ---------------------------------------------------------------------------

class CallPage extends ConsumerStatefulWidget {
  final String callId;

  const CallPage({super.key, required this.callId});

  @override
  ConsumerState<CallPage> createState() => _CallPageState();
}

class _CallPageState extends ConsumerState<CallPage> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    ref.listenManual(callProvider, (prev, next) {
      if (next.isMinimized && mounted) {
        if (context.canPop()) context.pop();
        return;
      }
      if (next.status == CallStatus.ended && mounted) {
        Future.delayed(const Duration(seconds: 2), () {
          if (!mounted) return;
          if (context.canPop()) context.pop();
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            ref.read(callProvider.notifier).reset();
          });
        });
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final extra = GoRouterState.of(context).extra as Map<String, dynamic>?;
      final isVideo = extra?['isVideo'] as bool? ?? false;
      final title = extra?['title'] as String? ?? '';
      final targetUserId = extra?['targetUserId'] as String? ?? widget.callId;
      final avatarUrl = extra?['avatarUrl'] as String?;
      final callLogChatId = extra?['callLogChatId'] as String?;
      final incomingPush = extra?['incomingPush'] as bool? ?? false;

      if (incomingPush) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          final currentStatus = ref.read(callProvider).status;
          if (currentStatus != CallStatus.idle &&
              currentStatus != CallStatus.ended) {
            return;
          }
          ref.read(callProvider.notifier).receiveIncomingCall(
                callId: widget.callId,
                callerUserId: targetUserId,
                callerDisplayName: title,
                relayUrl: extra?['relayUrl'] as String? ?? '',
                mediaMode: extra?['mediaMode'] as String? ??
                    ((extra?['isVideo'] as bool? ?? false)
                        ? 'audioVideo'
                        : 'audio'),
              );
        });
        return;
      }

      final currentStatus = ref.read(callProvider).status;
      if (currentStatus == CallStatus.idle ||
          currentStatus == CallStatus.ended) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          final notifier = ref.read(callProvider.notifier);
          final latestStatus = ref.read(callProvider).status;
          if (latestStatus == CallStatus.ended) {
            notifier.reset();
          }
          if (latestStatus != CallStatus.idle &&
              latestStatus != CallStatus.ended) {
            return;
          }
          notifier.startCall(
            targetUserId: targetUserId,
            targetName: title,
            isVideo: isVideo,
            peerAvatarUrl: avatarUrl,
            callLogChatId: callLogChatId,
          );
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final callState = ref.watch(callProvider);

    // 最小化时显示悬浮小窗，不显示全屏通话页
    if (callState.isMinimized) {
      return const _FloatingCallWindow();
    }

    return Scaffold(
      backgroundColor: _bgDark,
      body: switch (callState.status) {
        CallStatus.incoming => _IncomingCallView(callState: callState),
        CallStatus.calling || CallStatus.ringing => callState.isVideo
            ? _VideoCallView(callState: callState)
            : _CallingView(callState: callState),
        CallStatus.connected => callState.isVideo
            ? _VideoCallView(callState: callState)
            : _VoiceCallView(callState: callState),
        CallStatus.ended => _EndedView(callState: callState),
        CallStatus.idle => const SizedBox.shrink(),
      },
    );
  }
}

// ---------------------------------------------------------------------------
// _CallingView — 等待对方接听（对照图片实现）
// ---------------------------------------------------------------------------

class _CallingView extends ConsumerStatefulWidget {
  final CallState callState;

  const _CallingView({required this.callState});

  @override
  ConsumerState<_CallingView> createState() => _CallingViewState();
}

class _CallingViewState extends ConsumerState<_CallingView>
    with SingleTickerProviderStateMixin {
  late AnimationController _dotController;
  int _dotCount = 1;

  @override
  void initState() {
    super.initState();
    _dotController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )
      ..addListener(() {
        final newCount = (_dotController.value * 3).floor() + 1;
        if (newCount != _dotCount) {
          setState(() => _dotCount = newCount.clamp(1, 3));
        }
      })
      ..repeat();
  }

  @override
  void dispose() {
    _dotController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(callProvider.notifier);
    final isRinging = widget.callState.status == CallStatus.ringing;
    final dots = '.' * _dotCount;
    final statusText = CallDisplay.outgoingStatus(
      isVideo: false,
      isRinging: isRinging,
      dots: dots,
    );

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [_bgGradientTop, _bgDark],
        ),
      ),
      child: SafeArea(
        child: Stack(
          children: [
            // 顶部左侧：画中画图标（点击最小化）
            Positioned(
              top: 16,
              left: 16,
              child: GestureDetector(
                onTap: () => ref.read(callProvider.notifier).minimize(),
                child: Icon(Icons.picture_in_picture_alt,
                    color: _textWhite.withValues(alpha: 0.7), size: 24),
              ),
            ),
            // 顶部右侧：加号
            Positioned(
              top: 16,
              right: 16,
              child: Icon(Icons.add,
                  color: _textWhite.withValues(alpha: 0.7), size: 28),
            ),
            // 主体内容
            Column(
              children: [
                const SizedBox(height: 80),
                // 对方头像（圆角矩形，与图片一致）
                _PeerAvatarRect(
                  name: widget.callState.peerName ?? '未知',
                  avatarUrl: widget.callState.peerAvatarUrl,
                  size: 120,
                ),
                const SizedBox(height: 20),
                // 对方名称
                Text(
                  widget.callState.peerName ?? '未知',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w500,
                    color: _textWhite,
                  ),
                ),
                const SizedBox(height: 6),
                // 副标题（个性签名占位）
                Text(
                  '看他的近况',
                  style: TextStyle(
                    fontSize: 14,
                    color: _textWhite.withValues(alpha: 0.5),
                  ),
                ),
                const Spacer(),
                // 动态状态文字
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 14,
                    color: _textWhite.withValues(alpha: 0.45),
                  ),
                ),
                const SizedBox(height: 48),
                // 底部三按钮
                _VoiceControlRow(
                  isMuted: widget.callState.isMuted,
                  isSpeakerOn: widget.callState.isSpeakerOn,
                  onMute: notifier.toggleMute,
                  onHangup: notifier.cancelOutgoingCall,
                  onSpeaker: notifier.toggleSpeaker,
                  hangupLabel: '取消',
                ),
                const SizedBox(height: 40),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _VoiceCallView — 通话中（语音）
// ---------------------------------------------------------------------------

class _VoiceCallView extends ConsumerWidget {
  final CallState callState;

  const _VoiceCallView({required this.callState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(callProvider.notifier);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [_bgGradientTop, _bgDark],
        ),
      ),
      child: SafeArea(
        child: Stack(
          children: [
            // 顶部左侧：最小化按钮
            Positioned(
              top: 8,
              left: 16,
              child: GestureDetector(
                onTap: () => notifier.minimize(),
                child: Icon(Icons.keyboard_arrow_down,
                    color: _textWhite.withValues(alpha: 0.7), size: 28),
              ),
            ),
            Column(
              children: [
                const SizedBox(height: 80),
                _PeerAvatarRect(
                  name: callState.peerName ?? '未知',
                  avatarUrl: callState.peerAvatarUrl,
                  size: 120,
                ),
                const SizedBox(height: 20),
                Text(
                  callState.peerName ?? '未知',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w500,
                    color: _textWhite,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _formatDuration(callState.duration),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF07C160),
                  ),
                ),
                const Spacer(),
                _VoiceControlRow(
                  isMuted: callState.isMuted,
                  isSpeakerOn: callState.isSpeakerOn,
                  onMute: notifier.toggleMute,
                  onHangup: notifier.hangup,
                  onSpeaker: notifier.toggleSpeaker,
                  hangupLabel: '挂断',
                ),
                const SizedBox(height: 40),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _IncomingCallView — 来电
// ---------------------------------------------------------------------------

class _IncomingCallView extends ConsumerWidget {
  final CallState callState;

  const _IncomingCallView({required this.callState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(callProvider.notifier);
    final isVideo = callState.isVideo;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [_bgGradientTop, _bgDark],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 80),
            _PeerAvatarRect(
              name: callState.peerName ?? '未知',
              avatarUrl: callState.peerAvatarUrl,
              size: 120,
            ),
            const SizedBox(height: 20),
            Text(
              callState.peerName ?? '未知',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w500,
                color: _textWhite,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isVideo ? '视频通话邀请' : '语音通话邀请',
              style: TextStyle(
                fontSize: 14,
                color: _textWhite.withValues(alpha: 0.5),
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 40),
              child: isVideo
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _RoundButton(
                          icon: Icons.call_end,
                          label: '拒绝',
                          bgColor: _btnRed,
                          iconColor: _textWhite,
                          onTap: () => unawaited(notifier.rejectCall()),
                        ),
                        _RoundButton(
                          icon: Icons.mic,
                          label: '语音接听',
                          bgColor: const Color(0xFF4A90E2),
                          iconColor: _textWhite,
                          onTap: () =>
                              unawaited(notifier.answerCall(withVideo: false)),
                        ),
                        _RoundButton(
                          icon: Icons.videocam,
                          label: '视频接听',
                          bgColor: const Color(0xFF07C160),
                          iconColor: _textWhite,
                          onTap: () =>
                              unawaited(notifier.answerCall(withVideo: true)),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _RoundButton(
                          icon: Icons.call_end,
                          label: '拒绝',
                          bgColor: _btnRed,
                          iconColor: _textWhite,
                          onTap: () => unawaited(notifier.rejectCall()),
                        ),
                        _RoundButton(
                          icon: Icons.call,
                          label: '接听',
                          bgColor: const Color(0xFF07C160),
                          iconColor: _textWhite,
                          onTap: () =>
                              unawaited(notifier.answerCall(withVideo: false)),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _VideoCallView — 视频通话中（对照图片实现）
// ---------------------------------------------------------------------------

class _VideoCallView extends ConsumerWidget {
  final CallState callState;

  const _VideoCallView({required this.callState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(callProvider.notifier);
    final webrtc = ref.watch(webRtcServiceProvider);
    final isWaiting = callState.status == CallStatus.calling ||
        callState.status == CallStatus.ringing;
    final showRemoteVideo = callState.status == CallStatus.connected;
    final statusText = isWaiting
        ? CallDisplay.outgoingStatus(
            isVideo: true,
            isRinging: callState.status == CallStatus.ringing,
          )
        : _formatDuration(callState.duration);

    return Stack(
      fit: StackFit.expand,
      children: [
        // ── 背景：本地摄像头全屏（等待连接时）或远端视频全屏（已连接）──────────
        Positioned.fill(
          child: _VideoStage(
            webrtc: webrtc,
            showRemoteVideo: showRemoteVideo,
            isCameraOff: callState.isCameraOff,
          ),
        ),

        // ── 已连接时：本地小窗口（右上角）────────────────────────────────────
        if (showRemoteVideo)
          Positioned(
            top: 80,
            right: 16,
            child: _LocalVideoWindow(
              renderer: webrtc.localRenderer,
              isCameraOff: callState.isCameraOff,
            ),
          ),

        // ── 顶部操作栏 ────────────────────────────────────────────────────────
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => ref.read(callProvider.notifier).minimize(),
                    child: Icon(Icons.picture_in_picture_alt,
                        color: _textWhite.withValues(alpha: 0.7), size: 24),
                  ),
                  Icon(Icons.add,
                      color: _textWhite.withValues(alpha: 0.7), size: 28),
                ],
              ),
            ),
          ),
        ),

        // ── 对方信息浮层（居中偏上）──────────────────────────────────────────
        Positioned(
          top: 100,
          left: 0,
          right: 0,
          child: _PeerInfoOverlay(
            callState: callState,
            statusText: statusText,
            showDots: isWaiting,
          ),
        ),

        // ── 底部控制区 ────────────────────────────────────────────────────────
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _VideoControlBar(
            callState: callState,
            onMute: notifier.toggleMute,
            onSpeaker: notifier.toggleSpeaker,
            onCamera: notifier.toggleCamera,
            onHangup: isWaiting ? notifier.cancelOutgoingCall : notifier.hangup,
            onSwitch: notifier.switchCamera,
          ),
        ),
      ],
    );
  }
}

class _VideoStage extends StatelessWidget {
  final WebRtcService webrtc;
  final bool showRemoteVideo;
  final bool isCameraOff;

  const _VideoStage({
    required this.webrtc,
    required this.showRemoteVideo,
    required this.isCameraOff,
  });

  @override
  Widget build(BuildContext context) {
    if (!webrtc.rendererInitialized) {
      return const _VideoPlaceholder(
        icon: Icons.videocam,
        text: '正在打开摄像头...',
      );
    }
    if (showRemoteVideo) {
      if (!webrtc.hasRemoteVideo) {
        return const _VideoPlaceholder(
          icon: Icons.person,
          text: '等待远端视频...',
        );
      }
      return RTCVideoView(
        webrtc.remoteRenderer,
        objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
      );
    }
    if (isCameraOff) {
      return const _VideoPlaceholder(
        icon: Icons.videocam_off,
        text: '摄像头已关闭',
      );
    }
    if (!webrtc.hasLocalVideo) {
      return const _VideoPlaceholder(
        icon: Icons.videocam,
        text: '正在打开摄像头...',
      );
    }
    return RTCVideoView(
      webrtc.localRenderer,
      mirror: true,
      objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
    );
  }
}

class _VideoPlaceholder extends StatelessWidget {
  final IconData icon;
  final String text;

  const _VideoPlaceholder({
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white38, size: 40),
            const SizedBox(height: 12),
            Text(
              text,
              style: const TextStyle(color: Colors.white54, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}

// ── 本地小窗口 ──────────────────────────────────────────────────────────────

class _LocalVideoWindow extends StatelessWidget {
  final RTCVideoRenderer renderer;
  final bool isCameraOff;

  const _LocalVideoWindow({
    required this.renderer,
    required this.isCameraOff,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      height: 124,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white24, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: isCameraOff
            ? const Center(
                child:
                    Icon(Icons.videocam_off, color: Colors.white38, size: 24),
              )
            : RTCVideoView(
                renderer,
                mirror: true,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              ),
      ),
    );
  }
}

// ── 对方信息浮层 ─────────────────────────────────────────────────────────────

class _PeerInfoOverlay extends StatelessWidget {
  final CallState callState;
  final String? statusText;
  final bool showDots;

  const _PeerInfoOverlay({
    required this.callState,
    this.statusText,
    this.showDots = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 头像
        _PeerAvatarRect(
          name: callState.peerName ?? '未知',
          avatarUrl: callState.peerAvatarUrl,
          size: 80,
        ),
        const SizedBox(height: 10),
        // 名字
        Text(
          callState.peerName ?? '未知',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w500,
            color: _textWhite,
            shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
          ),
        ),
        const SizedBox(height: 6),
        if (statusText != null) ...[
          Text(
            statusText!,
            style: TextStyle(
              fontSize: 14,
              color: _textWhite.withValues(alpha: 0.75),
              shadows: const [Shadow(color: Colors.black54, blurRadius: 4)],
            ),
          ),
          const SizedBox(height: 10),
        ],
        if (showDots)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              3,
              (i) => Container(
                width: 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color:
                      i == 0 ? _textWhite : _textWhite.withValues(alpha: 0.35),
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ── 视频通话底部控制栏 ────────────────────────────────────────────────────────

class _VideoControlBar extends StatelessWidget {
  final CallState callState;
  final VoidCallback onMute;
  final VoidCallback onSpeaker;
  final VoidCallback onCamera;
  final VoidCallback onHangup;
  final VoidCallback onSwitch;

  const _VideoControlBar({
    required this.callState,
    required this.onMute,
    required this.onSpeaker,
    required this.onCamera,
    required this.onHangup,
    required this.onSwitch,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            Colors.black.withValues(alpha: 0.55),
          ],
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(32, 16, 32, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 上排：麦克风、扬声器、摄像头（三个大白按钮）
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _VideoCtrlBtn(
                    icon: callState.isMuted ? Icons.mic_off : Icons.mic,
                    label: callState.isMuted ? '麦克风已关' : '麦克风已开',
                    onTap: onMute,
                  ),
                  _VideoCtrlBtn(
                    icon: callState.isSpeakerOn
                        ? Icons.volume_up
                        : Icons.volume_off,
                    label: callState.isSpeakerOn ? '扬声器已开' : '扬声器已关',
                    onTap: onSpeaker,
                  ),
                  _VideoCtrlBtn(
                    icon: callState.isCameraOff
                        ? Icons.videocam_off
                        : Icons.videocam,
                    label: callState.isCameraOff ? '摄像头已关' : '摄像头已开',
                    onTap: onCamera,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // 下排：翻转摄像头（左）、挂断（中）、占位（右）
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // 翻转摄像头（小圆形深色）
                  _SmallCtrlBtn(
                    icon: Icons.flip_camera_ios,
                    onTap: onSwitch,
                    enabled: !callState.isCameraOff,
                  ),
                  // 挂断（红色大按钮）
                  GestureDetector(
                    onTap: onHangup,
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                        color: _btnRed,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.call_end,
                          color: _textWhite, size: 30),
                    ),
                  ),
                  // 右侧占位（保持对称）
                  const SizedBox(width: 44, height: 44),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── 视频控制大按钮（白色圆形）────────────────────────────────────────────────

class _VideoCtrlBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _VideoCtrlBtn({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: _btnWhite,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.black, size: 28),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: _textGray),
          ),
        ],
      ),
    );
  }
}

// ── 小圆形控制按钮（翻转摄像头等）──────────────────────────────────────────

class _SmallCtrlBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool enabled;

  const _SmallCtrlBtn({
    required this.icon,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.35,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color:
                Theme.of(context).colorScheme.surface.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: _textWhite, size: 22),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _EndedView
// ---------------------------------------------------------------------------

class _EndedView extends StatelessWidget {
  final CallState callState;

  const _EndedView({required this.callState});

  @override
  Widget build(BuildContext context) {
    final display = CallDisplay.ended(
      isVideo: callState.isVideo,
      isCaller: callState.isCaller,
      durationSeconds: callState.duration.inSeconds,
      endReason: callState.endReason,
    );
    final errorText = _errorText(callState.endReason);
    return Container(
      color: _bgDark,
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _PeerAvatarRect(
                name: callState.peerName ?? '未知',
                avatarUrl: callState.peerAvatarUrl,
                size: 80,
              ),
              const SizedBox(height: 16),
              Text(
                display.title,
                style: const TextStyle(fontSize: 18, color: _textWhite),
              ),
              const SizedBox(height: 8),
              Text(
                display.status,
                style: const TextStyle(fontSize: 14, color: _textGray),
              ),
              if (display.detail != null) ...[
                const SizedBox(height: 6),
                Text(
                  display.detail!,
                  style: const TextStyle(fontSize: 14, color: _textGray),
                ),
              ],
              if (errorText != null) ...[
                const SizedBox(height: 8),
                Text(
                  errorText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: Colors.red),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String? _errorText(String? reason) {
    if (reason == null) return null;
    if (reason.contains('WebRTC connection is not initialized') ||
        reason.contains('getUserMedia') ||
        reason.contains('Permission')) {
      return callState.isVideo
          ? '视频通话无法建立，请检查摄像头或麦克风权限后重试'
          : '语音通话无法建立，请检查麦克风权限后重试';
    }
    if (reason.contains('Incoming call is missing relayUrl')) {
      return '来电信息不完整，无法接听';
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// _VoiceControlRow — 底部三按钮（麦克风 / 取消|挂断 / 扬声器）
// ---------------------------------------------------------------------------

class _VoiceControlRow extends StatelessWidget {
  final bool isMuted;
  final bool isSpeakerOn;
  final VoidCallback onMute;
  final VoidCallback onHangup;
  final VoidCallback onSpeaker;
  final String hangupLabel;

  const _VoiceControlRow({
    required this.isMuted,
    required this.isSpeakerOn,
    required this.onMute,
    required this.onHangup,
    required this.onSpeaker,
    required this.hangupLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 麦克风
          _RoundButton(
            icon: isMuted ? Icons.mic_off : Icons.mic,
            label: isMuted ? '麦克风已关' : '麦克风已开',
            bgColor: _btnWhite,
            iconColor: Colors.black,
            onTap: onMute,
          ),
          // 取消 / 挂断（红色）
          _RoundButton(
            icon: Icons.call_end,
            label: hangupLabel,
            bgColor: _btnRed,
            iconColor: _textWhite,
            onTap: onHangup,
          ),
          // 扬声器
          _RoundButton(
            icon: isSpeakerOn ? Icons.volume_up : Icons.volume_off,
            label: isSpeakerOn ? '扬声器已开' : '扬声器已关',
            bgColor: _btnDark,
            iconColor: _textWhite,
            onTap: onSpeaker,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _PeerAvatarRect — 圆角矩形头像（对照图片）
// ---------------------------------------------------------------------------

class _PeerAvatarRect extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final double size;

  const _PeerAvatarRect({
    required this.name,
    required this.size,
    this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: _btnDark,
        borderRadius: BorderRadius.circular(size * 0.18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.18),
        child: avatarUrl != null && avatarUrl!.isNotEmpty
            ? AuthNetworkImage(
                url: avatarUrl!,
                width: size,
                height: size,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) =>
                    _AvatarFallback(name: name, size: size),
              )
            : _AvatarFallback(name: name, size: size),
      ),
    );
  }
}

class _AvatarFallback extends StatelessWidget {
  final String name;
  final double size;

  const _AvatarFallback({required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF3A3A3A),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0] : '?',
          style: TextStyle(
            fontSize: size * 0.38,
            fontWeight: FontWeight.w500,
            color: _textWhite,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _RoundButton — 通用圆形按钮
// ---------------------------------------------------------------------------

class _RoundButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgColor;
  final Color iconColor;
  final VoidCallback onTap;

  const _RoundButton({
    required this.icon,
    required this.label,
    required this.bgColor,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: _textGray),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

String _formatDuration(Duration d) {
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (d.inHours > 0) {
    return '${d.inHours}:$minutes:$seconds';
  }
  return '$minutes:$seconds';
}

// ---------------------------------------------------------------------------
// _FloatingCallWindow — 悬浮小窗（通话最小化后显示）
// 可拖动，点击恢复全屏，显示通话时长和挂断按钮
// ---------------------------------------------------------------------------

class _FloatingCallWindow extends ConsumerStatefulWidget {
  const _FloatingCallWindow();

  @override
  ConsumerState<_FloatingCallWindow> createState() =>
      _FloatingCallWindowState();
}

class _FloatingCallWindowState extends ConsumerState<_FloatingCallWindow> {
  Offset _position = const Offset(16, 120);

  @override
  Widget build(BuildContext context) {
    final callState = ref.watch(callProvider);
    final notifier = ref.read(callProvider.notifier);
    final screenSize = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Positioned(
            left: _position.dx,
            top: _position.dy,
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() {
                  _position = Offset(
                    (_position.dx + details.delta.dx)
                        .clamp(0, screenSize.width - 120),
                    (_position.dy + details.delta.dy)
                        .clamp(0, screenSize.height - 80),
                  );
                });
              },
              onTap: notifier.restore,
              child: Container(
                width: 120,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF1C1C1C),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 10),
                    // 头像
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3A3A3A),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Center(
                        child: Text(
                          (callState.peerName ?? '?').isNotEmpty
                              ? (callState.peerName ?? '?')[0]
                              : '?',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.surface,
                              fontSize: 16,
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // 时长
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            callState.peerName ?? '通话中',
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.surface,
                                fontSize: 11,
                                fontWeight: FontWeight.w500),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            callState.status == CallStatus.connected
                                ? _formatDuration(callState.duration)
                                : '呼叫中...',
                            style: const TextStyle(
                                color: Color(0xFF07C160), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    // 挂断按钮
                    GestureDetector(
                      onTap: notifier.hangup,
                      child: Container(
                        width: 28,
                        height: 28,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: const BoxDecoration(
                          color: Color(0xFFFF3B30),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.call_end,
                            color: Theme.of(context).colorScheme.surface,
                            size: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
