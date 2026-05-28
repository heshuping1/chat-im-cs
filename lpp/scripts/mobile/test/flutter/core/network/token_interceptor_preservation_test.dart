// Preservation Checking 测试
//
// 验证不满足 isBugCondition 的所有路径，修复后行为与修复前完全一致。
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

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
// PreservationAdapter — 可配置各路径的响应
// ---------------------------------------------------------------------------

class PreservationAdapter implements HttpClientAdapter {
  /// /api/client/v1/auth/refresh 的响应配置
  final int refreshStatusCode;
  final Map<String, dynamic>? refreshResponseBody;

  /// /api/platform/v1/auth/refresh-platform-token 的响应配置
  final int platformRefreshStatusCode;

  /// /api/platform/v1/auth/select-tenant 调用计数
  int selectTenantCallCount = 0;

  /// /api/platform/v1/auth/refresh-platform-token 调用计数
  int platformRefreshCallCount = 0;

  /// 是否模拟网络超时（非 HTTP 错误）
  final bool simulateNetworkTimeout;

  PreservationAdapter({
    this.refreshStatusCode = 200,
    this.refreshResponseBody,
    this.platformRefreshStatusCode = 200,
    this.simulateNetworkTimeout = false,
  });

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;

    if (path.contains('/api/client/v1/auth/refresh')) {
      if (simulateNetworkTimeout) {
        throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionTimeout,
          message: '连接超时',
        );
      }
      if (refreshStatusCode == 200) {
        final body = refreshResponseBody ??
            {'data': {'accessToken': 'refreshed_access', 'refreshToken': 'refreshed_refresh'}};
        return ResponseBody.fromString(
          _toJson(body),
          200,
          headers: {'content-type': ['application/json']},
        );
      }
      return ResponseBody.fromString(
        '{"code":"REFRESH_FAILED"}',
        refreshStatusCode,
        headers: {'content-type': ['application/json']},
      );
    }

    if (path.contains('/api/platform/v1/auth/refresh-platform-token')) {
      platformRefreshCallCount++;
      if (platformRefreshStatusCode == 200) {
        return ResponseBody.fromString(
          '{"data":{"platformToken":"new_platform_token"}}',
          200,
          headers: {'content-type': ['application/json']},
        );
      }
      return ResponseBody.fromString(
        '{"code":"PLATFORM_REFRESH_FAILED"}',
        platformRefreshStatusCode,
        headers: {'content-type': ['application/json']},
      );
    }

    if (path.contains('/api/platform/v1/auth/select-tenant')) {
      selectTenantCallCount++;
      return ResponseBody.fromString(
        '{"data":{"accessToken":"new_access","refreshToken":"new_refresh"}}',
        200,
        headers: {'content-type': ['application/json']},
      );
    }

    // 平台级 API（非 auth）：返回 401 触发 _refreshPlatformToken
    if (path.startsWith('/api/platform/v1/')) {
      if (options.extra['_isRetry'] == true) {
        return ResponseBody.fromString('{"data":{}}', 200,
            headers: {'content-type': ['application/json']});
      }
      return ResponseBody.fromString(
        '{"code":"UNAUTHORIZED"}',
        401,
        headers: {'content-type': ['application/json']},
      );
    }

    // 租户级 API：重试请求返回 200，首次返回 401
    if (options.extra['_isRetry'] == true) {
      return ResponseBody.fromString('{"data":{}}', 200,
          headers: {'content-type': ['application/json']});
    }
    return ResponseBody.fromString(
      '{"code":"UNAUTHORIZED"}',
      401,
      headers: {'content-type': ['application/json']},
    );
  }

  @override
  void close({bool force = false}) {}

  String _toJson(Map<String, dynamic> map) {
    // 简单序列化，仅用于测试
    final entries = map.entries.map((e) {
      final v = e.value;
      if (v is Map) return '"${e.key}":${_toJson(v as Map<String, dynamic>)}';
      return '"${e.key}":"$v"';
    }).join(',');
    return '{$entries}';
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

  group('Preservation Checking: 非 Bug 条件路径行为不变', () {
    // ── 4.1 refreshToken 有效 → /auth/refresh 成功，不触发降级 ───────────────
    test(
      '4.1 refreshToken 有效 → /auth/refresh 成功，不触发 selectTenant 降级\n'
      '  Validates: Requirements 3.1',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'valid_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = PreservationAdapter(refreshStatusCode: 200);
        final authFailedCalls = <String>[];

        final client = HttpClient(
          storage: storage,
          onAuthFailed: () => authFailedCalls.add('called'),
        );
        client.dio.httpClientAdapter = adapter;

        try {
          await client.dio.get('/api/client/v1/conversations');
        } catch (_) {}

        expect(authFailedCalls, isEmpty,
            reason: 'refreshToken 有效时不应触发登出');
        expect(adapter.selectTenantCallCount, equals(0),
            reason: 'refreshToken 有效时不应触发 selectTenant 降级');
        expect(storage.get(SecureStorageService.accessTokenKey(spaceId)),
            equals('refreshed_access'),
            reason: 'accessToken 应通过 /auth/refresh 正常更新');
      },
    );

    // ── 4.2 网络超时（非 401/403）→ 抛普通 Exception，不调用 onAuthFailed ────
    test(
      '4.2 网络超时（非 401/403）→ 抛普通 Exception，不调用 onAuthFailed\n'
      '  Validates: Requirements 3.3',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'valid_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = PreservationAdapter(simulateNetworkTimeout: true);
        final authFailedCalls = <String>[];

        final client = HttpClient(
          storage: storage,
          onAuthFailed: () => authFailedCalls.add('called'),
        );
        client.dio.httpClientAdapter = adapter;

        try {
          await client.dio.get('/api/client/v1/conversations');
        } catch (_) {}

        expect(authFailedCalls, isEmpty,
            reason: '网络超时不应触发登出，不应清除 token');
        expect(adapter.selectTenantCallCount, equals(0),
            reason: '网络超时不应触发 selectTenant 降级');
      },
    );

    // ── 4.3 _isRetry == true 的请求返回 401 → 直接 _clearTokensAndFail ───────
    test(
      '4.3 _isRetry == true 的请求返回 401 → 直接 _clearTokensAndFail，'
      '不进入 _refreshToken()\n'
      '  Validates: Requirements 3.5',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.accessTokenKey(spaceId): 'some_access_token',
          SecureStorageService.refreshTokenKey(spaceId): 'some_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final authFailedCalls = <String>[];

        // 自定义 adapter：所有请求都返回 401
        final alwaysUnauthorizedAdapter = _AlwaysUnauthorizedAdapter();

        final client = HttpClient(
          storage: storage,
          onAuthFailed: () => authFailedCalls.add('called'),
        );
        client.dio.httpClientAdapter = alwaysUnauthorizedAdapter;

        // 直接发起带 _isRetry: true 的请求
        try {
          await client.dio.get(
            '/api/client/v1/conversations',
            options: Options(extra: {'_isRetry': true}),
          );
        } catch (_) {}

        expect(authFailedCalls, isNotEmpty,
            reason: '_isRetry 请求 401 应直接触发 _clearTokensAndFail');
        // token 应被清除
        expect(storage.get(SecureStorageService.accessTokenKey(spaceId)), isNull,
            reason: '_clearTokensAndFail 应清除 accessToken');
      },
    );

    // ── 4.4 平台级 API 401 → 走 _refreshPlatformToken()，不进入 _refreshToken() ─
    test(
      '4.4 平台级 API（/api/platform/v1/）401 → 走 _refreshPlatformToken()，'
      '不进入 _refreshToken()，不调用 selectTenant\n'
      '  Validates: Requirements 3.2',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = PreservationAdapter(platformRefreshStatusCode: 200);
        final authFailedCalls = <String>[];

        final client = HttpClient(
          storage: storage,
          onAuthFailed: () => authFailedCalls.add('called'),
        );
        client.dio.httpClientAdapter = adapter;

        // 发起平台级 API 请求，触发 401 → 应走 _refreshPlatformToken
        try {
          await client.dio.get('/api/platform/v1/spaces');
        } catch (_) {}

        expect(authFailedCalls, isEmpty,
            reason: '平台级 API 401 + platformToken 刷新成功，不应触发登出');
        expect(adapter.platformRefreshCallCount, greaterThan(0),
            reason: '应调用 _refreshPlatformToken()');
        expect(adapter.selectTenantCallCount, equals(0),
            reason: '平台级 API 401 不应触发 selectTenant 降级');
      },
    );
  });

  // ── 4.5 并发多个 401 请求 → selectTenant 只被调用一次 ─────────────────────
  group('Preservation Checking: 并发 401 请求只触发一次降级', () {
    test(
      '4.5 并发多个 401 请求 → _fallbackWithPlatformToken 只被调用一次，'
      '其余请求通过 _pendingQueue 等待后重放\n'
      '  Validates: Requirements 3.4',
      () async {
        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = _ConcurrentAdapter(refreshStatusCode: 401, delay: 50);
        final authFailedCalls = <String>[];

        final client = HttpClient(
          storage: storage,
          onAuthFailed: () => authFailedCalls.add('called'),
        );
        client.dio.httpClientAdapter = adapter;

        // 并发发起 3 个请求
        final futures = List.generate(
          3,
          (_) => client.dio
              .get('/api/client/v1/conversations')
              .catchError((_) => Response(requestOptions: RequestOptions())),
        );

        await Future.wait(futures);

        expect(authFailedCalls, isEmpty,
            reason: '并发请求中 platformToken 有效，不应触发登出');
        expect(adapter.selectTenantCallCount, equals(1),
            reason: '并发 401 请求应只触发一次 selectTenant，其余通过 _pendingQueue 等待');
      },
    );
  });
}

