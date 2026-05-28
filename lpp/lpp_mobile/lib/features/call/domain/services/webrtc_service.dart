import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';

/// 检测 SDP 字符串是否包含视频轨
bool isVideoCall(String sdp) => sdp.contains('m=video');

// ---------------------------------------------------------------------------
// WebRtcService
// ---------------------------------------------------------------------------

class WebRtcService {
  static const Duration _iceGatheringTimeout = Duration(seconds: 3);
  static const int _audioMaxBitrate = 32000;
  static const int _preferredVideoWidth = 640;
  static const int _preferredVideoHeight = 360;
  static const int _preferredVideoFps = 20;
  static const int _fallbackVideoWidth = 480;
  static const int _fallbackVideoHeight = 360;
  static const int _fallbackVideoFps = 15;
  static const int _startVideoBitrate = 600 * 1000;
  static const int _maxVideoBitrate = 600 * 1000;
  static const int _minVideoBitrate = 150 * 1000;

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;

  final RTCVideoRenderer localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();

  final _remoteTrackController = StreamController<RTCTrackEvent>.broadcast();
  Stream<RTCTrackEvent> get onRemoteTrack => _remoteTrackController.stream;

  final _iceConnectionStateController =
      StreamController<RTCIceConnectionState>.broadcast();
  Stream<RTCIceConnectionState> get onIceConnectionState =>
      _iceConnectionStateController.stream;

  bool _isVideo = false;
  bool _isFrontCamera = true;
  bool _rendererInitialized = false;

  bool get rendererInitialized => _rendererInitialized;
  bool get hasLocalVideo => _localStream?.getVideoTracks().isNotEmpty ?? false;
  bool get hasLocalAudio => _localStream?.getAudioTracks().isNotEmpty ?? false;
  bool get hasRemoteVideo =>
      remoteRenderer.srcObject?.getVideoTracks().isNotEmpty ?? false;

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  Future<void> init({
    required bool isVideo,
    required bool speakerOn,
  }) async {
    await reset();
    _isVideo = isVideo;
    await _configureAudioSession(speakerOn: speakerOn);
    if (!_rendererInitialized) {
      await localRenderer.initialize();
      await remoteRenderer.initialize();
      _rendererInitialized = true;
    }

    // The server-side MediaRelay owns ICE routing. Keep client ICE servers empty
    // to avoid collecting unrelated public candidates that can slow down setup.
    final config = {
      'iceServers': <Map<String, dynamic>>[],
      'sdpSemantics': 'unified-plan',
    };

    final peerConnection = await createPeerConnection(config);
    _peerConnection = peerConnection;
    peerConnection.onIceConnectionState = (state) {
      debugPrint('[WebRtcService] ICE connection state: $state');
      if (!_iceConnectionStateController.isClosed) {
        _iceConnectionStateController.add(state);
      }
    };
    peerConnection.onConnectionState = (state) {
      debugPrint('[WebRtcService] peer connection state: $state');
    };

    try {
      _localStream = await _openLocalMedia(isVideo: isVideo);
    } catch (e) {
      debugPrint('[WebRtcService] getUserMedia failed: $e');
      throw StateError(
        isVideo
            ? 'getUserMedia failed: camera or microphone is unavailable'
            : 'getUserMedia failed: microphone is unavailable',
      );
    }

    final localStream = _localStream;
    if (localStream == null) {
      throw StateError('getUserMedia failed: no local media stream');
    }
    if (localStream.getAudioTracks().isEmpty) {
      throw StateError('getUserMedia failed: microphone track is missing');
    }
    if (isVideo && localStream.getVideoTracks().isEmpty) {
      throw StateError('getUserMedia failed: camera video track is missing');
    }
    _logLocalMedia(localStream);

    localRenderer.srcObject = localStream;
    // Add tracks to peer connection
    for (final track in localStream.getTracks()) {
      await peerConnection.addTrack(track, localStream);
    }
    await _configureAudioSender(peerConnection);
    await _configureVideoSender(peerConnection);

    // Handle remote tracks
    peerConnection.onTrack = (event) {
      debugPrint(
        '[WebRtcService] remote track kind=${event.track.kind}, '
        'enabled=${event.track.enabled}, streams=${event.streams.length}',
      );
      if (event.streams.isNotEmpty) {
        remoteRenderer.srcObject = event.streams[0];
      }
      if (!_remoteTrackController.isClosed) {
        _remoteTrackController.add(event);
      }
    };
  }

