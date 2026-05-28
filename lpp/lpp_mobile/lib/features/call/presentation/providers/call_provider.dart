import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/call/data/datasources/call_datasources.dart';
import 'package:lpp_mobile/features/call/data/datasources/call_service.dart';
import 'package:lpp_mobile/features/call/data/repositories/call_repositories.dart';
import 'package:lpp_mobile/features/call/domain/repositories/call_repositories.dart';
import 'package:lpp_mobile/features/call/domain/services/webrtc_service.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';

// ---------------------------------------------------------------------------
// Call status
// ---------------------------------------------------------------------------

enum CallStatus { idle, calling, ringing, incoming, connected, ended }

bool _isVideoMediaMode(String mediaMode) {
  final normalized = mediaMode.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
  return normalized == 'audiovideo' || normalized == 'video';
}

enum _CallTone { incoming, outgoing }

// ---------------------------------------------------------------------------
// Call state
// ---------------------------------------------------------------------------

class CallState {
  final CallStatus status;
  final String? callId;
  final String? peerUserId;
  final String? peerName;
  final String? peerAvatarUrl;
  final String? relayUrl;
  final String? callLogChatId;
  final bool isVideo;
  final bool isMuted;
  final bool isCameraOff;
  final bool isSpeakerOn;
  final bool isCaller;
  final Duration duration;
  final String? endReason;

  /// 通话已最小化为悬浮小窗
  final bool isMinimized;

  const CallState({
    this.status = CallStatus.idle,
    this.callId,
    this.peerUserId,
    this.peerName,
    this.peerAvatarUrl,
    this.relayUrl,
    this.callLogChatId,
    this.isVideo = false,
    this.isMuted = false,
    this.isCameraOff = false,
    this.isSpeakerOn = false,
    this.isCaller = false,
    this.duration = Duration.zero,
    this.endReason,
    this.isMinimized = false,
  });

  CallState copyWith({
    CallStatus? status,
    String? callId,
    String? peerUserId,
    String? peerName,
    String? peerAvatarUrl,
    String? relayUrl,
    String? callLogChatId,
    bool? isVideo,
    bool? isMuted,
    bool? isCameraOff,
    bool? isSpeakerOn,
    bool? isCaller,
    Duration? duration,
    String? endReason,
    bool? isMinimized,
  }) {
    return CallState(
      status: status ?? this.status,
      callId: callId ?? this.callId,
      peerUserId: peerUserId ?? this.peerUserId,
      peerName: peerName ?? this.peerName,
      peerAvatarUrl: peerAvatarUrl ?? this.peerAvatarUrl,
      relayUrl: relayUrl ?? this.relayUrl,
      callLogChatId: callLogChatId ?? this.callLogChatId,
      isVideo: isVideo ?? this.isVideo,
      isMuted: isMuted ?? this.isMuted,
      isCameraOff: isCameraOff ?? this.isCameraOff,
      isSpeakerOn: isSpeakerOn ?? this.isSpeakerOn,
      isCaller: isCaller ?? this.isCaller,
      duration: duration ?? this.duration,
      endReason: endReason ?? this.endReason,
      isMinimized: isMinimized ?? this.isMinimized,
    );
  }
}

// ---------------------------------------------------------------------------
// CallService provider
// ---------------------------------------------------------------------------

final callServiceProvider = Provider<CallService>((ref) {
  final service = CallService(
    baseUrl: HttpClient.baseUrl,
    accessTokenFactory: () async {
      return ref.read(currentSpaceProvider)?.accessToken ??
          GlobalTokenHolder.instance.accessToken ??
          '';
    },
  );
  ref.onDispose(service.dispose);
  return service;
});

final callRepositoryProvider = Provider<CallRepository>((ref) {
  return CallRepositoryImpl(
    CallRemoteDataSourceImpl(ref.watch(dioProvider)),
  );
});

// ---------------------------------------------------------------------------
// CallNotifier
// ---------------------------------------------------------------------------

class CallNotifier extends StateNotifier<CallState> {
  static const Duration _outgoingAnswerTimeout = Duration(seconds: 45);
  static const Duration _incomingAnswerTimeout = Duration(seconds: 45);
  static const Duration _connectionLostGrace = Duration(seconds: 15);

