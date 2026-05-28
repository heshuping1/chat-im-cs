import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/settings/presentation/pages/logged_devices_page.dart';

void main() {
  group('LoggedDevice', () {
    test('parses platform account devices response', () {
      final device = LoggedDevice.fromJson({
        'deviceId': 'device-1',
        'tenantId': 'tenant-1',
        'tenantName': 'Mouse 测试企业',
        'deviceName': 'Android Phone',
        'deviceType': 'android',
        'lastActiveAt': '2026-05-15T10:00:00Z',
        'isCurrent': true,
        'activeSessionCount': 2,
      });

      expect(device.deviceId, 'device-1');
      expect(device.tenantName, 'Mouse 测试企业');
      expect(device.deviceName, 'Android Phone');
      expect(device.deviceType, 'android');
      expect(device.isCurrent, isTrue);
      expect(device.activeSessionCount, 2);
      expect(device.lastActiveAt, isNotNull);
    });
  });
}