  Future<MediaStream> _openLocalMedia({required bool isVideo}) async {
    if (!isVideo) {
      return navigator.mediaDevices.getUserMedia({
        'audio': _audioConstraints(),
        'video': false,
      });
    }

    final attempts = [
      _mediaConstraints(
        width: _preferredVideoWidth,
        height: _preferredVideoHeight,
        frameRate: _preferredVideoFps,
      ),
      _mediaConstraints(
        width: _fallbackVideoWidth,
        height: _fallbackVideoHeight,
        frameRate: _fallbackVideoFps,
      ),
    ];

    Object? lastError;
    for (final constraints in attempts) {
      try {
        final stream = await navigator.mediaDevices.getUserMedia(constraints);
        final videoTrack = stream.getVideoTracks().firstOrNull;
        if (videoTrack != null) {
          await _applyVideoConstraints(videoTrack);
        }
        debugPrint(
          '[WebRtcService] camera opened settings=${videoTrack?.getSettings()}',
        );
        return stream;
      } catch (e) {
        lastError = e;
        debugPrint(
            '[WebRtcService] getUserMedia retry with lower video profile: $e');
      }
    }
    throw lastError ?? StateError('camera or microphone is unavailable');
  }

  Map<String, dynamic> _mediaConstraints({
    required int width,
    required int height,
    required int frameRate,
  }) {
    return {
      'audio': _audioConstraints(),
      'video': {
        'facingMode': _isFrontCamera ? 'user' : 'environment',
        'width': {'ideal': width},
        'height': {'ideal': height},
        'frameRate': {
          'ideal': frameRate,
          'max': frameRate == _preferredVideoFps ? 24 : frameRate,
        },
      },
    };
  }

  Future<void> _applyVideoConstraints(MediaStreamTrack videoTrack) async {
    try {
      await videoTrack.applyConstraints({
        'width': _preferredVideoWidth,
        'height': _preferredVideoHeight,
        'frameRate': {
          'ideal': _preferredVideoFps,
          'max': 24,
        },
      });
      debugPrint(
        '[WebRtcService] local video constraints applied '
        '${_preferredVideoWidth}x$_preferredVideoHeight@$_preferredVideoFps, '
        'settings=${videoTrack.getSettings()}',
      );
    } catch (e) {
      debugPrint('[WebRtcService] apply local video constraints skipped: $e');
    }
  }

  Map<String, dynamic> _audioConstraints() {
    return {
      'echoCancellation': {'ideal': true},
      'noiseSuppression': {'ideal': true},
      'autoGainControl': {'ideal': true},
      'channelCount': {'ideal': 1},
      'mandatory': const {
        'googEchoCancellation': 'true',
        'googAutoGainControl': 'true',
        'googNoiseSuppression': 'true',
        'googHighpassFilter': 'true',
        'googTypingNoiseDetection': 'false',
      },
      'optional': const [
        {'googEchoCancellation2': 'true'},
        {'googDAEchoCancellation': 'true'},
      ],
    };
  }

  void _logLocalMedia(MediaStream stream) {
    final audioTracks = stream.getAudioTracks();
    final videoTracks = stream.getVideoTracks();
    debugPrint(
      '[WebRtcService] local media opened audioTracks=${audioTracks.length}, '
      'videoTracks=${videoTracks.length}',
    );
    for (final track in audioTracks) {
      debugPrint(
        '[WebRtcService] local audio track id=${track.id}, '
        'enabled=${track.enabled}, settings=${track.getSettings()}',
      );
    }
    for (final track in videoTracks) {
      debugPrint(
        '[WebRtcService] local video track id=${track.id}, '
        'enabled=${track.enabled}, settings=${track.getSettings()}',
      );
    }
  }

