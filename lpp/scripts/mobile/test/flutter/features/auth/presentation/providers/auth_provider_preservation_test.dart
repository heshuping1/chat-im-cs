// Preservation 属性测试
//
// Property 2: Preservation — 无竞态时 userId 补全行为不变
//
// 场景（NOT isBugCondition，即无竞态路径）：
//   1. currentSpaceId == startupSpaceId == 'personal'（用户未切换空间）
//      _restoreUserId 完成后 currentSpaceProvider.state?.userId 等于 fetched userId
//      setSpace 被正确调用
//   2. /profile/me 返回空 userId 时，setSpace 不被调用，currentSpaceProvider.state 不变
//   3. /profile/me 抛出异常时，catch 后不调用 setSpace，currentSpaceProvider.state 不变
//
// 预期结果（未修复代码）：
//   测试 PASS —— 确认基线行为，为修复后的回归检测做准备
//
// Validates: Requirements 3.4, 3.5

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/core/di/injector.dart';

// ---------------------------------------------------------------------------
// Fake SecureStorage（复用自 task 1）
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
// Fake AuthRepository（复用自 task 1）
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
// ControllableAdapter（复用自 task 1，扩展支持错误模式）
// ---------------------------------------------------------------------------

enum ProfileMeMode {
  /// 正常返回 userId
  success,

  /// 返回空 userId
  emptyUserId,

  /// 抛出网络异常
  throwError,
}

class ControllableAdapter implements HttpClientAdapter {
  final Completer<ProfileMeMode> _modeCompleter = Completer();
  final String _userId;

  ControllableAdapter({String userId = 'user_12345'}) : _userId = userId;

  /// 触发 /profile/me 以指定模式返回
  void complete(ProfileMeMode mode) {
    if (!_modeCompleter.isCompleted) {
      _modeCompleter.complete(mode);
    }
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path.contains('/profile/me')) {
      final mode = await _modeCompleter.future;
      switch (mode) {
        case ProfileMeMode.success:
          final body = jsonEncode({
            'data': {'userId': _userId},
          });
          return ResponseBody.fromString(body, 200,
              headers: {'content-type': ['application/json']});

        case ProfileMeMode.emptyUserId:
          final body = jsonEncode({
            'data': {'userId': ''},
          });
          return ResponseBody.fromString(body, 200,
              headers: {'content-type': ['application/json']});

        case ProfileMeMode.throwError:
          throw DioException(
            requestOptions: options,
            message: 'Network error',
            type: DioExceptionType.connectionError,
          );
      }
    }
    // 其他请求直接返回空成功
    return ResponseBody.fromString('{}', 200,
        headers: {'content-type': ['application/json']});
  }

  @override
  void close({bool force = false}) {}
}

// ---------------------------------------------------------------------------
// 辅助：构建已登录个人空间的 ProviderContainer
// ---------------------------------------------------------------------------

