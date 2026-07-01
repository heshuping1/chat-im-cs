enum AppUpdateStatus {
  none,
  optional,
  required,
}

class AppReleaseUpdate {
  const AppReleaseUpdate({
    required this.appKey,
    required this.platform,
    required this.clientVersionCode,
    required this.latestVersion,
    required this.latestVersionCode,
    required this.downloadUrl,
    required this.fileSizeBytes,
    required this.fileHashSha256,
    required this.releaseNotes,
    required this.updateAvailable,
    required this.forceUpdate,
  });

  final String appKey;
  final String platform;
  final int clientVersionCode;
  final String? latestVersion;
  final int? latestVersionCode;
  final String? downloadUrl;
  final int? fileSizeBytes;
  final String? fileHashSha256;
  final String? releaseNotes;
  final bool updateAvailable;
  final bool forceUpdate;

  AppUpdateStatus get status {
    if (!updateAvailable) return AppUpdateStatus.none;
    return forceUpdate ? AppUpdateStatus.required : AppUpdateStatus.optional;
  }

  bool get canStartUpdate {
    return updateAvailable &&
        downloadUrl != null &&
        downloadUrl!.trim().isNotEmpty;
  }
}
