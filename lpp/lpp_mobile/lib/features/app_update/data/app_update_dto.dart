import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';

class AppUpdateDtoException implements Exception {
  const AppUpdateDtoException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AppReleaseUpdateDto {
  const AppReleaseUpdateDto({
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

  factory AppReleaseUpdateDto.fromEnvelope(Map<String, dynamic> envelope) {
    final code = envelope['code'];
    if (code != 'OK') {
      throw AppUpdateDtoException(
          _stringOrNull(envelope['message']) ?? '更新检查失败');
    }
    final data = envelope['data'];
    if (data is! Map<String, dynamic>) {
      throw const AppUpdateDtoException('更新服务返回缺少 data');
    }
    return AppReleaseUpdateDto.fromJson(data);
  }

  factory AppReleaseUpdateDto.fromJson(Map<String, dynamic> json) {
    return AppReleaseUpdateDto(
      appKey: _stringOrNull(json['appKey']) ?? '',
      platform: _stringOrNull(json['platform']) ?? '',
      clientVersionCode: _intOrNull(json['clientVersionCode']) ?? 1,
      latestVersion: _stringOrNull(json['latestVersion']),
      latestVersionCode: _intOrNull(json['latestVersionCode']),
      downloadUrl: _stringOrNull(json['downloadUrl']),
      fileSizeBytes: _intOrNull(json['fileSizeBytes']),
      fileHashSha256: _stringOrNull(json['fileHashSha256']),
      releaseNotes: _stringOrNull(json['releaseNotes']),
      updateAvailable: json['updateAvailable'] == true,
      forceUpdate: json['forceUpdate'] == true,
    );
  }

  AppReleaseUpdate toDomain() {
    return AppReleaseUpdate(
      appKey: appKey,
      platform: platform,
      clientVersionCode: clientVersionCode,
      latestVersion: latestVersion,
      latestVersionCode: latestVersionCode,
      downloadUrl: downloadUrl,
      fileSizeBytes: fileSizeBytes,
      fileHashSha256: fileHashSha256,
      releaseNotes: releaseNotes,
      updateAvailable: updateAvailable,
      forceUpdate: forceUpdate,
    );
  }
}

String? _stringOrNull(Object? value) {
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

int? _intOrNull(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value.trim());
  return null;
}
