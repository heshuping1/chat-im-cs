import 'package:lpp_mobile/core/storage/secure_storage.dart';

class LoginIdentifierCache {
  static const lastLoginTypeKey = 'auth_last_login_type';
  static const lastLoginIdentifierKey = 'auth_last_login_identifier';
  static const lastLoginIdentifierMobileKey =
      'auth_last_login_identifier_mobile';
  static const lastLoginIdentifierEmailKey = 'auth_last_login_identifier_email';
  static const lastLoginIdentifierLppIdKey =
      'auth_last_login_identifier_lpp_id';

  const LoginIdentifierCache._();

  static Future<void> clear(SecureStorageService storage) async {
    await Future.wait([
      storage.delete(lastLoginTypeKey),
      storage.delete(lastLoginIdentifierKey),
      storage.delete(lastLoginIdentifierMobileKey),
      storage.delete(lastLoginIdentifierEmailKey),
      storage.delete(lastLoginIdentifierLppIdKey),
    ]);
  }
}
