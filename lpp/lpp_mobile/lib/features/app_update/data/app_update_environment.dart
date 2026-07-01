import 'dart:io' show Platform;

const mobileAppUpdateAppKey = 'user';

String currentMobileUpdatePlatform() {
  if (Platform.isIOS) return 'ios';
  return 'android';
}

Uri resolveAppUpdateUrl({
  required String baseUrl,
  required String downloadUrl,
}) {
  final uri = Uri.parse(downloadUrl);
  if (uri.hasScheme) return uri;
  return Uri.parse(baseUrl).resolve(downloadUrl);
}