Future<({ProviderContainer container, ControllableAdapter adapter})>
    _buildPersonalSpaceContainer({
  required FakeSecureStorage storage,
  required String accessToken,
  required String refreshToken,
  String userId = 'user_12345',
}) async {
  await storage.write(SecureStorageService.activeSpaceIdKey, 'personal');
  await storage.write(
      SecureStorageService.accessTokenKey('personal'), accessToken);
  await storage.write(
      SecureStorageService.refreshTokenKey('personal'), refreshToken);

  final adapter = ControllableAdapter(userId: userId);
  final dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
  dio.httpClientAdapter = adapter;

  final container = ProviderContainer(
    overrides: [
      secureStorageProvider.overrideWithValue(storage),
      dioProvider.overrideWithValue(dio),
    ],
  );

  return (container: container, adapter: adapter);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('Preservation: 无竞态时 userId 补全行为不变', () {
    late FakeSecureStorage fakeStorage;

    setUp(() {
      fakeStorage = FakeSecureStorage();
    });

    // ── 场景 1：正常路径，userId 被正确补全 ──────────────────────────────────
    test(
      'Property 2 (Preservation) 场景 1: '
      'currentSpaceId == startupSpaceId == personal 时，'
      '_restoreUserId 完成后 currentSpaceProvider.state.userId 等于 fetched userId\n'
      '  预期: PASS（确认基线行为）\n'
      '  Validates: Requirements 3.4, 3.5',
      () async {
        const accessToken = 'personal_access_token_abc';
        const refreshToken = 'personal_refresh_token_abc';
        const fetchedUserId = 'user_12345';

        final (:container, :adapter) = await _buildPersonalSpaceContainer(
          storage: fakeStorage,
          accessToken: accessToken,
          refreshToken: refreshToken,
          userId: fetchedUserId,
        );

        addTearDown(container.dispose);

        // 等待 build() 完成（_restoreUserId 已启动但 pending）
        await container.read(authProvider.future);

        // 启动后 currentSpaceProvider 应为 personal，userId 尚未补全
        expect(
          container.read(currentSpaceProvider)?.spaceId,
          equals('personal'),
          reason: '启动后 currentSpaceProvider 应为 personal',
        );

        // 用户未切换空间——currentSpaceId == startupSpaceId == 'personal'
        // 触发 /profile/me 正常返回
        adapter.complete(ProfileMeMode.success);

        // 等待 _restoreUserId 异步完成
        await Future<void>.delayed(const Duration(milliseconds: 200));

        // ── 断言：userId 被正确补全 ──────────────────────────────────────────
        expect(
          container.read(currentSpaceProvider)?.userId,
          equals(fetchedUserId),
          reason:
              'Preservation: 无竞态时 _restoreUserId 应补全 userId=$fetchedUserId',
        );

        // spaceId 不变
        expect(
          container.read(currentSpaceProvider)?.spaceId,
          equals('personal'),
          reason: 'Preservation: setSpace 调用后 spaceId 应保持 personal',
        );

        // GlobalTokenHolder 仍持有 personal token
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(accessToken),
          reason: 'Preservation: setSpace 调用后 GlobalTokenHolder 应持有 personal token',
        );

        // SecureStorage active_space_id 不变
        final activeSpaceId =
            await fakeStorage.read(SecureStorageService.activeSpaceIdKey);
        expect(
          activeSpaceId,
          equals('personal'),
          reason: 'Preservation: setSpace 调用后 active_space_id 应保持 personal',
        );
      },
    );

    // ── 场景 2：/profile/me 返回空 userId，setSpace 不被调用 ─────────────────
    test(
      'Property 2 (Preservation) 场景 2: '
      '/profile/me 返回空 userId 时，setSpace 不被调用，currentSpaceProvider.state 不变\n'
      '  预期: PASS（确认基线行为）\n'
      '  Validates: Requirements 3.4, 3.5',
      () async {
        const accessToken = 'personal_access_token_abc';
        const refreshToken = 'personal_refresh_token_abc';

        final (:container, :adapter) = await _buildPersonalSpaceContainer(
          storage: fakeStorage,
          accessToken: accessToken,
          refreshToken: refreshToken,
        );

        addTearDown(container.dispose);

        await container.read(authProvider.future);

        // 记录启动后的初始状态
        final initialSpace = container.read(currentSpaceProvider);
        expect(initialSpace?.spaceId, equals('personal'));
        expect(initialSpace?.userId, equals(''),
            reason: '启动时 userId 尚未补全，应为空字符串');

        // 触发 /profile/me 返回空 userId
        adapter.complete(ProfileMeMode.emptyUserId);

        await Future<void>.delayed(const Duration(milliseconds: 200));

        // ── 断言：currentSpaceProvider.state 不变（setSpace 未被调用）──────
        final spaceAfter = container.read(currentSpaceProvider);
        expect(
          spaceAfter?.spaceId,
          equals('personal'),
          reason: 'Preservation: 空 userId 时 spaceId 应保持不变',
        );
        expect(
          spaceAfter?.userId,
          equals(''),
          reason: 'Preservation: 空 userId 时 userId 应保持为空（setSpace 未被调用）',
        );

        // GlobalTokenHolder 不变
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(accessToken),
          reason: 'Preservation: 空 userId 时 GlobalTokenHolder 不应被修改',
        );
      },
    );

    // ── 场景 3：/profile/me 抛出异常，catch 后不调用 setSpace ────────────────
    test(
      'Property 2 (Preservation) 场景 3: '
      '/profile/me 抛出异常时，catch 后不调用 setSpace，currentSpaceProvider.state 不变\n'
      '  预期: PASS（确认基线行为）\n'
      '  Validates: Requirements 3.4, 3.5',
      () async {
        const accessToken = 'personal_access_token_abc';
        const refreshToken = 'personal_refresh_token_abc';

        final (:container, :adapter) = await _buildPersonalSpaceContainer(
          storage: fakeStorage,
          accessToken: accessToken,
          refreshToken: refreshToken,
        );

        addTearDown(container.dispose);

        await container.read(authProvider.future);

        // 记录启动后的初始状态
        final initialSpace = container.read(currentSpaceProvider);
        expect(initialSpace?.spaceId, equals('personal'));

        // 触发 /profile/me 抛出网络异常
        adapter.complete(ProfileMeMode.throwError);

        await Future<void>.delayed(const Duration(milliseconds: 200));

        // ── 断言：catch 后 currentSpaceProvider.state 不变 ──────────────────
        final spaceAfter = container.read(currentSpaceProvider);
        expect(
          spaceAfter?.spaceId,
          equals('personal'),
          reason: 'Preservation: 网络异常时 spaceId 应保持不变',
        );
        expect(
          spaceAfter?.userId,
          equals(''),
          reason: 'Preservation: 网络异常时 userId 应保持为空（setSpace 未被调用）',
        );

        // GlobalTokenHolder 不变
        expect(
          GlobalTokenHolder.instance.accessToken,
          equals(accessToken),
          reason: 'Preservation: 网络异常时 GlobalTokenHolder 不应被修改',
        );

        // SecureStorage active_space_id 不变
        final activeSpaceId =
            await fakeStorage.read(SecureStorageService.activeSpaceIdKey);
        expect(
          activeSpaceId,
          equals('personal'),
          reason: 'Preservation: 网络异常时 active_space_id 应保持 personal',
        );
      },
    );
  });
}
