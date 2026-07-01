import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/connectivity_provider.dart';
import 'package:lpp_mobile/core/widgets/network_status_banner.dart';

void main() {
  group('network status banner', () {
    test('does not show a floating gateway status banner while online', () {
      expect(
        resolveNetworkStatusBannerKind(
          connectivity: AppConnectivityStatus.online,
        ),
        isNull,
      );
    });

    test('keeps offline network warning as a global banner', () {
      expect(
        resolveNetworkStatusBannerKind(
          connectivity: AppConnectivityStatus.offline,
        ),
        NetworkStatusBannerKind.offline,
      );
    });
  });
}
