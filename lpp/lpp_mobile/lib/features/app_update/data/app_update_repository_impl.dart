import 'package:lpp_mobile/features/app_update/data/app_update_remote_datasource.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:lpp_mobile/features/app_update/domain/app_update_repository.dart';

class AppUpdateRepositoryImpl implements AppUpdateRepository {
  AppUpdateRepositoryImpl(this._remote);

  final AppUpdateRemoteDataSource _remote;

  @override
  Future<AppReleaseUpdate> checkLatest({
    required String appKey,
    required String platform,
    required int versionCode,
  }) {
    return _remote.fetchLatest(
      appKey: appKey,
      platform: platform,
      versionCode: versionCode,
    );
  }
}
