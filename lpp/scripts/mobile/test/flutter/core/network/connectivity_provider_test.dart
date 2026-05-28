import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/connectivity_provider.dart';

void main() {
  group('connectivityStatusFromResults', () {
    test('returns offline when there is no connectivity result', () {
      expect(
        connectivityStatusFromResults(const []),
        AppConnectivityStatus.offline,
      );
    });

    test('returns offline when connectivity reports none', () {
      expect(
        connectivityStatusFromResults(const [ConnectivityResult.none]),
        AppConnectivityStatus.offline,
      );
    });

    test('returns online when any network transport is available', () {
      expect(
        connectivityStatusFromResults(const [ConnectivityResult.wifi]),
        AppConnectivityStatus.online,
      );
      expect(
        connectivityStatusFromResults(const [ConnectivityResult.mobile]),
        AppConnectivityStatus.online,
      );
    });
  });
}
