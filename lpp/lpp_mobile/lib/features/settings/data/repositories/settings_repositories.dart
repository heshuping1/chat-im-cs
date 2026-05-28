import 'package:lpp_mobile/features/settings/data/datasources/settings_datasources.dart';
import 'package:lpp_mobile/features/settings/domain/entities/settings_entities.dart';
import 'package:lpp_mobile/features/settings/domain/repositories/settings_repositories.dart';

class SettingsRepositoryImpl implements SettingsRepository {
  final SettingsRemoteDataSource _remote;

  SettingsRepositoryImpl(this._remote);

  @override
  Future<NotificationSettings> getNotificationSettings() =>
      _remote.getNotificationSettings();

  @override
  Future<void> updateNotificationSettings(NotificationSettings settings) =>
      _remote.updateNotificationSettings(settings);
}