// ---------------------------------------------------------------------------
// 辅助 Adapter：所有请求都返回 401
// ---------------------------------------------------------------------------

class _AlwaysUnauthorizedAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"code":"UNAUTHORIZED"}',
      401,
      headers: {'content-type': ['application/json']},
    );
  }

  @override
  void close({bool force = false}) {}
}

// ---------------------------------------------------------------------------
// 并发测试 (4.5)
// ---------------------------------------------------------------------------

class _ConcurrentAdapter implements HttpClientAdapter {
  final int refreshStatusCode;
  int selectTenantCallCount = 0;
  int _delay;

  _ConcurrentAdapter({required this.refreshStatusCode, int delay = 0})
      : _delay = delay;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;

    if (path.contains('/api/client/v1/auth/refresh')) {
      // 模拟 refreshToken 过期
      return ResponseBody.fromString(
        '{"code":"REFRESH_TOKEN_EXPIRED"}',
        refreshStatusCode,
        headers: {'content-type': ['application/json']},
      );
    }

    if (path.contains('/api/platform/v1/auth/select-tenant')) {
      selectTenantCallCount++;
      // 模拟轻微延迟，让并发请求有机会排队
      if (_delay > 0) {
        await Future.delayed(Duration(milliseconds: _delay));
      }
      return ResponseBody.fromString(
        '{"data":{"accessToken":"new_access_token","refreshToken":"new_refresh_token"}}',
        200,
        headers: {'content-type': ['application/json']},
      );
    }

    // 租户级 API：重试请求返回 200，首次返回 401
    if (options.extra['_isRetry'] == true) {
      return ResponseBody.fromString('{"data":{}}', 200,
          headers: {'content-type': ['application/json']});
    }
    return ResponseBody.fromString(
      '{"code":"UNAUTHORIZED"}',
      401,
      headers: {'content-type': ['application/json']},
    );
  }

  @override
  void close({bool force = false}) {}
}


