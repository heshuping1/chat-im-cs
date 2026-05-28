import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:signalr_netcore/signalr_client.dart';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

Map<String, dynamic> _resultMap(Object? raw) {
  final decoded = _decodeMap(raw);
  if (decoded == null) return const {};
  final map = decoded;
  final data = _lookup(map, const ['data', 'Data']);
  final nested = _decodeMap(data);
  if (nested != null) return nested;
  return map;
}

Map<String, dynamic>? _decodeMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is String) {
    final text = value.trim();
    if (!text.startsWith('{')) return null;
    try {
      final decoded = jsonDecode(text);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {}
  }
  return null;
}

Object? _lookup(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    if (map.containsKey(key)) return map[key];
  }
  final lowerKeys = {
    for (final entry in map.entries) entry.key.toLowerCase(): entry.value,
  };
  for (final key in keys) {
    if (lowerKeys.containsKey(key.toLowerCase())) {
      return lowerKeys[key.toLowerCase()];
    }
  }
  return null;
}

String? _stringValue(Map<String, dynamic> map, List<String> keys) {
  final value = _lookup(map, keys);
  if (value == null) return null;
  final text = value.toString();
  return text.isEmpty ? null : text;
}

bool _boolValue(Map<String, dynamic> map, List<String> keys) {
  final value = _lookup(map, keys);
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1' || normalized == 'yes';
  }
  return false;
}

bool _isVideoMediaMode(String mediaMode) {
  final normalized = mediaMode.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
  return normalized == 'audiovideo' || normalized == 'video';
}

class CallStartResult {
  final bool success;
  final String? callId;
  final String? sdpAnswer;
  final String? errorMessage;
  final String? relayUrl;

  const CallStartResult({
    required this.success,
    this.callId,
    this.sdpAnswer,
    this.errorMessage,
    this.relayUrl,
  });

  factory CallStartResult.fromJson(Map<String, dynamic> json) {
    return CallStartResult(
      success: _boolValue(json, const ['success', 'Success']),
      callId: _stringValue(json, const ['callId', 'CallId']),
      sdpAnswer: _stringValue(json, const ['sdpAnswer', 'SdpAnswer']),
      errorMessage: _stringValue(json, const ['errorMessage', 'ErrorMessage']),
      relayUrl: _stringValue(json, const ['relayUrl', 'RelayUrl']),
    );
  }
}

class CallAnswerResult {
  final bool success;
  final String? callId;
  final String? sdpAnswer;
  final String? errorMessage;
  final String? relayUrl;

  const CallAnswerResult({
    required this.success,
    this.callId,
    this.sdpAnswer,
    this.errorMessage,
    this.relayUrl,
  });