  final Ref _ref;
  Timer? _durationTimer;
  Timer? _outgoingTimeoutTimer;
  Timer? _incomingTimeoutTimer;
  Timer? _connectionLostGraceTimer;
  Timer? _ringtoneTimer;
  StreamSubscription<CallEvent>? _eventSub;
  StreamSubscription<RTCIceConnectionState>? _iceConnectionSub;
  _CallTone? _activeTone;
  int _operationId = 0;
  final Set<String> _sentCallLogIds = <String>{};
  final Set<String> _seenIncomingCallIds = <String>{};

  CallNotifier(this._ref) : super(const CallState()) {
    _subscribeToEvents();
    _subscribeToWebRtcEvents();
    _ref.listen<SpaceContext?>(currentSpaceProvider, (previous, next) {
      if (previous?.accessToken == next?.accessToken) return;
      unawaited(
        _handleSpaceChanged(resetState: previous != null).then((_) {
          if (next != null) _prepareForGatewayIncomingCalls();
        }),
      );
    }, fireImmediately: true);
  }

  CallService get _service => _ref.read(callServiceProvider);
  WebRtcService get _webrtc => _ref.read(webRtcServiceProvider);
  CallRepository get _callRepo => _ref.read(callRepositoryProvider);

  bool _isCurrentOperation(int operationId) => operationId == _operationId;

  bool _canShowIncomingCall(String callId) {
    if (callId.isEmpty || _seenIncomingCallIds.contains(callId)) {
      return false;
    }
    if (state.status != CallStatus.idle && state.status != CallStatus.ended) {
      return false;
    }
    _seenIncomingCallIds.add(callId);
    return true;
  }

  Future<bool> _abortIfStaleOperation(
    int operationId,
    WebRtcService webrtc,
  ) async {
    if (_isCurrentOperation(operationId)) return false;
    if (state.status == CallStatus.ended || state.status == CallStatus.idle) {
      await webrtc.reset();
    }
    return true;
  }

  Future<bool> _setSpeakerphone(bool speakerOn) async {
    try {
      await Helper.setSpeakerphoneOn(speakerOn);
      return true;
    } catch (e) {
      debugPrint('[CallNotifier] setSpeakerphoneOn($speakerOn) failed: $e');
      return false;
    }
  }

  Future<void> _applyLocalControlState(WebRtcService webrtc) async {
    if (!webrtc.setAudioEnabled(!state.isMuted)) {
      debugPrint('[CallNotifier] audio track is not ready for mute state');
    }
    if (state.isVideo && !webrtc.setVideoEnabled(!state.isCameraOff)) {
      debugPrint('[CallNotifier] video track is not ready for camera state');
    }
    final speakerApplied = await _setSpeakerphone(state.isSpeakerOn);
    if (!speakerApplied && state.isSpeakerOn) {
      state = state.copyWith(isSpeakerOn: false);
    }
  }

  void _resetLocalControls() {
    unawaited(_setSpeakerphone(false));
  }

  void _subscribeToEvents() {
    _eventSub = _service.events.listen(_handleEvent);
  }

  void _subscribeToWebRtcEvents() {
    _iceConnectionSub =
        _webrtc.onIceConnectionState.listen(_handleIceConnectionState);
  }

  void _prepareForGatewayIncomingCalls() {
    // voicecall.incoming arrives on the always-on chat Gateway. The relay hub
    // must only be connected with the per-call relayUrl from /voicecall/sessions
    // or the incoming envelope, otherwise a load balancer can attach us to the
    // wrong media relay node.
  }

  Future<void> _disconnectVoiceHub() async {
    await _service.disconnect();
  }

  Future<void> _disconnectAndRestoreDefaultVoiceHub() async {
    await _disconnectVoiceHub();
    _prepareForGatewayIncomingCalls();
  }

  Future<void> _handleSpaceChanged({required bool resetState}) async {
    if (resetState) {
      _operationId++;
      _seenIncomingCallIds.clear();
      _stopConnectionLostGrace();
      _stopTimer();
      _stopOutgoingTimeout();
      _stopIncomingTimeout();
      _stopRingtone();
      await _webrtc.reset();
      _resetLocalControls();
      if (state.status != CallStatus.idle) {
        state = const CallState();
      }
      await _service.disconnect();
    }
  }

