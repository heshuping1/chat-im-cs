import 'package:lpp_mobile/core/platform/app_platform.dart';

class PlatformCapabilities {
  const PlatformCapabilities._();

  static AppPlatform get current => AppPlatformInfo.current;

  static bool get isAndroid => current == AppPlatform.android;

  static bool get isIOS => current == AppPlatform.ios;

  static bool get isWeb => current == AppPlatform.web;

  static bool get isWindows => current == AppPlatform.windows;

  static bool get isMobile => current.isMobile;

  static bool get isDesktop => current.isDesktop;

  static bool get supportsMobilePush => isMobile;

  static bool get supportsJPush => isMobile;

  static bool get supportsQrScanner => isMobile;

  static bool get supportsSystemGallerySave => isMobile;

  static bool get supportsLocalFileSystem =>
      !isWeb && (isMobile || isDesktop || current == AppPlatform.fuchsia);

  static bool get supportsWebDownload => isWeb;

  static bool get supportsDesktopWindow => isDesktop;

  static bool get supportsPhoneCallUi => isMobile;

  static bool get supportsWebRtcCalls => isMobile || isWeb || isDesktop;
}
