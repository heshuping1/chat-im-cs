import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const SystemUiOverlayStyle appSystemUiOverlayStyle = SystemUiOverlayStyle(
  statusBarColor: Colors.transparent,
  statusBarIconBrightness: Brightness.dark,
  statusBarBrightness: Brightness.light,
  systemNavigationBarColor: Color(0xFFF7F8FA),
  systemNavigationBarIconBrightness: Brightness.dark,
  systemNavigationBarContrastEnforced: true,
);

const SystemUiOverlayStyle startupFullScreenOverlayStyle = SystemUiOverlayStyle(
  statusBarColor: Colors.transparent,
  statusBarIconBrightness: Brightness.light,
  statusBarBrightness: Brightness.dark,
  systemNavigationBarColor: Colors.transparent,
  systemNavigationBarIconBrightness: Brightness.light,
  systemNavigationBarContrastEnforced: false,
);

Future<void> configureStartupSystemUi() async {
  await SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.manual,
    overlays: const [],
  );
  SystemChrome.setSystemUIOverlayStyle(startupFullScreenOverlayStyle);
}

Future<void> configureAppSystemUi() async {
  await SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.manual,
    overlays: const [
      SystemUiOverlay.top,
      SystemUiOverlay.bottom,
    ],
  );
  SystemChrome.setSystemUIOverlayStyle(appSystemUiOverlayStyle);
}