  void _handleEvent(CallEvent event) {
    switch (event) {
      case IncomingCallEvent():
        if (!_canShowIncomingCall(event.callId)) return;
        final operationId = ++_operationId;
        state = CallState(
          status: CallStatus.incoming,
          callId: event.callId,
          peerUserId: event.callerUserId,
          peerName: event.callerDisplayName,
          relayUrl: event.relayUrl,
          isVideo: event.isVideo,
          isCaller: false,
        );
        _startIncomingRingtone();
        _startIncomingSessionWatch(
          operationId: operationId,
          callId: event.callId,
          relayUrl: event.relayUrl,
        );
      case CallRingingEvent():
        if (state.callId == event.callId) {
          state = state.copyWith(status: CallStatus.ringing);
          if (state.isCaller) {
            _startOutgoingRingback();
          }
        }
      case CallAnsweredEvent():
        if (state.callId == event.callId) {
          _stopConnectionLostGrace();
          _stopOutgoingTimeout();
          _stopIncomingTimeout();
          state = state.copyWith(status: CallStatus.connected);
          _stopRingtone(); // 对方接听，停止铃声
          _startTimer();
        }
      case CallEndedEvent():
        if (state.callId == event.callId) {
          if (_isConnectionLostReason(event.reason)) {
            final delayed = _startConnectionLostGrace(
              _operationId,
              reason: event.reason,
              source: 'relay',
            );
            if (delayed) return;
          }
          unawaited(_endCurrentCall(event.reason, notifyServer: false));
        }
      case DtmfReceivedEvent():
        // DTMF 收到，目前只记录日志，UI 层可按需监听
        debugPrint(
            '[CallNotifier] DTMF received: ${event.digits} for call ${event.callId}');
    }
  }

  void _handleIceConnectionState(RTCIceConnectionState iceState) {
    if (!mounted || !_isActiveCallStatus(state.status)) return;
    switch (iceState) {
      case RTCIceConnectionState.RTCIceConnectionStateConnected:
      case RTCIceConnectionState.RTCIceConnectionStateCompleted:
      case RTCIceConnectionState.RTCIceConnectionStateChecking:
        _stopConnectionLostGrace();
      case RTCIceConnectionState.RTCIceConnectionStateDisconnected:
        _startConnectionLostGrace(
          _operationId,
          reason: 'connection_lost',
          source: 'ice',
        );
      case RTCIceConnectionState.RTCIceConnectionStateFailed:
        unawaited(_endCurrentCall('connection_lost', notifyServer: true));
      case RTCIceConnectionState.RTCIceConnectionStateClosed:
      case RTCIceConnectionState.RTCIceConnectionStateNew:
      case RTCIceConnectionState.RTCIceConnectionStateCount:
        break;
    }
  }

  bool _isActiveCallStatus(CallStatus status) {
    return status == CallStatus.calling ||
        status == CallStatus.ringing ||
        status == CallStatus.connected;
  }

  bool _isConnectionLostReason(String reason) {
    final normalized = reason.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
    return normalized == 'connectionlost';
  }

  bool _startConnectionLostGrace(
    int operationId, {
    required String reason,
    required String source,
  }) {
    if (!_isCurrentOperation(operationId) ||
        state.callId == null ||
        !_isActiveCallStatus(state.status)) {
      return false;
    }
    if (_connectionLostGraceTimer?.isActive ?? false) return true;
    debugPrint(
      '[CallNotifier] $source reported $reason; waiting '
      '${_connectionLostGrace.inSeconds}s before ending call',
    );
    _connectionLostGraceTimer = Timer(_connectionLostGrace, () {
      if (!mounted || !_isCurrentOperation(operationId)) return;
      if (!_isActiveCallStatus(state.status)) return;
      unawaited(_endCurrentCall('connection_lost', notifyServer: true));
    });
    return true;
  }

  void _stopConnectionLostGrace() {
    _connectionLostGraceTimer?.cancel();
    _connectionLostGraceTimer = null;
  }

  Future<void> _endCurrentCall(
    String endReason, {
    required bool notifyServer,
  }) async {
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();

    final endedState = state.copyWith(
      status: CallStatus.ended,
      endReason: endReason,
    );
    state = endedState;

    final callId = endedState.callId;
    if (notifyServer && callId != null && callId.isNotEmpty) {
      try {
        await _service.hangup(callId, relayUrl: endedState.relayUrl);
      } catch (e) {
        debugPrint('[CallNotifier] end call hangup failed: $e');
      }
    }

    await _disconnectAndRestoreDefaultVoiceHub();
    await _webrtc.reset();
    _resetLocalControls();
    if (callId != null && callId.isNotEmpty) {
      unawaited(_sendCallLog(endedState, endReason));
    }
  }

