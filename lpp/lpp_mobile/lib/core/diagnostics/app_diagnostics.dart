import 'dart:convert';

import 'package:flutter/foundation.dart';

enum AppDiagnosticLevel { debug, info, warning, error }

typedef DiagnosticEventListener = void Function(DiagnosticEvent event);

class DiagnosticEvent {
  final DateTime timestamp;
  final int sequence;
  final String sessionId;
  final String? traceId;
  final AppDiagnosticLevel level;
  final String category;
  final String message;
  final Map<String, Object?> context;

  const DiagnosticEvent({
    required this.timestamp,
    this.sequence = 0,
    this.sessionId = '',
    this.traceId,
    required this.level,
    required this.category,
    required this.message,
    this.context = const {},
  });

  Map<String, Object?> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'sequence': sequence,
        if (sessionId.isNotEmpty) 'sessionId': sessionId,
        if (traceId?.isNotEmpty == true) 'traceId': traceId,
        'level': level.name,
        'category': category,
        'message': message,
        if (context.isNotEmpty) 'context': context,
      };

  @override
  String toString() => '[${level.name}] $category: $message $context';
}

class DiagnosticSnapshot {
  final DateTime exportedAt;
  final String sessionId;
  final List<DiagnosticEvent> events;

  const DiagnosticSnapshot({
    required this.exportedAt,
    required this.sessionId,
    required this.events,
  });

  Map<String, Object?> toJson() => {
        'exportedAt': exportedAt.toIso8601String(),
        'sessionId': sessionId,
        'eventCount': events.length,
        'events': events.map((event) => event.toJson()).toList(),
      };

  String toPrettyJson() => const JsonEncoder.withIndent('  ').convert(toJson());
}

/// Lightweight in-memory diagnostics buffer.
///
/// This is intentionally dependency-free so networking, Gateway, calls and UI
/// code can record important events without pulling in a logging framework.
class AppDiagnostics {
  static const int _maxEvents = 300;
  static final AppDiagnostics instance = AppDiagnostics._();

  final String sessionId = _newId('session');
  final List<DiagnosticEvent> _events = [];
  final Set<DiagnosticEventListener> _listeners = {};
  int _sequence = 0;
  int _traceCounter = 0;

  AppDiagnostics._();

  List<DiagnosticEvent> get events => List.unmodifiable(_events);

  void clear() => _events.clear();

  String nextTraceId([String prefix = 'trace']) {
    _traceCounter += 1;
    return _newId('$prefix-$_traceCounter');
  }

  DiagnosticSnapshot snapshot({int? last}) {
    final source = last == null || last >= _events.length
        ? _events
        : _events.sublist(_events.length - last);
    return DiagnosticSnapshot(
      exportedAt: DateTime.now(),
      sessionId: sessionId,
      events: List<DiagnosticEvent>.unmodifiable(source),
    );
  }

  String exportPackage({int? last}) => snapshot(last: last).toPrettyJson();

  List<Map<String, Object?>> breadcrumbsBefore(
    DiagnosticEvent event, {
    int limit = 30,
  }) {
    final breadcrumbs = _events
        .where((candidate) =>
            candidate.sequence < event.sequence &&
            candidate.category != 'diagnostics.report')
        .toList();
    final start = breadcrumbs.length > limit ? breadcrumbs.length - limit : 0;
    return breadcrumbs
        .sublist(start)
        .map((candidate) => candidate.toJson())
        .toList();
  }

  VoidCallback addListener(DiagnosticEventListener listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void debug(
    String category,
    String message, {
    Map<String, Object?> context = const {},
  }) =>
      record(AppDiagnosticLevel.debug, category, message, context: context);

  void info(
    String category,
    String message, {
    Map<String, Object?> context = const {},
  }) =>
      record(AppDiagnosticLevel.info, category, message, context: context);

  void warning(
    String category,
    String message, {
    Map<String, Object?> context = const {},
  }) =>
      record(AppDiagnosticLevel.warning, category, message, context: context);

  void error(
    String category,
    String message, {
    Map<String, Object?> context = const {},
  }) =>
      record(AppDiagnosticLevel.error, category, message, context: context);

  void record(
    AppDiagnosticLevel level,
    String category,
    String message, {
    Map<String, Object?> context = const {},
    String? traceId,
  }) {
    _sequence += 1;
    final event = DiagnosticEvent(
      timestamp: DateTime.now(),
      sequence: _sequence,
      sessionId: sessionId,
      traceId: traceId ?? _traceIdFromContext(context),
      level: level,
      category: category,
      message: message,
      context: _sanitizeContext(context),
    );
    _events.add(event);
    if (_events.length > _maxEvents) {
      _events.removeRange(0, _events.length - _maxEvents);
    }
    debugPrint(event.toString());
    for (final listener in List<DiagnosticEventListener>.of(_listeners)) {
      try {
        listener(event);
      } catch (_) {}
    }
  }

  Map<String, Object?> _sanitizeContext(Map<String, Object?> context) {
    if (context.isEmpty) return const {};
    return context
        .map((key, value) => MapEntry(key, _sanitizeValue(key, value)));
  }

  Object? _sanitizeValue(String key, Object? value) {
    final lowerKey = key.toLowerCase();
    if (_isSensitiveKey(lowerKey)) {
      return _mask(value?.toString() ?? '');
    }
    if (value is Map) {
      return value.map(
        (nestedKey, nestedValue) => MapEntry(
            nestedKey, _sanitizeValue(nestedKey.toString(), nestedValue)),
      );
    }
    if (value is Iterable) {
      return value.map((item) => _sanitizeValue(key, item)).toList();
    }
    return value;
  }

  bool _isSensitiveKey(String lowerKey) {
    return lowerKey.contains('token') ||
        lowerKey == 'authorization' ||
        lowerKey.contains('password') ||
        lowerKey.contains('secret') ||
        lowerKey.contains('captcha') ||
        lowerKey.contains('verificationcode') ||
        lowerKey.contains('verifycode');
  }

  String _mask(String raw) {
    if (raw.isEmpty) return '';
    if (raw.length <= 8) return '***';
    return '${raw.substring(0, 6)}...${raw.substring(raw.length - 2)}';
  }

  String? _traceIdFromContext(Map<String, Object?> context) {
    final raw = context['traceId'] ?? context['clientTraceId'];
    final value = raw?.toString();
    return value == null || value.isEmpty ? null : value;
  }

  static String _newId(String prefix) {
    final micros = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    return '$prefix-$micros';
  }
}
