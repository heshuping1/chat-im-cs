import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';

abstract class AppUpdateRepository {
  Future<AppReleaseUpdate> checkLatest({
    required String appKey,
    required String platform,
    required int versionCode,
  });
}