  // ---------------------------------------------------------------------------
  // Ringtone
  // ---------------------------------------------------------------------------

  void _startIncomingRingtone() {
    _startTone(_CallTone.incoming);
  }

  void _startOutgoingRingback() {
    _startTone(_CallTone.outgoing);
  }

  void _startTone(_CallTone tone) {
    if (_activeTone == tone && (_ringtoneTimer?.isActive ?? false)) return;
    _stopRingtone();
    if (tone == _CallTone.incoming && !_shouldPlayIncomingTone()) return;
    _activeTone = tone;
    _playTone(tone);
    final interval = tone == _CallTone.incoming
        ? const Duration(milliseconds: 1800)
        : const Duration(milliseconds: 2600);
    _ringtoneTimer = Timer.periodic(interval, (_) => _playTone(tone));
  }

  void _playTone(_CallTone tone) {
    unawaited(SystemSound.play(
      tone == _CallTone.incoming
          ? SystemSoundType.alert
          : SystemSoundType.click,
    ).catchError((Object e) {
      debugPrint('[CallNotifier] ringtone error: $e');
    }));
    if (tone == _CallTone.incoming && _shouldVibrateForIncomingTone()) {
      unawaited(HapticFeedback.vibrate().catchError((Object e) {
        debugPrint('[CallNotifier] ringtone vibration error: $e');
      }));
    }
  }

  void _stopRingtone() {
    _ringtoneTimer?.cancel();
    _ringtoneTimer = null;
    _activeTone = null;
  }

  bool _shouldPlayIncomingTone() {
    final settings = _ref.read(notificationSettingsProvider).valueOrNull;
    if (settings == null) return true;
    if (settings.globalMute || !settings.soundEnabled) return false;
    return !_isInDoNotDisturbWindow(
      settings.dndStartTime,
      settings.dndEndTime,
    );
  }

  bool _shouldVibrateForIncomingTone() {
    final settings = _ref.read(notificationSettingsProvider).valueOrNull;
    if (settings == null) return true;
    if (settings.globalMute || !settings.vibrationEnabled) return false;
    return !_isInDoNotDisturbWindow(
      settings.dndStartTime,
      settings.dndEndTime,
    );
  }

  bool _isInDoNotDisturbWindow(String? start, String? end) {
    final startMinute = _parseClockMinute(start);
    final endMinute = _parseClockMinute(end);
    if (startMinute == null || endMinute == null || startMinute == endMinute) {
      return false;
    }
    final now = DateTime.now();
    final currentMinute = now.hour * 60 + now.minute;
    if (startMinute < endMinute) {
      return currentMinute >= startMinute && currentMinute < endMinute;
    }
    return currentMinute >= startMinute || currentMinute < endMinute;
  }

