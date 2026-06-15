import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_service.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/home_page.dart';

void main() {
  group('home title gateway status', () {
    test('shows message label without count when connected and count is zero',
        () {
      expect(
        resolveHomeTitleForGatewayStatus(
          messagesLabel: '消息',
          connectingLabel: '连接中',
          messageBadgeCount: 0,
          gatewayStatus: GatewayConnectionStatus.connected,
        ),
        '消息',
      );
    });

    test('shows message label with count when connected and count is positive',
        () {
      expect(
        resolveHomeTitleForGatewayStatus(
          messagesLabel: '消息',
          connectingLabel: '连接中',
          messageBadgeCount: 3,
          gatewayStatus: GatewayConnectionStatus.connected,
        ),
        '消息 (3)',
      );
    });

    test('shows connecting title while initial gateway connection is starting',
        () {
      expect(
        resolveHomeTitleForGatewayStatus(
          messagesLabel: '消息',
          connectingLabel: '连接中',
          messageBadgeCount: 3,
          gatewayStatus: GatewayConnectionStatus.connecting,
        ),
        '连接中',
      );
    });

    test('shows connecting title while gateway is reconnecting', () {
      expect(
        resolveHomeTitleForGatewayStatus(
          messagesLabel: '消息',
          connectingLabel: '连接中',
          messageBadgeCount: 3,
          gatewayStatus: GatewayConnectionStatus.reconnecting,
        ),
        '连接中',
      );
    });

    test('keeps message count title while gateway is disconnected', () {
      expect(
        resolveHomeTitleForGatewayStatus(
          messagesLabel: '消息',
          connectingLabel: '连接中',
          messageBadgeCount: 3,
          gatewayStatus: GatewayConnectionStatus.disconnected,
        ),
        '消息 (3)',
      );
    });
  });
}