  factory CallAnswerResult.fromJson(Map<String, dynamic> json) {
    return CallAnswerResult(
      success: _boolValue(json, const ['success', 'Success']),
      callId: _stringValue(json, const ['callId', 'CallId']),
      sdpAnswer: _stringValue(json, const ['sdpAnswer', 'SdpAnswer']),
      errorMessage: _stringValue(json, const ['errorMessage', 'ErrorMessage']),
      relayUrl: _stringValue(json, const ['relayUrl', 'RelayUrl']),
    );
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

sealed class CallEvent {}

class IncomingCallEvent extends CallEvent {
  final String callId;
  final String callerUserId;
  final String callerDisplayName;
  final String relayUrl;
  final String mediaMode;
  final String? callerVideoProfile;

  IncomingCallEvent({
    required this.callId,
    required this.callerUserId,
    required this.callerDisplayName,
    required this.relayUrl,
    required this.mediaMode,
    this.callerVideoProfile,
  });

  bool get isVideo => _isVideoMediaMode(mediaMode);
}

class CallRingingEvent extends CallEvent {
  final String callId;
  CallRingingEvent({required this.callId});
}

class CallAnsweredEvent extends CallEvent {
  final String callId;
  CallAnsweredEvent({required this.callId});
}

class CallEndedEvent extends CallEvent {
  final String callId;
  final String reason;
  CallEndedEvent({required this.callId, required this.reason});

  bool get isFailureReason {
    final normalized = reason.toLowerCase();
    return normalized == 'connection_lost' ||
        normalized == 'admin_force_end' ||
        normalized == 'failed' ||
        normalized.contains('did not') && normalized.contains('within');
  }
}

class DtmfReceivedEvent extends CallEvent {
  final String callId;
  final String digits;
  DtmfReceivedEvent({required this.callId, required this.digits});
}

// ---------------------------------------------------------------------------
// CallService
// ---------------------------------------------------------------------------

class CallService {
  static const String _hubPath = '/hubs/voicecall';
  static const String _publicRelayHost = '64.185.229.74';

  final String _baseUrl;
  final Future<String> Function() _accessTokenFactory;

  HubConnection? _connection;
  Future<void>? _connectFuture;
  String? _connectingHubUrl;
  String? _connectedHubUrl;
  final _eventController = StreamController<CallEvent>.broadcast();

  CallService({
    required String baseUrl,
    required Future<String> Function() accessTokenFactory,
  })  : _baseUrl = baseUrl,
        _accessTokenFactory = accessTokenFactory;

  Stream<CallEvent> get events => _eventController.stream;

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  Future<void> connect({String? relayUrl}) async {
    final hubUrl = _normalizeHubUrl(relayUrl);
    if (_connection != null &&
        _connection!.state == HubConnectionState.Connected &&
        _connectedHubUrl == hubUrl) {
      return;
    }
    final pending = _connectFuture;
    if (pending != null) {
      if (_connectingHubUrl == hubUrl) {
        return pending;
      }
      try {
        await pending;
      } catch (_) {
        // A stale connection attempt failed; continue with the requested hub.
      }
      if (_connection != null &&
          _connection!.state == HubConnectionState.Connected &&
          _connectedHubUrl == hubUrl) {
        return;
      }
    }

    _connectingHubUrl = hubUrl;
    _connectFuture = _connect(hubUrl).whenComplete(() {
      _connectFuture = null;
      _connectingHubUrl = null;
    });
    return _connectFuture;
  }

  Future<void> _connect(String hubUrl) async {
    final token = await _accessTokenFactory();
    if (token.isEmpty) {
      throw StateError('VoiceCall hub token is empty');
    }

    await _connection?.stop();
    _connection = null;
    _connectedHubUrl = null;

    _connection = HubConnectionBuilder()
        .withUrl(
          hubUrl,
          options: HttpConnectionOptions(
            accessTokenFactory: () async => await _accessTokenFactory(),
          ),
        )
        .withAutomaticReconnect()
        .build();

    _registerHandlers();
    await _connection!.start();
    _connectedHubUrl = hubUrl;
  }

  Future<void> disconnect() async {
    _connectFuture = null;
    _connectingHubUrl = null;
    await _connection?.stop();
    _connection = null;
    _connectedHubUrl = null;
  }

  void _registerHandlers() {
    final conn = _connection!;

    conn.on('IncomingCall', (args) {
      if (args == null || args.length < 4) return;
      final fourth = args[3] as String? ?? '';
      final isLegacySdp = fourth.contains('m=audio') || fourth.contains('v=0');
      final mediaMode = isLegacySdp
          ? (fourth.contains('m=video') ? 'audio-video' : 'audio')
          : (args.length > 4 ? args[4] as String? ?? 'audio' : 'audio');
      final callerVideoProfile = isLegacySdp
          ? (args.length > 4 ? args[4] as String? : null)
          : (args.length > 5 ? args[5] as String? : null);
      _eventController.add(IncomingCallEvent(
        callId: args[0] as String,
        callerUserId: args[1] as String,
        callerDisplayName: args[2] as String,
        relayUrl: isLegacySdp ? (_connectedHubUrl ?? '') : fourth,
        mediaMode: mediaMode,
        callerVideoProfile: callerVideoProfile,
      ));
    });

    conn.on('CallRinging', (args) {
      if (args == null || args.isEmpty) return;
      _eventController.add(CallRingingEvent(callId: args[0] as String));
    });

    conn.on('CallAnswered', (args) {
      if (args == null || args.isEmpty) return;
      _eventController.add(CallAnsweredEvent(callId: args[0] as String));
    });

    conn.on('CallEnded', (args) {
      if (args == null || args.length < 2) return;
      _eventController.add(CallEndedEvent(
        callId: args[0] as String,
        reason: args[1] as String,
      ));
    });

    conn.on('DtmfReceived', (args) {
      if (args == null || args.length < 2) return;
      _eventController.add(DtmfReceivedEvent(
        callId: args[0] as String,
        digits: args[1] as String,
      ));
    });
  }

  // ---------------------------------------------------------------------------
  // Hub methods
  // ---------------------------------------------------------------------------

  Future<CallStartResult> startCall(
    String callId,
    String sdpOffer, {
    required String relayUrl,
    String? videoProfile,
  }) async {
    await connect(relayUrl: relayUrl);
    var result = await _invokeStartCall(callId, sdpOffer, videoProfile);
    if (!result.success &&
        result.errorMessage == 'CALL_WRONG_RELAY_NODE' &&
        result.relayUrl != null &&
        result.relayUrl!.isNotEmpty) {
      await disconnect();
      await connect(relayUrl: result.relayUrl);
      result = await _invokeStartCall(callId, sdpOffer, videoProfile);
    }
    if (!result.success) {
      throw Exception(result.errorMessage ?? 'StartCall failed');
    }
    return result;
  }

  Future<CallStartResult> _invokeStartCall(
    String callId,
    String sdpOffer,
    String? videoProfile,
  ) async {
    final result = await _connection!.invoke(
      'StartCall',
      args: [callId, sdpOffer, videoProfile ?? ''],
    );
    return CallStartResult.fromJson(_resultMap(result));
  }

  Future<CallAnswerResult> answerCall(
    String callId,
    String sdpOffer, {
    required String relayUrl,
    String? videoProfile,
  }) async {
    await connect(relayUrl: relayUrl);
    var result =
        await _invokeAnswerCallWithRetry(callId, sdpOffer, videoProfile);
    if (!result.success &&
        result.errorMessage == 'CALL_WRONG_RELAY_NODE' &&
        result.relayUrl != null &&
        result.relayUrl!.isNotEmpty) {
      await disconnect();
      await connect(relayUrl: result.relayUrl);
      result = await _invokeAnswerCallWithRetry(callId, sdpOffer, videoProfile);
    }
    if (!result.success) {
      throw Exception(result.errorMessage ?? 'AnswerCall failed');
    }
    return result;
  }

  Future<CallAnswerResult> _invokeAnswerCallWithRetry(
    String callId,
    String sdpOffer,
    String? videoProfile,
  ) async {
    CallAnswerResult result =
        await _invokeAnswerCall(callId, sdpOffer, videoProfile);
    for (var attempt = 0;
        attempt < 2 &&
            !result.success &&
            result.errorMessage == 'CALL_NOT_READY';
        attempt++) {
      await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
      result = await _invokeAnswerCall(callId, sdpOffer, videoProfile);
    }
    return result;
  }

  Future<CallAnswerResult> _invokeAnswerCall(
    String callId,
    String sdpOffer,
    String? videoProfile,
  ) async {
    final result = await _connection!.invoke(
      'AnswerCall',
      args: [callId, sdpOffer, videoProfile ?? ''],
    );
    return CallAnswerResult.fromJson(_resultMap(result));
  }

  Future<void> rejectCall(String callId, {String? relayUrl}) async {
    await _ensureConnected(relayUrl: relayUrl);
    await _connection!.invoke('RejectCall', args: [callId]);
  }

  Future<void> hangup(String callId, {String? relayUrl}) async {
    await _ensureConnected(relayUrl: relayUrl);
    await _connection!.invoke('Hangup', args: [callId]);
  }

  Future<void> sendDtmf(
    String callId,
    String digits, {
    String? relayUrl,
  }) async {
    await _ensureConnected(relayUrl: relayUrl);
    await _connection!.invoke('SendDtmf', args: [callId, digits]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  Future<void> _ensureConnected({String? relayUrl}) async {
    final hubUrl = relayUrl == null ? null : _normalizeHubUrl(relayUrl);
    if (_connection == null ||
        _connection!.state != HubConnectionState.Connected ||
        (hubUrl != null && _connectedHubUrl != hubUrl)) {
      await connect(relayUrl: relayUrl);
    }
  }

  String _normalizeHubUrl(String? relayUrl) {
    final raw = (relayUrl == null || relayUrl.trim().isEmpty)
        ? _baseUrl
        : relayUrl.trim();
    final uri = Uri.tryParse(raw);
    if (uri != null && uri.hasScheme) {
      final scheme = switch (uri.scheme) {
        'ws' => 'http',
        'wss' => 'https',
        _ => uri.scheme,
      };
      final host = _isLocalRelayHost(uri.host) ? _publicRelayHost : uri.host;
      if (host != uri.host) {
        debugPrint(
          '[CallService] replace unavailable voice relay host '
          '${uri.host} -> $host',
        );
      }
      final normalizedUri = uri.replace(scheme: scheme, host: host);
      final trimmedPath = normalizedUri.path.replaceFirst(RegExp(r'/$'), '');
      if (trimmedPath.endsWith(_hubPath)) {
        return normalizedUri.replace(path: trimmedPath).toString();
      }
      final nextPath = trimmedPath.isEmpty ? _hubPath : '$trimmedPath$_hubPath';
      return normalizedUri.replace(path: nextPath).toString();
    }

    final normalized = raw.replaceFirst(RegExp(r'/$'), '');
    if (normalized.contains(_hubPath)) return normalized;
    return '$normalized$_hubPath';
  }

  bool _isLocalRelayHost(String host) {
    final normalized = host.toLowerCase();
    return normalized == '0.0.0.0' ||
        normalized == '::' ||
        normalized == '::1' ||
        normalized == 'localhost' ||
        normalized == '127.0.0.1';
  }

  void dispose() {
    _eventController.close();
    _connection?.stop();
  }
}
