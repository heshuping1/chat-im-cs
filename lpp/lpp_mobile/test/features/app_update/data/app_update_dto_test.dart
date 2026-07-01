import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_dto.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';

void main() {
  test('parses OK envelope into AppReleaseUpdate', () {
    final update = AppReleaseUpdateDto.fromEnvelope({
      'code': 'OK',
      'message': 'success',
      'data': {
        'appKey': 'user',
        'platform': 'android',
        'clientVersionCode': 100,
        'latestVersion': '1.2.3',
        'latestVersionCode': 123,
        'downloadUrl':
            '/api/client/v1/app-releases/download?appKey=user&platform=android',
        'fileSizeBytes': 44236800,
        'fileHashSha256': '9' * 64,
        'releaseNotes': '本次更新内容',
        'updateAvailable': true,
        'forceUpdate': false,
      },
    }).toDomain();

    expect(update.appKey, 'user');
    expect(update.platform, 'android');
    expect(update.latestVersionCode, 123);
    expect(update.status, AppUpdateStatus.optional);
  });

  test('rejects non-OK envelopes with service message', () {
    expect(
      () => AppReleaseUpdateDto.fromEnvelope({
        'code': 'APP_UPDATE_CONFIG_NOT_FOUND',
        'message': '未找到版本配置',
        'data': null,
      }),
      throwsA(isA<AppUpdateDtoException>()),
    );
  });

  test('normalizes absent release data as no update', () {
    final update = AppReleaseUpdateDto.fromEnvelope({
      'code': 'OK',
      'data': {
        'appKey': 'user',
        'platform': 'ios',
        'clientVersionCode': 10,
        'latestVersion': null,
        'latestVersionCode': null,
        'downloadUrl': null,
        'fileSizeBytes': null,
        'fileHashSha256': null,
        'releaseNotes': null,
        'updateAvailable': false,
        'forceUpdate': false,
      },
    }).toDomain();

    expect(update.status, AppUpdateStatus.none);
    expect(update.canStartUpdate, isFalse);
  });
}
