import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppConnectivityStatus {
  online,
  offline,
}

final connectivityStatusProvider = StreamProvider<AppConnectivityStatus>((ref) {
  final connectivity = Connectivity();

  return Stream<AppConnectivityStatus>.multi((controller) {
    var lastStatus = AppConnectivityStatus.online;
    var hasEmitted = false;
    Timer? pollTimer;

    void emit(AppConnectivityStatus status) {
      if (controller.isClosed) return;
      if (hasEmitted && status == lastStatus) return;
      hasEmitted = true;
      lastStatus = status;
      controller.add(status);
    }

    connectivity.checkConnectivity().then((results) {
      emit(connectivityStatusFromResults(results));
    }).catchError((_) {
      emit(AppConnectivityStatus.online);
    });

    final subscription = connectivity.onConnectivityChanged.listen(
      (results) => emit(connectivityStatusFromResults(results)),
      onError: (_) => emit(AppConnectivityStatus.online),
    );

    // Some Android vendors do not emit a restore event reliably after toggling
    // Wi-Fi in airplane mode, so keep a lightweight poll as a recovery net.
    pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      connectivity.checkConnectivity().then((results) {
        emit(connectivityStatusFromResults(results));
      }).catchError((_) {
        emit(AppConnectivityStatus.online);
      });
    });

    controller.onCancel = () {
      pollTimer?.cancel();
      subscription.cancel();
    };
  });
});

AppConnectivityStatus connectivityStatusFromResults(
  List<ConnectivityResult> results,
) {
  if (results.isEmpty || results.contains(ConnectivityResult.none)) {
    return AppConnectivityStatus.offline;
  }
  return AppConnectivityStatus.online;
}
