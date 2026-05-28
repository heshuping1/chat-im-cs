import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/features/call/presentation/providers/call_provider.dart';

/// 来电通知浮层 — 叠加在应用顶部
/// 监听 callProvider 的 incoming 状态，显示来电通知
class IncomingCallOverlay extends ConsumerStatefulWidget {
  final GoRouter router;

  const IncomingCallOverlay({super.key, required this.router});

  @override
  ConsumerState<IncomingCallOverlay> createState() =>
      _IncomingCallOverlayState();
}

class _IncomingCallOverlayState extends ConsumerState<IncomingCallOverlay> {
  @override
  void initState() {
    super.initState();
    widget.router.routeInformationProvider.addListener(_handleRouteChanged);
  }

  @override
  void didUpdateWidget(covariant IncomingCallOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.router == widget.router) return;
    oldWidget.router.routeInformationProvider.removeListener(
      _handleRouteChanged,
    );
    widget.router.routeInformationProvider.addListener(_handleRouteChanged);
  }

  @override
  void dispose() {
    widget.router.routeInformationProvider.removeListener(_handleRouteChanged);
    super.dispose();
  }

  void _handleRouteChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final callState = ref.watch(callProvider);

    if (callState.status != CallStatus.incoming) {
      return const SizedBox.shrink();
    }
    if (_isCurrentCallPage(callState.callId)) {
      return const SizedBox.shrink();
    }

    final isVideo = callState.isVideo;
    final peerName = callState.peerName ?? '未知';
    final notifier = ref.read(callProvider.notifier);

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Material(
          elevation: 8,
          borderRadius:
              const BorderRadius.vertical(bottom: Radius.circular(16)),
          color: const Color(0xFF1A1A2E),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => _openCallPage(callState),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  // Avatar
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00B27A).withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        peerName.isNotEmpty ? peerName[0].toUpperCase() : '?',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF00B27A),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Name + type
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          peerName,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.surface,
                          ),
                        ),
                        Text(
                          isVideo ? '视频通话邀请' : '语音通话邀请',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.white60),
                        ),
                      ],
                    ),
                  ),
                  // Action buttons
                  if (isVideo) ...[
                    _OverlayButton(
                      icon: Icons.call_end,
                      label: '拒绝',
                      color: const Color(0xFFFF3B30),
                      onTap: () => unawaited(notifier.rejectCall()),
                    ),
                    const SizedBox(width: 8),
                    _OverlayButton(
                      icon: Icons.mic,
                      label: '语音接听',
                      color: const Color(0xFF4A90E2),
                      onTap: () => unawaited(_answerAndOpenCall(
                        context,
                        ref,
                        callState,
                        peerName,
                        withVideo: false,
                      )),
                    ),
                    const SizedBox(width: 8),
                    _OverlayButton(
                      icon: Icons.videocam,
                      label: '视频接听',
                      color: const Color(0xFF00B27A),
                      onTap: () => unawaited(_answerAndOpenCall(
                        context,
                        ref,
                        callState,
                        peerName,
                        withVideo: true,
                      )),
                    ),
                  ] else ...[
                    _OverlayButton(
                      icon: Icons.call_end,
                      label: '拒绝',
                      color: const Color(0xFFFF3B30),
                      onTap: () => unawaited(notifier.rejectCall()),
                    ),
                    const SizedBox(width: 8),
                    _OverlayButton(
                      icon: Icons.call,
                      label: '接听',
                      color: const Color(0xFF00B27A),
                      onTap: () => unawaited(_answerAndOpenCall(
                        context,
                        ref,
                        callState,
                        peerName,
                        withVideo: false,
                      )),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _answerAndOpenCall(
    BuildContext context,
    WidgetRef ref,
    CallState callState,
    String peerName, {
    required bool withVideo,
  }) async {
    _openCallPage(callState.copyWith(isVideo: withVideo));
    await ref.read(callProvider.notifier).answerCall(withVideo: withVideo);
  }

  void _openCallPage(CallState callState) {
    final callId = callState.callId;
    if (callId == null || callId.isEmpty) return;
    final callPath = '/call/$callId';
    if (_currentPath == callPath) return;
    widget.router.push(
      '/call/$callId',
      extra: {
        'isVideo': callState.isVideo,
        'title': callState.peerName ?? '未知',
        'targetUserId': callState.peerUserId ?? '',
        'avatarUrl': callState.peerAvatarUrl,
        'callLogChatId': callState.callLogChatId,
      },
    );
  }

  String get _currentPath =>
      widget.router.routeInformationProvider.value.uri.path;

  bool _isCurrentCallPage(String? callId) {
    if (callId == null || callId.isEmpty) return false;
    return _currentPath == '/call/$callId';
  }
}

class _OverlayButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _OverlayButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          child: Icon(
            icon,
            color: Theme.of(context).colorScheme.surface,
            size: 20,
          ),
        ),
      ),
    );
  }
}

class ActiveCallMiniOverlay extends ConsumerStatefulWidget {
  final GoRouter router;

  const ActiveCallMiniOverlay({super.key, required this.router});

  @override
  ConsumerState<ActiveCallMiniOverlay> createState() =>
      _ActiveCallMiniOverlayState();
}

class _ActiveCallMiniOverlayState extends ConsumerState<ActiveCallMiniOverlay> {
  Offset _position = const Offset(16, 120);

  @override
  Widget build(BuildContext context) {
    final callState = ref.watch(callProvider);
    final callId = callState.callId;
    if (!callState.isMinimized || callId == null || callId.isEmpty) {
      return const SizedBox.shrink();
    }
    if (widget.router.routeInformationProvider.value.uri.path ==
        '/call/$callId') {
      return const SizedBox.shrink();
    }

    final screenSize = MediaQuery.of(context).size;
    final peerName = callState.peerName ?? '通话中';
    final duration = _formatDuration(callState.duration);

    return Positioned(
      left: _position.dx,
      top: _position.dy,
      child: SafeArea(
        child: GestureDetector(
          onPanUpdate: (details) {
            setState(() {
              _position = Offset(
                (_position.dx + details.delta.dx)
                    .clamp(0, screenSize.width - 148),
                (_position.dy + details.delta.dy)
                    .clamp(0, screenSize.height - 96),
              );
            });
          },
          onTap: () => _restore(callState),
          child: Material(
            elevation: 10,
            borderRadius: BorderRadius.circular(14),
            color: const Color(0xFF1C1C1C),
            child: SizedBox(
              width: 148,
              height: 72,
              child: Row(
                children: [
                  const SizedBox(width: 10),
                  CircleAvatar(
                    radius: 19,
                    backgroundColor:
                        const Color(0xFF00B27A).withValues(alpha: 0.22),
                    child: Icon(
                      callState.isVideo ? Icons.videocam : Icons.call,
                      color: const Color(0xFF00B27A),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          peerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          duration,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: () =>
                        unawaited(ref.read(callProvider.notifier).hangup()),
                    icon: const Icon(Icons.call_end,
                        color: Color(0xFFFF3B30), size: 20),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _restore(CallState callState) {
    final callId = callState.callId;
    if (callId == null || callId.isEmpty) return;
    ref.read(callProvider.notifier).restore();
    widget.router.push('/call/$callId', extra: {
      'isVideo': callState.isVideo,
      'title': callState.peerName ?? '未知',
      'targetUserId': callState.peerUserId ?? '',
      'avatarUrl': callState.peerAvatarUrl,
      'callLogChatId': callState.callLogChatId,
    });
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}
