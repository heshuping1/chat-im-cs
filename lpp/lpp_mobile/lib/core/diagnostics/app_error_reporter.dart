import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/platform/app_platform.dart';

/// Best-effort remote diagnostics reporter.
///
/// Reporting must never block user flows. Network failures, unsupported server
/// endpoints and malformed responses are swallowed silently.
class AppErrorReporter {
  static final AppErrorReporter instance = AppErrorReporter._();

  static const String defaultEndpoint = '/api/client/v1/client-errors';
  static const int _maxQueueSize = 20;
  static const int _maxMessageLength = 1600;
  static const int _maxStackLength = 3200;

  final String endpoint;
  final Duration minInterval;

  Dio? _dio;
  VoidCallback? _removeDiagnosticsListener;
  bool _sending = false;
  bool _disabled = false;
  DateTime? _lastSentAt;
  Timer? _drainTimer;
  String? _spaceId;
  String? _userId;

  final List<DiagnosticEvent> _queue = [];
  final Map<String, DateTime> _recentFingerprints = {};

  AppErrorReporter({
    this.endpoint = defaultEndpoint,
    this.minInterval = const Duration(seconds: 2),
  });

  AppErrorReporter._()
      : endpoint = defaultEndpoint,
        minInterval = const Duration(seconds: 2);

  void start({required Dio dio}) {
    _dio = dio;
    _removeDiagnosticsListener ??=
        AppDiagnostics.instance.addListener(_onDiagnosticEvent);
  }

  void stop() {
    _removeDiagnosticsListener?.call();
    _removeDiagnosticsListener = null;
    _drainTimer?.cancel();
    _drainTimer = null;
    _dio = null;
    _sending = false;
    _queue.clear();
  }

  void updateContext({String? spaceId, String? userId}) {
    _spaceId = spaceId;
    _userId = userId;
  }

  void reportFlutterError(FlutterErrorDetails details) {
    final exception = details.exception;
    final stack = details.stack;
    AppDiagnostics.instance.error(
      'app.flutter_error',
      exception.toString(),
      context: {
        'library': details.library,
        'context': details.context?.toDescription(),
        if (stack != null)
          'stack': _truncate(stack.toString(), _maxStackLength),
      },
    );
  }

  void reportUnhandled(
    Object error,
    StackTrace stack, {
    required String source,
  }) {
    AppDiagnostics.instance.error(
      'app.unhandled',
      error.toString(),
      context: {
        'source': source,
        'stack': _truncate(stack.toString(), _maxStackLength),
      },
    );
  }

  void _onDiagnosticEvent(DiagnosticEvent event) {
    if (_disabled || event.level != AppDiagnosticLevel.error) return;
    if (event.category == 'diagnostics.report') return;
    if (!_shouldReport(event)) return;

    _queue.add(event);
    if (_queue.length > _maxQueueSize) {
      _queue.removeRange(0, _queue.length - _maxQueueSize);
    }
    _scheduleDrain();
  }

  bool _shouldReport(DiagnosticEvent event) {
    final now = DateTime.now();
    _recentFingerprints.removeWhere(
      (_, timestamp) => now.difference(timestamp) > const Duration(minutes: 1),
    );
    final fingerprint = '${event.category}:${event.message}';
    final last = _recentFingerprints[fingerprint];
    if (last != null && now.difference(last) < const Duration(seconds: 30)) {
      return false;
    }
    _recentFingerprints[fingerprint] = now;
    return true;
  }

  void _scheduleDrain() {
    if (_sending || _queue.isEmpty || _dio == null) return;

    final lastSentAt = _lastSentAt;
    final wait = lastSentAt == null
        ? Duration.zero
        : minInterval - DateTime.now().difference(lastSentAt);
    if (wait <= Duration.zero) {
      unawaited(_drain());
      return;
    }
    _drainTimer ??= Timer(wait, () {
      _drainTimer = null;
      unawaited(_drain());
    });
  }

  Future<void> _drain() async {
    if (_sending || _queue.isEmpty || _disabled) return;
    final dio = _dio;
    if (dio == null) return;

    _sending = true;
    try {
      while (_queue.isNotEmpty && !_disabled) {
        final event = _queue.removeAt(0);
        await _send(dio, event);
        _lastSentAt = DateTime.now();
        if (_queue.isNotEmpty) {
          await Future<void>.delayed(minInterval);
        }
      }
    } finally {
      _sending = false;
      _scheduleDrain();
    }
  }

  Future<void> _send(Dio dio, DiagnosticEvent event) async {
    try {
      await dio.post<Map<String, dynamic>>(
        endpoint,
        data: _payload(event),
        options: Options(
          sendTimeout: const Duration(seconds: 3),
          receiveTimeout: const Duration(seconds: 3),
          extra: const {
            'skipDiagnosticsLog': true,
            'skipErrorReporting': true,
            'skipAuthHandling': true,
          },
        ),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 404 || status == 405 || status == 501) {
        _disabled = true;
        _queue.clear();
      }
      if (kDebugMode) {
        debugPrint('[diagnostics.report] skipped: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[diagnostics.report] skipped: $error');
      }
    }
  }

  Map<String, Object?> _payload(DiagnosticEvent event) {
    final context = _trimContext(event.context);
    final stackTrace = context['stack']?.toString();
    return {
      'platform': AppPlatformInfo.current.wireName,
      'errorLevel': 3,
      'errorType': event.category,
      'message': _truncate(event.message, _maxMessageLength),
      if (stackTrace?.isNotEmpty == true)
        'stackTrace': _truncate(stackTrace!, _maxStackLength),
      'clientTimestamp': event.timestamp.toIso8601String(),
      'context': {
        ...context,
        'sessionId': event.sessionId,
        'sequence': event.sequence,
        if (event.traceId?.isNotEmpty == true) 'traceId': event.traceId,
        'breadcrumbs': AppDiagnostics.instance.breadcrumbsBefore(event),
        'deviceType': AppPlatformInfo.clientDeviceType,
        if (_spaceId?.isNotEmpty == true) 'spaceId': _spaceId,
        if (_userId?.isNotEmpty == true) 'userId': _userId,
      },
    };
  }

  Map<String, Object?> _trimContext(Map<String, Object?> context) {
    return context.map((key, value) {
      if (value is String) {
        final limit = key.toLowerCase() == 'stack' ? _maxStackLength : 800;
        return MapEntry(key, _truncate(value, limit));
      }
      return MapEntry(key, value);
    });
  }

  static String _truncate(String value, int maxLength) {
    if (value.length <= maxLength) return value;
    return '${value.substring(0, maxLength)}...';
  }
}
