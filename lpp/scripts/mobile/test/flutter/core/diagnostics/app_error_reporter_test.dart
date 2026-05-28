import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/diagnostics/app_error_reporter.dart';

void main() {
  late _CaptureAdapter adapter;
  late AppErrorReporter reporter;

  setUp(() {
    AppDiagnostics.instance.clear();
    adapter = _CaptureAdapter();
    reporter = AppErrorReporter(minInterval: Duration.zero);
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..httpClientAdapter = adapter;
    reporter.start(dio: dio);
    reporter.updateContext(spaceId: 'tenant-1', userId: 'user-1');
  });

  tearDown(() {
    reporter.stop();
    AppDiagnostics.instance.clear();
  });

  test('reports diagnostic errors without reporting info events', () async {
    AppDiagnostics.instance.info(
      'gateway',
      'connected',
      context: {'clientTraceId': 'trace-1'},
    );
    AppDiagnostics.instance.error(
      'chat.send',
      'failed',
      context: {
        'clientTraceId': 'trace-1',
        'requestId': 'req-1',
        'accessToken': 'abcdefghijklmnopqrstuvwxyz',
      },
    );

    await _waitFor(() => adapter.requests.length == 1);

    final request = adapter.requests.single;
    expect(request.path, AppErrorReporter.defaultEndpoint);
    expect(request.extra['skipDiagnosticsLog'], isTrue);
    expect(request.extra['skipErrorReporting'], isTrue);
    expect(request.extra['skipAuthHandling'], isTrue);
    expect(request.body['platform'], isNotEmpty);
    expect(request.body['errorLevel'], 3);
    expect(request.body['errorType'], 'chat.send');
    expect(request.body['message'], 'failed');
    expect(request.body['clientTimestamp'], isNotEmpty);
    expect(request.body['context']['sessionId'], isNotEmpty);
    expect(request.body['context']['traceId'], 'trace-1');
    expect(request.body['context']['breadcrumbs'], isA<List>());
    expect(request.body['context']['breadcrumbs'], isNotEmpty);
    expect(request.body['context']['breadcrumbs'].last['category'], 'gateway');
    expect(request.body['context']['requestId'], 'req-1');
    expect(
      request.body['context']['accessToken'],
      isNot('abcdefghijklmnopqrstuvwxyz'),
    );
    expect(request.body['context']['spaceId'], 'tenant-1');
  });

  test('disables reporting when endpoint is unsupported', () async {
    adapter.statusCode = 404;

    AppDiagnostics.instance.error('first', 'failed');
    await _waitFor(() => adapter.requests.length == 1);

    AppDiagnostics.instance.error('second', 'failed');
    await Future<void>.delayed(const Duration(milliseconds: 40));

    expect(adapter.requests, hasLength(1));
  });
}

Future<void> _waitFor(bool Function() condition) async {
  final deadline = DateTime.now().add(const Duration(seconds: 2));
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('condition not met before timeout');
    }
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

class _CaptureAdapter implements HttpClientAdapter {
  int statusCode = 200;
  final requests = <_CapturedRequest>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final bytes = <int>[];
    if (requestStream != null) {
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
    }
    final text = utf8.decode(bytes);
    requests.add(
      _CapturedRequest(
        path: options.path,
        extra: Map<String, dynamic>.from(options.extra),
        body: text.isEmpty
            ? const {}
            : Map<String, dynamic>.from(jsonDecode(text) as Map),
      ),
    );
    return ResponseBody.fromString(
      '{"code":"OK","data":{}}',
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _CapturedRequest {
  final String path;
  final Map<String, dynamic> extra;
  final Map<String, dynamic> body;

  const _CapturedRequest({
    required this.path,
    required this.extra,
    required this.body,
  });
}