  int? _parseClockMinute(String? value) {
    if (value == null || value.isEmpty) return null;
    final parts = value.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  // ---------------------------------------------------------------------------
  // Incoming call watch
  // ---------------------------------------------------------------------------

  void _startIncomingSessionWatch({
    required int operationId,
    required String callId,
    required String relayUrl,
  }) {
    _startIncomingTimeout(operationId, callId);
    if (relayUrl.isEmpty) return;
    unawaited(_connectIncomingRelay(operationId, callId, relayUrl));
  }

  Future<void> _connectIncomingRelay(
    int operationId,
    String callId,
    String relayUrl,
  ) async {
    try {
      await _service.connect(relayUrl: relayUrl);
    } catch (e) {
      debugPrint('[CallNotifier] incoming relay connect failed: $e');
      return;
    }
    if (!mounted || !_isCurrentOperation(operationId)) return;
    if (state.status != CallStatus.incoming || state.callId != callId) return;
    debugPrint('[CallNotifier] incoming relay connected for call $callId');
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  void receiveIncomingCall({
    required String callId,
    required String callerUserId,
    required String callerDisplayName,
    required String relayUrl,
    required String mediaMode,
    String? callerVideoProfile,
  }) {
    if (!_canShowIncomingCall(callId)) return;
    final operationId = ++_operationId;
    state = CallState(
      status: CallStatus.incoming,
      callId: callId,
      peerUserId: callerUserId,
      peerName: callerDisplayName,
      relayUrl: relayUrl,
      isVideo: _isVideoMediaMode(mediaMode),
      isCaller: false,
    );
    _startIncomingRingtone();
    _startIncomingSessionWatch(
      operationId: operationId,
      callId: callId,
      relayUrl: relayUrl,
    );
  }

  /// 主叫发起通话：分配 relay → init WebRTC → createOffer → StartCall(callId)
  Future<void> startCall({
    required String targetUserId,
    required String targetName,
    required bool isVideo,
    String? peerAvatarUrl,
    String? callLogChatId,
  }) async {
    _stopConnectionLostGrace();
    final target = await _resolveCallableTarget(
      targetUserId: targetUserId,
      targetName: targetName,
      peerAvatarUrl: peerAvatarUrl,
    );
    state = CallState(
      status: CallStatus.calling,
      peerUserId: target.userId,
      peerName: target.name,
      peerAvatarUrl: target.avatarUrl,
      callLogChatId: callLogChatId,
      isVideo: isVideo,
      isSpeakerOn: isVideo,
      isCaller: true,
    );
    // 发起方点击拨打后立即播放等待音，接听/取消/超时/失败都会统一停止。
    _startOutgoingRingback();
    final operationId = ++_operationId;
    _startOutgoingTimeout(operationId);
    final webrtc = _webrtc;
    ({String callId, String relayUrl})? session;
    try {
      final videoProfile = isVideo ? '360p' : null;
      await _ensureDirectChat(target.userId);
      session = await _callRepo.createVoiceCallSession(
        targetUserId: target.userId,
        isVideo: isVideo,
        videoProfile: videoProfile,
      );
      if (!_isCurrentOperation(operationId)) {
        unawaited(_service
            .hangup(
              session.callId,
              relayUrl: session.relayUrl,
            )
            .catchError((_) {}));
        return;
      }
      await webrtc.init(
        isVideo: isVideo,
        speakerOn: state.isSpeakerOn,
      );
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      await _applyLocalControlState(webrtc);
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      state = state.copyWith();
      debugPrint('[CallNotifier] WebRTC initialized');
      final sdpOffer = await webrtc.createOffer();
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      debugPrint(
          '[CallNotifier] SDP offer created, hasAudio=${sdpOffer.contains("m=audio")}, hasVideo=${sdpOffer.contains("m=video")}');

      state = state.copyWith(
        callId: session.callId,
        relayUrl: session.relayUrl,
      );
      final result = await _service.startCall(
        session.callId,
        sdpOffer,
        relayUrl: session.relayUrl,
        videoProfile: videoProfile,
      );
      if (!_isCurrentOperation(operationId)) {
        final staleCallId = result.callId;
        if (staleCallId != null && staleCallId.isNotEmpty) {
          unawaited(_service
              .hangup(staleCallId, relayUrl: session.relayUrl)
              .catchError((_) {}));
        }
        await _abortIfStaleOperation(operationId, webrtc);
        return;
      }
      if (state.status == CallStatus.calling) {
        state = state.copyWith(status: CallStatus.ringing);
        _startOutgoingRingback();
      }
      debugPrint(
          '[CallNotifier] startCall success, callId=${result.callId}, hasSdpAnswer=${result.sdpAnswer?.isNotEmpty}');

      if (result.sdpAnswer != null && result.sdpAnswer!.isNotEmpty) {
        _stopRingtone();
        await webrtc.setRemoteDescription(result.sdpAnswer!);
        if (await _abortIfStaleOperation(operationId, webrtc)) return;
        debugPrint('[CallNotifier] remote description set');
      }
    } catch (e, st) {
      if (!_isCurrentOperation(operationId)) return;
      debugPrint('[CallNotifier] startCall error: $e\n$st');
      _stopOutgoingTimeout();
      _stopRingtone();
      final failedState = CallState(
        status: CallStatus.ended,
        callId: state.callId ?? session?.callId,
        peerUserId: target.userId,
        peerName: target.name,
        peerAvatarUrl: target.avatarUrl,
        relayUrl: session?.relayUrl ?? state.relayUrl,
        callLogChatId: callLogChatId,
        isVideo: isVideo,
        isCaller: true,
        endReason: 'failed',
      );
      await webrtc.reset();
      await _disconnectVoiceHub();
      _resetLocalControls();
      state = failedState;
      unawaited(_sendCallLog(failedState, 'failed'));
    }
  }

  Future<({String userId, String name, String? avatarUrl})>
      _resolveCallableTarget({
    required String targetUserId,
    required String targetName,
    String? peerAvatarUrl,
  }) async {
    // Calls must target the concrete chat peer. Rewriting a customer service
    // conversation to another assigned staff member makes Gateway and offline
    // push notify the wrong user.
    return (
      userId: targetUserId,
      name: targetName,
      avatarUrl: peerAvatarUrl,
    );
  }

  Future<void> _ensureDirectChat(String peerUserId) async {
    try {
      final currentUserId = _ref.read(currentSpaceProvider)?.userId;
      if (peerUserId.isEmpty || peerUserId == currentUserId) return;
      final dio = _ref.read(dioProvider);
      await dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats',
        data: {'peerUserId': peerUserId},
      );
    } catch (e) {
      debugPrint('[CallNotifier] ensure direct chat failed: $e');
    }
  }

  /// 被叫接听：init WebRTC → createOffer → answerCall → setRemoteDescription
  Future<void> answerCall({required bool withVideo}) async {
    _stopConnectionLostGrace();
    _stopIncomingTimeout();
    final callId = state.callId;
    final relayUrl = state.relayUrl;
    if (callId == null || relayUrl == null || relayUrl.isEmpty) {
      _stopRingtone();
      state = state.copyWith(
        status: CallStatus.ended,
        endReason: 'Incoming call is missing relayUrl',
      );
      return;
    }
    final operationId = ++_operationId;
    final webrtc = _webrtc;
    state = state.copyWith(isVideo: withVideo, isSpeakerOn: withVideo);
    _stopRingtone();
    try {
      await webrtc.init(
        isVideo: withVideo,
        speakerOn: state.isSpeakerOn,
      );
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      await _applyLocalControlState(webrtc);
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      state = state.copyWith();
      final sdpOffer = await webrtc.createOffer();
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      final videoProfile = withVideo ? '360p' : null;

      final result = await _service.answerCall(
        callId,
        sdpOffer,
        relayUrl: relayUrl,
        videoProfile: videoProfile,
      );
      if (await _abortIfStaleOperation(operationId, webrtc)) return;
      if (result.sdpAnswer != null && result.sdpAnswer!.isNotEmpty) {
        _stopRingtone();
        await webrtc.setRemoteDescription(result.sdpAnswer!);
        if (await _abortIfStaleOperation(operationId, webrtc)) return;
      }
      state = state.copyWith(
        status: CallStatus.connected,
        isVideo: withVideo,
      );
      _startTimer();
    } catch (e) {
      if (!_isCurrentOperation(operationId)) return;
      await webrtc.reset();
      await _disconnectVoiceHub();
      _resetLocalControls();
      final failedState = state.copyWith(
        status: CallStatus.ended,
        endReason: e.toString(),
      );
      state = failedState;
      unawaited(_sendCallLog(failedState, 'failed'));
    }
  }

  Future<void> rejectCall() async {
    _operationId++;
    _stopConnectionLostGrace();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();
    final callId = state.callId;
    final relayUrl = state.relayUrl;
    if (callId == null) return;
    final rejectedState =
        state.copyWith(status: CallStatus.ended, endReason: 'rejected');
    state = rejectedState;
    try {
      await _service.rejectCall(callId, relayUrl: relayUrl);
    } catch (e) {
      debugPrint('[CallNotifier] rejectCall failed: $e');
    } finally {
      try {
        await _disconnectAndRestoreDefaultVoiceHub();
      } catch (e) {
        debugPrint('[CallNotifier] restore voice hub after reject failed: $e');
      }
      await _webrtc.reset();
      _resetLocalControls();
      unawaited(_sendCallLog(rejectedState, 'rejected'));
      state = const CallState(status: CallStatus.idle);
    }
  }

  Future<void> hangup() async {
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone(); // 挂断，停止铃声
    final callId = state.callId;
    final endReason =
        state.status == CallStatus.connected ? 'hangup' : 'cancelled';
    final endedState =
        state.copyWith(status: CallStatus.ended, endReason: endReason);
    state = endedState;

    // callId 可能为 null（呼叫中尚未收到服务端响应），仍需清理本地状态
    if (callId != null) {
      try {
        await _service.hangup(callId, relayUrl: state.relayUrl);
      } catch (_) {}
    }
    await _disconnectAndRestoreDefaultVoiceHub();
    await _webrtc.reset();
    _resetLocalControls();
    if (callId != null) {
      await _sendCallLog(endedState, endReason);
    }
  }

  void cancelOutgoingCall() {
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();

    final callId = state.callId;
    const endReason = 'cancelled';
    final endedState =
        state.copyWith(status: CallStatus.ended, endReason: endReason);
    state = endedState;

    if (callId != null) {
      unawaited(_service
          .hangup(callId, relayUrl: state.relayUrl)
          .then((_) => _disconnectAndRestoreDefaultVoiceHub())
          .catchError((_) {}));
      unawaited(_sendCallLog(endedState, endReason));
    }
    unawaited(_webrtc.reset());
    _resetLocalControls();
  }

  void toggleMute() {
    final muted = !state.isMuted;
    if (!_webrtc.setAudioEnabled(!muted) && _webrtc.rendererInitialized) {
      debugPrint('[CallNotifier] audio track is not ready for mute toggle');
    }
    state = state.copyWith(isMuted: muted);
  }

  Future<void> toggleSpeaker() async {
    final speakerOn = !state.isSpeakerOn;
    state = state.copyWith(isSpeakerOn: speakerOn);
    final applied = await _setSpeakerphone(speakerOn);
    if (!applied && state.isSpeakerOn == speakerOn) {
      state = state.copyWith(isSpeakerOn: !speakerOn);
    }
  }

  void toggleCamera() {
    if (!state.isVideo) return;
    final cameraOff = !state.isCameraOff;
    if (!_webrtc.setVideoEnabled(!cameraOff) && _webrtc.rendererInitialized) {
      debugPrint('[CallNotifier] video track is not ready for camera toggle');
    }
    state = state.copyWith(isCameraOff: cameraOff);
  }

  Future<void> switchCamera() async {
    if (!state.isVideo || state.isCameraOff) return;
    await _webrtc.switchCamera();
  }

  /// 最小化为悬浮小窗（通话继续，页面收起）
  void minimize() {
    if (state.status == CallStatus.connected ||
        state.status == CallStatus.calling ||
        state.status == CallStatus.ringing) {
      state = state.copyWith(isMinimized: true);
    }
  }

  /// 从悬浮小窗恢复全屏
  void restore() {
    state = state.copyWith(isMinimized: false);
  }

  Future<void> sendDtmf(String digits) async {
    final callId = state.callId;
    if (callId == null || state.status != CallStatus.connected) return;
    try {
      await _service.sendDtmf(callId, digits, relayUrl: state.relayUrl);
    } catch (e) {
      debugPrint('[CallNotifier] sendDtmf error: $e');
    }
  }

  void reset() {
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();
    unawaited(_webrtc.reset());
    _resetLocalControls();
    state = const CallState();
  }

  // ---------------------------------------------------------------------------
  // Call log
  // ---------------------------------------------------------------------------

  /// 通话结束后，在对应单聊会话中插入一条 call_log 消息
  Future<void> _sendCallLog(CallState endedState, String endReason) async {
    final peerUserId = endedState.peerUserId;
    final callId = endedState.callId;
    if (callId == null) return;
    if (_sentCallLogIds.contains(callId)) return;
    _sentCallLogIds.add(callId);
    try {
      var chatId = endedState.callLogChatId;
      if (chatId == null || chatId.isEmpty) {
        if (peerUserId == null || peerUserId.isEmpty) return;
        // 先通过 POST /direct-chats 获取真实 chatId（幂等接口，已存在则返回旧会话）
        final dio = _ref.read(dioProvider);
        final resp = await dio.post<Map<String, dynamic>>(
          '/api/client/v1/direct-chats',
          data: {'peerUserId': peerUserId},
        );
        chatId = resp.data?['data']?['chatId'] as String? ??
            resp.data?['data']?['conversationId'] as String?;
      }
      if (chatId == null || chatId.isEmpty) return;

      final clientMsgId =
          'calllog_${callId}_${DateTime.now().millisecondsSinceEpoch}';
      final sentMessage = await _callRepo.sendCallLogMessage(
        chatId: chatId,
        clientMsgId: clientMsgId,
        callId: callId,
        mediaMode: endedState.isVideo ? 'audioVideo' : 'audio',
        durationSeconds: endedState.duration.inSeconds,
        endReason: endReason,
        isCaller: endedState.isCaller,
      );
      final space = _ref.read(currentSpaceProvider);
      final message = sentMessage.copyWith(senderUserId: space?.userId ?? '');
      if (space != null) {
        unawaited(
          ChatLocalDataSourceImpl()
              .upsertMessage(space.spaceId, chatId, message)
              .catchError((_) {}),
        );
        try {
          _ref
              .read(chatProvider((space.spaceId, chatId, false)).notifier)
              .appendMessage(message);
        } catch (_) {}
      }
    } catch (e, st) {
      _sentCallLogIds.remove(callId);
      // call_log 发送失败不影响通话流程。
      debugPrint('[CallNotifier] send call_log failed: $e\n$st');
    }
  }

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------

  void _startTimer() {
    _durationTimer?.cancel();
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      state =
          state.copyWith(duration: state.duration + const Duration(seconds: 1));
    });
  }

  void _stopTimer() {
    _durationTimer?.cancel();
    _durationTimer = null;
  }

  void _startOutgoingTimeout(int operationId) {
    _stopOutgoingTimeout();
    _outgoingTimeoutTimer = Timer(_outgoingAnswerTimeout, () {
      if (!mounted || !_isCurrentOperation(operationId)) return;
      final current = state;
      if (!current.isCaller ||
          (current.status != CallStatus.calling &&
              current.status != CallStatus.ringing)) {
        return;
      }
      unawaited(_timeoutOutgoingCall(operationId));
    });
  }

  void _stopOutgoingTimeout() {
    _outgoingTimeoutTimer?.cancel();
    _outgoingTimeoutTimer = null;
  }

  void _startIncomingTimeout(int operationId, String callId) {
    _stopIncomingTimeout();
    _incomingTimeoutTimer = Timer(_incomingAnswerTimeout, () {
      if (!mounted || !_isCurrentOperation(operationId)) return;
      if (state.status != CallStatus.incoming || state.callId != callId) {
        return;
      }
      unawaited(_timeoutIncomingCall(operationId));
    });
  }

  void _stopIncomingTimeout() {
    _incomingTimeoutTimer?.cancel();
    _incomingTimeoutTimer = null;
  }

  Future<void> _timeoutOutgoingCall(int operationId) async {
    if (!_isCurrentOperation(operationId)) return;
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();

    final timedOutState = state.copyWith(
      status: CallStatus.ended,
      duration: Duration.zero,
      endReason: 'timeout',
    );
    state = timedOutState;

    final callId = timedOutState.callId;
    if (callId != null && callId.isNotEmpty) {
      try {
        await _service.hangup(callId, relayUrl: timedOutState.relayUrl);
      } catch (e) {
        debugPrint('[CallNotifier] timeout hangup failed: $e');
      }
      unawaited(_sendCallLog(timedOutState, 'timeout'));
    }

    await _disconnectAndRestoreDefaultVoiceHub();
    await _webrtc.reset();
    _resetLocalControls();
  }

  Future<void> _timeoutIncomingCall(int operationId) async {
    if (!_isCurrentOperation(operationId)) return;
    _operationId++;
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();

    final timedOutState = state.copyWith(
      status: CallStatus.ended,
      duration: Duration.zero,
      endReason: 'timeout',
    );
    state = timedOutState;

    await _disconnectAndRestoreDefaultVoiceHub();
    await _webrtc.reset();
    _resetLocalControls();

    final callId = timedOutState.callId;
    if (callId != null && callId.isNotEmpty) {
      unawaited(_sendCallLog(timedOutState, 'timeout'));
    }
    state = const CallState(status: CallStatus.idle);
  }

  @override
  void dispose() {
    _stopConnectionLostGrace();
    _stopTimer();
    _stopOutgoingTimeout();
    _stopIncomingTimeout();
    _stopRingtone();
    _eventSub?.cancel();
    _iceConnectionSub?.cancel();
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final callProvider =
    StateNotifierProvider<CallNotifier, CallState>(CallNotifier.new);
