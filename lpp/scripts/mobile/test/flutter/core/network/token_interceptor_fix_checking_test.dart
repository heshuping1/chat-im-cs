// Fix Checking 测试
//
// 验证修复后，满足 isBugCondition 的所有场景均正确降级到 selectTenant，
// 不触发 onAuthFailed，GlobalTokenHolder 和 SecureStorage 均被正确更新。
//
// Validates: Requirements 2.1, 2.2, 2.3

import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

// ---------------------------------------------------------------------------
// Fake SecureStorage
// ---------------------------------------------------------------------------

class FakeSecureStorage extends SecureStorageService {
  final Map<String, String> _store = {};

  FakeSecureStorage(Map<String, String> initial) {
    _store.addAll(initial);
  }

  @override
  Future<String?> read(String key) async => _store[key];

  @override
  Future<void> write(String key, String value) async => _store[key] = value;

  @override
  Future<void> delete(String key) async => _store.remove(key);

  @override
  Future<void> deleteAll() async => _store.clear();

  String? get(String key) => _store[key];
}

// ---------------------------------------------------------------------------
// FixCheckingAdapter
//
// 路由规则：
//   /api/client/v1/auth/refresh       → 返回 refreshStatusCode（模拟 refreshToken 过期）
//   /api/platform/v1/auth/select-tenant → 返回 selectTenantStatusCode + 新 token pair
//   其他请求                           → 返回 401（触发 TokenInterceptor.onError）
// ---------------------------------------------------------------------------

class FixCheckingAdapter implements HttpClientAdapter {
  final int refreshStatusCode;
  final int selectTenantStatusCode;
  int selectTenantCallCount = 0;

  FixCheckingAdapter({
    required this.refreshStatusCode,
    this.selectTenantStatusCode = 200,
  });

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;

    if (path.contains('/api/client/v1/auth/refresh')) {
      return ResponseBody.fromString(
        '{"code":"REFRESH_TOKEN_EXPIRED","message":"refresh token expired"}',
        refreshStatusCode,
        headers: {'content-type': ['application/json']},
      );
    }

    if (path.contains('/api/platform/v1/auth/select-tenant')) {
      selectTenantCallCount++;
      if (selectTenantStatusCode == 200) {
        return ResponseBody.fromString(
          '{"data":{"accessToken":"new_access_token","refreshToken":"new_refresh_token"}}',
          200,
          headers: {'content-type': ['application/json']},
        );
      } else {
        return ResponseBody.fromString(
          '{"code":"PLATFORM_TOKEN_EXPIRED","message":"platform token expired"}',
          selectTenantStatusCode,
          headers: {'content-type': ['application/json']},
        );
      }
    }

    // 租户级 API：返回 401 触发刷新流程；重试请求返回 200
    if (options.extra['_isRetry'] == true) {
      return ResponseBody.fromString('{"data":{}}', 200,
          headers: {'content-type': ['application/json']});
    }
    return ResponseBody.fromString(
      '{"code":"UNAUTHORIZED","message":"token expired"}',
      401,
      headers: {'content-type': ['application/json']},
    );
  }

  @override
  void close({bool force = false}) {}
}

// ---------------------------------------------------------------------------
// 测试辅助
// ---------------------------------------------------------------------------

Future<void> _triggerTokenRefresh({
  required FakeSecureStorage storage,
  required FixCheckingAdapter adapter,
  required List<String> authFailedCalls,
}) async {
  final client = HttpClient(
    storage: storage,
    onAuthFailed: () => authFailedCalls.add('called'),
  );
  client.dio.httpClientAdapter = adapter;

  try {
    await client.dio.get('/api/client/v1/conversations');
  } catch (_) {
    // 关注 onAuthFailed 是否被调用，异常本身不重要
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  const spaceId = 'tenant_abc';

  setUp(() {
    GlobalTokenHolder.instance.accessToken = null;
  });

  group('Fix Checking: refreshToken 过期时降级到 selectTenant', () {
    // ── 3.1 refreshToken 过期（401）+ platformToken 有效 ─────────────────────
    test(
      '3.1 refreshToken 过期（401）+ platformToken 有效 → '
      'selectTenant 被调用，onAuthFailed 未被调用，GlobalTokenHolder 更新\n'
      '  Validates: Requirements 2.1, 2.2',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = FixCheckingAdapter(refreshStatusCode: 401);
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        expect(authFailedCalls, isEmpty,
            reason: 'platformToken 有效时不应触发登出');
        expect(adapter.selectTenantCallCount, greaterThan(0),
            reason: 'selectTenant 应被调用以换取新 token');
        expect(GlobalTokenHolder.instance.accessToken, equals('new_access_token'),
            reason: 'GlobalTokenHolder 应更新为新 accessToken');
        expect(storage.get(SecureStorageService.accessTokenKey(spaceId)),
            equals('new_access_token'),
            reason: 'SecureStorage 中 accessToken 应被更新');
        expect(storage.get(SecureStorageService.refreshTokenKey(spaceId)),
            equals('new_refresh_token'),
            reason: 'SecureStorage 中 refreshToken 应被更新');
      },
    );

    // ── 3.2 refreshToken 过期（403）+ platformToken 有效 ─────────────────────
    test(
      '3.2 refreshToken 过期（403）+ platformToken 有效 → '
      'selectTenant 被调用，onAuthFailed 未被调用，GlobalTokenHolder 更新\n'
      '  Validates: Requirements 2.1, 2.2',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = FixCheckingAdapter(refreshStatusCode: 403);
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        expect(authFailedCalls, isEmpty,
            reason: 'platformToken 有效时（403）不应触发登出');
        expect(adapter.selectTenantCallCount, greaterThan(0),
            reason: 'selectTenant 应被调用');
        expect(GlobalTokenHolder.instance.accessToken, equals('new_access_token'),
            reason: 'GlobalTokenHolder 应更新');
        expect(storage.get(SecureStorageService.accessTokenKey(spaceId)),
            equals('new_access_token'));
        expect(storage.get(SecureStorageService.refreshTokenKey(spaceId)),
            equals('new_refresh_token'));
      },
    );

    // ── 3.3 refreshToken 过期 + platformToken 为 null ────────────────────────
    test(
      '3.3 refreshToken 过期 + platformToken 为 null → '
      'onAuthFailed 被调用（兜底登出）\n'
      '  Validates: Requirements 2.3',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          // 不设置 platformToken
        });

        final adapter = FixCheckingAdapter(refreshStatusCode: 401);
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        expect(authFailedCalls, isNotEmpty,
            reason: 'platformToken 为 null 时应触发登出');
        expect(adapter.selectTenantCallCount, equals(0),
            reason: 'platformToken 不存在时不应调用 selectTenant');
      },
    );

    // ── 3.4 refreshToken 过期 + platformToken 有效 + selectTenant 也失败 ─────
    test(
      '3.4 refreshToken 过期 + platformToken 有效 + selectTenant 也失败 → '
      'onAuthFailed 被调用\n'
      '  Validates: Requirements 2.3',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'expired_platform_token',
        });

        final adapter = FixCheckingAdapter(
          refreshStatusCode: 401,
          selectTenantStatusCode: 401, // selectTenant 也失败
        );
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        expect(authFailedCalls, isNotEmpty,
            reason: 'selectTenant 失败时应触发登出');
        expect(adapter.selectTenantCallCount, greaterThan(0),
            reason: 'selectTenant 应被尝试调用');
      },
    );
  });
}
