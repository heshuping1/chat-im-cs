// Bug Condition 探索性测试
//
// Property 1: Bug Condition — `_restoreUserId` 竞态覆盖空间上下文
//
// 场景：
//   startupSpaceId = 'personal'
//   _restoreUserId 请求 pending 期间，用户切换到 'tenant_abc'
//   _restoreUserId 完成后，断言 currentSpaceProvider 未被覆盖回 'personal'
//
// 预期结果（未修复代码）：
//   测试 FAIL —— 证明 bug 存在
//   _restoreUserId 无条件调用 setSpace，将 currentSpaceProvider 覆盖回 'personal'
//
// Validates: Requirements 2.3, 2.1

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/core/di/injector.dart';

// ---------------------------------------------------------------------------
// Fake SecureStorage
// ---------------------------------------------------------------------------

class FakeSecureStorage extends SecureStorageService {
  final Map<String, String> _store = {};

  @override
  Future<String?> read(String key) async => _store[key];

  @override
  Future<void> write(String key, String value) async => _store[key] = value;

  @override
  Future<void> delete(String key) async => _store.remove(key);

  @override
  Future<void> deleteAll() async => _store.clear();
}

// ---------------------------------------------------------------------------
// Fake AuthRepository
// ---------------------------------------------------------------------------

class FakeAuthRepository implements AuthRepository {
  @override
  Future<PlatformLoginResult> platformLogin(LoginRequest request) async =>
      throw UnimplementedError();

  @override
  Future<PlatformLoginResult> platformLoginByCode(LoginRequest request) async =>
      throw UnimplementedError();

  @override
  Future<void> sendVerificationCode({
    required String identifier,
    required String channel,
    required String purpose,
  }) async =>
      throw UnimplementedError();

  @override
  Future<TenantAuthResult> selectTenant(
          String tenantId, String platformToken) async =>
      throw UnimplementedError();

  @override
  Future<TenantAuthResult> selectPersonalSpace(String platformToken) async =>
      throw UnimplementedError();

  @override
  Future<TenantAuthResult> refreshToken(String refreshToken) async =>
      throw UnimplementedError();

  @override
  Future<TenantAuthResult> tenantLogin(LoginRequest request) async =>
      throw UnimplementedError();

  @override
  Future<void> logout() async {}

  @override
  Future<List<TenantSummary>> getMyTenants(String platformToken) async => [];

  @override
  Future<PlatformLoginResult> refreshPlatformToken(
          String platformToken) async =>
      throw UnimplementedError();
}

// ---------------------------------------------------------------------------
// Controllable HttpClientAdapter for /profile/me
// ---------------------------------------------------------------------------

/// 可控延迟的 HttpClientAdapter：
/// 调用 completeProfileMe(userId) 后，/profile/me 请求才返回
class ControllableAdapter implements HttpClientAdapter {
  final Completer<String> _profileMeCompleter = Completer();

  /// 触发 /profile/me 返回（模拟网络请求完成）
  void completeProfileMe(String userId) {
    if (!_profileMeCompleter.isCompleted) {
      _profileMeCompleter.complete(userId);
    }
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path.contains('/profile/me')) {
      // 等待外部控制信号
      final userId = await _profileMeCompleter.future;
      final body = jsonEncode({
        'data': {'userId': userId},
      });
      return ResponseBody.fromString(body, 200,
          headers: {'content-type': ['application/json']});
    }
    // 其他请求直接返回空成功
    return ResponseBody.fromString('{}', 200,
        headers: {'content-type': ['application/json']});
  }

  @override
  void close({bool force = false}) {}
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

