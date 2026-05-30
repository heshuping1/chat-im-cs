import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_service.dart';

void main() {
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
