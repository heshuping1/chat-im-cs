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
}
