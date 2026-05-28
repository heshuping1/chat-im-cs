import 'package:lpp_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;

  AuthRepositoryImpl(this._remoteDataSource);

  @override
  Future<PlatformLoginResult> platformLogin(LoginRequest request) {
    return _remoteDataSource.login(request);
  }

  @override
  Future<PlatformLoginResult> platformLoginByCode(LoginRequest request) {
    return _remoteDataSource.loginByCode(request);
  }

  @override
  Future<void> sendVerificationCode({
    required String identifier,
    required String channel,
    required String purpose,
  }) {
    return _remoteDataSource.sendVerificationCode(
      identifier: identifier,
      channel: channel,
      purpose: purpose,
    );
  }

  @override
  Future<TenantAuthResult> selectTenant(
      String tenantId, String platformToken) {
    return _remoteDataSource.selectTenant(tenantId, platformToken);
  }

  @override
  Future<TenantAuthResult> selectPersonalSpace(String platformToken) {
    return _remoteDataSource.selectPersonalSpace(platformToken);
  }

  @override
  Future<TenantAuthResult> refreshToken(String refreshToken) {
    return _remoteDataSource.refreshToken(refreshToken);
  }

  @override
  Future<TenantAuthResult> tenantLogin(LoginRequest request) {
    return _remoteDataSource.tenantLogin(request);
  }

  @override
  Future<void> logout() async {
    // 本地清理由 AuthNotifier 负责（清除 SecureStorage）
    // 如有服务端登出接口，可在此调用
  }

  @override
  Future<List<TenantSummary>> getMyTenants(String platformToken) {
    return _remoteDataSource.getMyTenants(platformToken);
  }

  @override
  Future<PlatformLoginResult> refreshPlatformToken(String platformToken) {
    return _remoteDataSource.refreshPlatformToken(platformToken);
  }
}