  Future<void> _configureAudioSession({required bool speakerOn}) async {
    if (!PlatformCapabilities.isAndroid) return;
    try {
      await Helper.setAndroidAudioConfiguration(
        AndroidAudioConfiguration.communication,
      );
      await Helper.setSpeakerphoneOn(speakerOn);
    } catch (e) {
      debugPrint('[WebRtcService] configure Android audio session failed: $e');
    }
  }

  Future<void> _configureAudioSender(RTCPeerConnection peerConnection) async {
    try {
      final senders = await peerConnection.getSenders();
      final audioSender =
          senders.where((sender) => sender.track?.kind == 'audio').firstOrNull;
      if (audioSender == null) return;

      final params = audioSender.parameters;
      final encodings = params.encodings;
      if (encodings == null || encodings.isEmpty) {
        debugPrint('[WebRtcService] audio sender has no encodings to tune');
        return;
      }
      for (final encoding in encodings) {
        encoding.maxBitrate = _audioMaxBitrate;
        encoding.priority = RTCPriorityType.high;
        encoding.networkPriority = RTCPriorityType.high;
      }
      await audioSender.setParameters(params);
      debugPrint(
        '[WebRtcService] audio sender tuned maxBitrate=$_audioMaxBitrate',
      );
    } catch (e) {
      debugPrint('[WebRtcService] configure audio sender failed: $e');
    }
  }

