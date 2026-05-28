import 'package:lpp_mobile/features/settings/domain/entities/settings_entities.dart';

abstract class SettingsRepository {
  /// GET /api/client/v1/notification-settings
  Future<NotificationSettings> getNotificationSettings();

  /// PUT /api/client/v1/notification-settings
  Future<void> updateNotificationSettings(NotificationSettings settings);
}