void main() {
  group('Bug Condition: _restoreUserId 竞态覆盖空间上下文', () {
    late FakeSecureStorage fakeStorage;
    late ControllableAdapter controllableAdapter;
    late Dio fakeDio;
    late ProviderContainer container;

    setUp(() {
      fakeStorage = FakeSecureStorage();
      controllableAdapter = ControllableAdapter();
      fakeDio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      fakeDio.httpClientAdapter = controllableAdapter;
    });

    tearDown(() {
      container.dispose();
    });

    test(
      'Property 1 (Bug Condition): '
      '_restoreUserId 完成后不应覆盖用户已切换的空间\n'
      '  场景: startupSpaceId=personal, 用户切换到 tenant_abc, '
      '_restoreUserId 完成后 currentSpaceProvider 应保持 tenant_abc\n'
      '  预期: FAIL（未修复代码会将 currentSpaceProvider 覆盖回 personal）\n'
      '  Validates: Requirements 2.3, 2.1',
      () async {
        // ── 准备 SecureStorage：模拟已登录个人空间 ──────────────────────────
        const personalAccessToken = 'personal_access_token_abc';
        const personalRefreshToken = 'personal_refresh_token_abc';
        const tenantAccessToken = 'tenant_abc_access_token_xyz';
        const tenantRefreshToken = 'tenant_abc_refresh_token_xyz';
        const fetchedUserId = 'user_12345';

        await fakeStorage.write(
            SecureStorageService.activeSpaceIdKey, 'personal');
        await fakeStorage.write(
            SecureStorageService.accessTokenKey('personal'),
            personalAccessToken);
        await fakeStorage.write(
            SecureStorageService.refreshTokenKey('personal'),
            personalRefreshToken);

        // 预先写入 tenant_abc 的 token（模拟 _prefetchTenantTokens 已完成）
        await fakeStorage.write(
            SecureStorageService.accessTokenKey('tenant_abc'),
            tenantAccessToken);
        await fakeStorage.write(
            SecureStorageService.refreshTokenKey('tenant_abc'),
            tenantRefreshToken);

        // ── 构建 ProviderContainer，注入 fake 依赖 ──────────────────────────
        container = ProviderContainer(
          overrides: [
            secureStorageProvider.overrideWithValue(fakeStorage),
            dioProvider.overrideWithValue(fakeDio),
          ],
        );

        // 等待 build() 完成（_restoreUserId 已启动但 pending，等待 adapter 信号）
        await container.read(authProvider.future);

        // 此时 currentSpaceProvider 应为 personal（启动时设置）
        expect(
          container.read(currentSpaceProvider)?.spaceId,
          equals('personal'),
          reason: '启动后 currentSpaceProvider 应为 personal',
        );
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(personalAccessToken),
          reason: '启动后 GlobalTokenHolder 应持有 personal token',
        );

        // ── 模拟用户主动切换到 tenant_abc ────────────────────────────────────
        final tenantSpace = SpaceContext(
          spaceId: 'tenant_abc',
          accessToken: tenantAccessToken,
          refreshToken: tenantRefreshToken,
          userId: 'tenant_user_999',
          type: SpaceType.employee,
        );

        await container
            .read(currentSpaceProvider.notifier)
            .switchSpace(tenantSpace);

        // 验证切换成功
        expect(
          container.read(currentSpaceProvider)?.spaceId,
          equals('tenant_abc'),
          reason: '用户切换后 currentSpaceProvider 应为 tenant_abc',
        );
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(tenantAccessToken),
          reason: '用户切换后 GlobalTokenHolder 应持有 tenant_abc token',
        );

        final activeSpaceIdAfterSwitch =
            await fakeStorage.read(SecureStorageService.activeSpaceIdKey);
        expect(
          activeSpaceIdAfterSwitch,
          equals('tenant_abc'),
          reason: '用户切换后 SecureStorage active_space_id 应为 tenant_abc',
        );

        // ── 触发 _restoreUserId 完成（模拟 /profile/me 返回）────────────────
        controllableAdapter.completeProfileMe(fetchedUserId);

        // 等待 _restoreUserId 异步完成（给足时间让 setSpace 被调用）
        await Future<void>.delayed(const Duration(milliseconds: 200));

        // ── 断言：_restoreUserId 完成后，currentSpaceProvider 不应被覆盖 ────
        //
        // 期望行为（修复后）：currentSpaceProvider 保持 tenant_abc
        // 实际行为（未修复）：currentSpaceProvider 被覆盖回 personal
        //
        // 此断言在未修复代码上 FAIL，证明 bug 存在
        expect(
          container.read(currentSpaceProvider)?.spaceId,
          equals('tenant_abc'),
          reason:
              '[BUG] _restoreUserId 完成后将 currentSpaceProvider 覆盖回 personal，'
              '但用户已切换到 tenant_abc，不应被覆盖',
        );

        // GlobalTokenHolder 不应被覆盖回 personal token
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(tenantAccessToken),
          reason:
              '[BUG] _restoreUserId 完成后将 GlobalTokenHolder.accessToken 覆盖回 '
              'personal token，导致企业空间请求使用错误 token',
        );

        // SecureStorage 中 active_space_id 不应被覆盖回 personal
        final activeSpaceIdAfterRestore =
            await fakeStorage.read(SecureStorageService.activeSpaceIdKey);
        expect(
          activeSpaceIdAfterRestore,
          equals('tenant_abc'),
          reason:
              '[BUG] _restoreUserId 完成后将 SecureStorage active_space_id 覆盖回 '
              'personal，导致下次启动恢复到错误空间',
        );
      },
    );
  });
}
