import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_service.dart';

void main() {
  test('times out a hung gateway connection start attempt', () async {
    final pendingStart = Future<void>.delayed(const Duration(days: 1));

    await expectLater(
      awaitGatewayConnectionStart(
        pendingStart,
        timeout: const Duration(milliseconds: 1),
      ),
      throwsA(isA<TimeoutException>()),
    );
  });

  group('effectiveGatewayConnectionStatus', () {
    test('trusts the underlying SignalR connection when it is connected', () {
      expect(
        effectiveGatewayConnectionStatus(
          GatewayConnectionStatus.connecting,
          isConnected: true,
        ),
        GatewayConnectionStatus.connected,
      );
      expect(
        effectiveGatewayConnectionStatus(
          GatewayConnectionStatus.reconnecting,
          isConnected: true,
        ),
        GatewayConnectionStatus.connected,
      );
    });

    test('preserves the reported status while SignalR is not connected', () {
      expect(
        effectiveGatewayConnectionStatus(
          GatewayConnectionStatus.connecting,
          isConnected: false,
        ),
        GatewayConnectionStatus.connecting,
      );
      expect(
        effectiveGatewayConnectionStatus(
          GatewayConnectionStatus.disconnected,
          isConnected: false,
        ),
        GatewayConnectionStatus.disconnected,
      );
    });
  });

  group('syncCursorStorageKey', () {
    test('isolates sync cursors by space and user', () {
      expect(
        syncCursorStorageKey(spaceId: 'space-a', userId: 'user-1'),
        'sync_cursor_space-a_user-1',
      );
      expect(
        syncCursorStorageKey(spaceId: 'space-a', userId: 'user-2'),
        'sync_cursor_space-a_user-2',
      );
      expect(
        syncCursorStorageKey(spaceId: 'space-b', userId: 'user-1'),
        'sync_cursor_space-b_user-1',
      );
    });
  });
}
