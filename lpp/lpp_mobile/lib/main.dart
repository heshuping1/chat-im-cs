import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'app/system_ui.dart';
import 'core/diagnostics/app_error_reporter.dart';
import 'core/network/site_line_manager.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/storage/hive_storage.dart';
import 'core/storage/secure_storage.dart';

void main() {
  runZonedGuarded(() async {
    final binding = WidgetsFlutterBinding.ensureInitialized();
    binding.deferFirstFrame();

    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      AppErrorReporter.instance.reportFlutterError(details);
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      AppErrorReporter.instance.reportUnhandled(
        error,
        stack,
        source: 'platform',
      );
      return true;
    };

    await configureStartupSystemUi();
    PushNotificationService.registerBackgroundHandler();
    await HiveStorage.init();
    await SiteLineManager.instance.bootstrap(SecureStorageServiceImpl());
    runApp(const ProviderScope(child: App()));
  }, (error, stack) {
    AppErrorReporter.instance.reportUnhandled(
      error,
      stack,
      source: 'zone',
    );
  });
}