  Future<void> _configureVideoSender(RTCPeerConnection peerConnection) async {
    if (!_isVideo) return;
    try {
      final senders = await peerConnection.getSenders();
      final videoSender =
          senders.where((sender) => sender.track?.kind == 'video').firstOrNull;
      if (videoSender == null) return;

      final params = videoSender.parameters;
      final encodings = params.encodings;
      if (encodings == null || encodings.isEmpty) {
        debugPrint('[WebRtcService] video sender has no encodings to tune');
        return;
      }
      for (final encoding in encodings) {
        encoding.maxBitrate = _maxVideoBitrate;
        encoding.minBitrate = _minVideoBitrate;
        encoding.maxFramerate = _preferredVideoFps;
        encoding.scaleResolutionDownBy ??= 1.0;
        encoding.priority = RTCPriorityType.high;
        encoding.networkPriority = RTCPriorityType.high;
      }
      params.degradationPreference =
          RTCDegradationPreference.MAINTAIN_RESOLUTION;
      await videoSender.setParameters(params);
      debugPrint(
        '[WebRtcService] video sender tuned '
        '${_preferredVideoWidth}x$_preferredVideoHeight@$_preferredVideoFps, '
        'bitrate=${_minVideoBitrate ~/ 1000}-${_maxVideoBitrate ~/ 1000}kbps, '
        'degradation=${params.degradationPreference}',
      );
    } catch (e) {
      debugPrint('[WebRtcService] configure video sender failed: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // SDP
  // ---------------------------------------------------------------------------

  Future<String> createOffer() async {
    final peerConnection = _peerConnection;
    if (peerConnection == null) {
      throw StateError('WebRTC connection is not initialized');
    }
    final offer = await peerConnection.createOffer({
      'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': _isVideo,
      },
      'optional': const [],
    });
    final sdp = _prepareLocalSdp(offer.sdp ?? '');
    await peerConnection.setLocalDescription(
      RTCSessionDescription(sdp, offer.type),
    );
    await _waitForIceGatheringComplete(peerConnection);
    final localDescription = await peerConnection.getLocalDescription();
    final finalSdp = _prepareLocalSdp(localDescription?.sdp ?? sdp);
    debugPrint(
      '[WebRtcService] local offer ready, hasAudio=${finalSdp.contains("m=audio")}, '
      'hasVideo=${finalSdp.contains("m=video")}, candidates=${_candidateCount(finalSdp)}',
    );
    return finalSdp;
  }

  String _prepareLocalSdp(String sdp) {
    return _tuneVideoBitrate(_preferSpeechOpus(sdp));
  }

  String _preferSpeechOpus(String sdp) {
    if (sdp.isEmpty) return sdp;
    final lines = sdp.split(RegExp(r'\r?\n'));
    String? opusPayload;
    final opusRtpmap =
        RegExp(r'^a=rtpmap:(\d+) opus/48000', caseSensitive: false);

    for (final line in lines) {
      final match = opusRtpmap.firstMatch(line);
      if (match != null) {
        opusPayload = match.group(1);
        break;
      }
    }
    if (opusPayload == null) return sdp;

    final updated = <String>[];
    var wroteOpusFmtp = false;
    final fmtpPrefix = 'a=fmtp:$opusPayload ';
    const speechFmtp =
        'minptime=10;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxaveragebitrate=$_audioMaxBitrate';

    for (final line in lines) {
      if (line.startsWith('m=audio ')) {
        final parts = line.split(' ');
        if (parts.length > 3) {
          final header = parts.take(3);
          final payloads = parts.skip(3).toList()
            ..removeWhere((payload) => payload == opusPayload);
          updated.add([...header, opusPayload, ...payloads].join(' '));
          continue;
        }
      }

      if (line.startsWith(fmtpPrefix)) {
        if (wroteOpusFmtp) continue;
        updated.add('$fmtpPrefix$speechFmtp');
        wroteOpusFmtp = true;
        continue;
      }

      if (line == 'a=rtpmap:$opusPayload opus/48000/2' ||
          line == 'a=rtpmap:$opusPayload opus/48000') {
        updated.add('a=rtpmap:$opusPayload opus/48000/2');
        if (!wroteOpusFmtp) {
          updated.add('$fmtpPrefix$speechFmtp');
          wroteOpusFmtp = true;
        }
        continue;
      }

      updated.add(line);
    }

    return updated.join('\r\n');
  }

  String _tuneVideoBitrate(String sdp) {
    if (!_isVideo || sdp.isEmpty) return sdp;
    final lines = sdp.split(RegExp(r'\r?\n'));
    String? vp8Payload;
    final vp8Rtpmap =
        RegExp(r'^a=rtpmap:(\d+) VP8/90000', caseSensitive: false);
    for (final line in lines) {
      final match = vp8Rtpmap.firstMatch(line);
      if (match != null) {
        vp8Payload = match.group(1);
        break;
      }
    }
    if (vp8Payload == null) return sdp;

    final updated = <String>[];
    final fmtpPrefix = 'a=fmtp:$vp8Payload ';
    const vp8Fmtp =
        'x-google-start-bitrate=${_startVideoBitrate ~/ 1000};x-google-min-bitrate=${_minVideoBitrate ~/ 1000};x-google-max-bitrate=${_maxVideoBitrate ~/ 1000}';
    var inVideoSection = false;
    var section = <String>[];

    void flushSection() {
      if (section.isEmpty) return;
      if (!inVideoSection) {
        updated.addAll(section);
        section = <String>[];
        return;
      }

      final hasBandwidth = section.any(
        (line) => line.startsWith('b=AS:') || line.startsWith('b=TIAS:'),
      );
      if (!hasBandwidth) {
        final insertAfter = section.indexWhere((line) => line.startsWith('c='));
        final index = insertAfter >= 0 ? insertAfter + 1 : 1;
        section.insert(index, 'b=AS:${_maxVideoBitrate ~/ 1000}');
      }

      var wroteVp8Fmtp = false;
      for (var i = 0; i < section.length; i++) {
        final line = section[i];
        if (line.startsWith(fmtpPrefix)) {
          if (!line.contains('x-google-max-bitrate')) {
            section[i] = '$line;$vp8Fmtp';
          }
          wroteVp8Fmtp = true;
          break;
        }
      }
      if (!wroteVp8Fmtp) {
        final insertAfter = section
            .indexWhere((line) => line == 'a=rtpmap:$vp8Payload VP8/90000');
        if (insertAfter >= 0) {
          section.insert(insertAfter + 1, '$fmtpPrefix$vp8Fmtp');
        }
      }

      updated.addAll(section);
      section = <String>[];
    }

    for (final line in lines) {
      if (line.startsWith('m=')) {
        flushSection();
        inVideoSection = line.startsWith('m=video ');
      }
      section.add(line);
    }
    flushSection();
    return updated.join('\r\n');
  }

  Future<void> _waitForIceGatheringComplete(RTCPeerConnection pc) async {
    final initialState = await pc.getIceGatheringState();
    if (initialState == RTCIceGatheringState.RTCIceGatheringStateComplete) {
      return;
    }

    final completer = Completer<void>();
    pc.onIceGatheringState = (state) {
      debugPrint('[WebRtcService] ICE gathering state: $state');
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
          !completer.isCompleted) {
        completer.complete();
      }
    };

    final latestState = await pc.getIceGatheringState();
    if (latestState == RTCIceGatheringState.RTCIceGatheringStateComplete) {
      return;
    }

    await completer.future.timeout(
      _iceGatheringTimeout,
      onTimeout: () {
        debugPrint(
          '[WebRtcService] ICE gathering timed out after '
          '${_iceGatheringTimeout.inMilliseconds}ms; sending current offer',
        );
      },
    );
  }

  int _candidateCount(String sdp) {
    return RegExp(r'^a=candidate:', multiLine: true).allMatches(sdp).length;
  }

  Future<void> setRemoteDescription(String sdpAnswer) async {
    final peerConnection = _peerConnection;
    if (peerConnection == null) {
      throw StateError('WebRTC connection is not initialized');
    }
    final desc = RTCSessionDescription(sdpAnswer, 'answer');
    await peerConnection.setRemoteDescription(desc);
  }

  // ---------------------------------------------------------------------------
  // Media controls
  // ---------------------------------------------------------------------------

  Future<bool> switchCamera() async {
    if (!_isVideo || _localStream == null) return false;
    final videoTrack = _localStream!.getVideoTracks().firstOrNull;
    if (videoTrack == null) return false;
    try {
      await Helper.switchCamera(videoTrack);
      _isFrontCamera = !_isFrontCamera;
      return true;
    } catch (e) {
      debugPrint('[WebRtcService] switchCamera failed: $e');
      return false;
    }
  }

  bool setVideoEnabled(bool enabled) {
    final videoTracks = _localStream?.getVideoTracks() ?? const [];
    if (videoTracks.isEmpty) return false;
    for (final track in videoTracks) {
      track.enabled = enabled;
    }
    return true;
  }

  bool setAudioEnabled(bool enabled) {
    final audioTracks = _localStream?.getAudioTracks() ?? const [];
    if (audioTracks.isEmpty) return false;
    for (final track in audioTracks) {
      track.enabled = enabled;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Dispose
  // ---------------------------------------------------------------------------

  Future<void> reset() async {
    _localStream?.getTracks().forEach((t) => t.stop());
    await _localStream?.dispose();
    _localStream = null;

    await _peerConnection?.close();
    _peerConnection = null;
    if (PlatformCapabilities.isAndroid) {
      try {
        await Helper.clearAndroidCommunicationDevice();
      } catch (e) {
        debugPrint(
            '[WebRtcService] clear Android communication device failed: $e');
      }
    }

    // reset is used between calls. Keep renderers alive because the call page
    // holds the same renderer instances; disposing them here breaks redial.
    if (_rendererInitialized) {
      _clearRenderer(localRenderer);
      _clearRenderer(remoteRenderer);
    }
  }

  Future<void> dispose() async {
    await reset();
    if (_rendererInitialized) {
      await localRenderer.dispose();
      await remoteRenderer.dispose();
      _rendererInitialized = false;
    }
    if (!_remoteTrackController.isClosed) {
      await _remoteTrackController.close();
    }
    if (!_iceConnectionStateController.isClosed) {
      await _iceConnectionStateController.close();
    }
  }

  void _clearRenderer(RTCVideoRenderer renderer) {
    try {
      renderer.srcObject = null;
    } catch (e) {
      debugPrint('[WebRtcService] clear renderer failed: $e');
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final webRtcServiceProvider = Provider<WebRtcService>((ref) {
  final service = WebRtcService();
  ref.onDispose(() => service.dispose());
  return service;
});
