import 'package:flutter/foundation.dart';

enum AppPlatform {
  android('android'),
  ios('ios'),
  web('web'),
  windows('windows'),
  macos('macos'),
  linux('linux'),
  fuchsia('fuchsia'),
  unknown('unknown');

  const AppPlatform(this.wireName);

  final String wireName;

  bool get isMobile => this == android || this == ios;

  bool get isDesktop => this == windows || this == macos || this == linux;
}

class AppPlatformInfo {
  const AppPlatformInfo._();

  static AppPlatform get current {
    if (kIsWeb) return AppPlatform.web;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => AppPlatform.android,
      TargetPlatform.iOS => AppPlatform.ios,
      TargetPlatform.windows => AppPlatform.windows,
      TargetPlatform.macOS => AppPlatform.macos,
      TargetPlatform.linux => AppPlatform.linux,
      TargetPlatform.fuchsia => AppPlatform.fuchsia,
    };
  }

  static String get clientDeviceType {
    return switch (current) {
      AppPlatform.android => 'android',
      AppPlatform.ios => 'ios',
      AppPlatform.web => 'web',
      AppPlatform.windows ||
      AppPlatform.macos ||
      AppPlatform.linux =>
        'desktop',
      AppPlatform.fuchsia || AppPlatform.unknown => 'mobile',
    };
  }

  static String get gatewayPlatform => clientDeviceType;
}
