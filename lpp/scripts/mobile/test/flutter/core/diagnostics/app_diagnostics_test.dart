import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';

void main() {
  test('AppDiagnostics records events and masks token fields', () {
    final diagnostics = AppDiagnostics.instance;
    diagnostics.clear();

    diagnostics.error(
      'chat.send',
      'message send failed',
      context: {
        'conversationId': 'c1',
        'accessToken': 'abcdefghijklmnopqrstuvwxyz',
        'payload': {'password': 'secret-password'},
      },
    );

    expect(diagnostics.events, hasLength(1));
    final event = diagnostics.events.single;
    expect(event.level, AppDiagnosticLevel.error);
    expect(event.sequence, greaterThan(0));
    expect(event.sessionId, isNotEmpty);
    expect(event.category, 'chat.send');
    expect(event.context['conversationId'], 'c1');
    expect(event.context['accessToken'], isNot('abcdefghijklmnopqrstuvwxyz'));
    expect(
      (event.context['payload'] as Map)['password'],
      isNot('secret-password'),
    );
  });

  test('AppDiagnostics notifies and removes listeners', () {
    final diagnostics = AppDiagnostics.instance;
    diagnostics.clear();

    final received = <DiagnosticEvent>[];
    final remove = diagnostics.addListener(received.add);

    diagnostics.warning('network', 'offline');
    remove();
    diagnostics.warning('network', 'online');

    expect(received, hasLength(1));
    expect(received.single.message, 'offline');
  });

  test(
    'AppDiagnostics exports local package with breadcrumbs and trace ids',
    () {
      final diagnostics = AppDiagnostics.instance;
      diagnostics.clear();

      final traceId = diagnostics.nextTraceId('test');
      diagnostics.info(
        'route',
        'open chat',
        context: {'clientTraceId': traceId},
      );
      diagnostics.error(
        'chat.send',
        'failed',
        context: {'clientTraceId': traceId},
      );

      final error = diagnostics.events.last;
      final breadcrumbs = diagnostics.breadcrumbsBefore(error);
      final exported = diagnostics.exportPackage();

      expect(error.traceId, traceId);
      expect(breadcrumbs, hasLength(1));
      expect(breadcrumbs.single['category'], 'route');
      expect(exported, contains('"sessionId"'));
      expect(exported, contains(traceId));
    },
  );
}
