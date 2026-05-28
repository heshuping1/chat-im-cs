// Bug Condition 探索性测试
//
// Property 1: Bug Condition — refreshToken 失效时应降级到 selectTenant，而非直接登出
//
// 场景：
//   spaceId = 'tenant_abc'
//   SecureStorage 中存有 refreshToken（已过期）和 platformToken（有效）
//   /api/client/v1/auth/refresh 返回 401（或 403）
//
// 期望行为（修复后）：
//   onAuthFailed 不被调用（不登出）
//   selectTenant 被调用（降级换取新 token）
//
// 实际行为（未修复代码）：
//   onAuthFailed 被调用 → 测试 FAIL → 证明 bug 存在
//
// Validates: Requirements 2.1, 2.2

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
}

// ---------------------------------------------------------------------------
// Controllable HttpClientAdapter
//
// 路由规则：
//   /api/client/v1/auth/refresh  → 返回 refreshStatusCode（模拟 refreshToken 过期）
//   /api/platform/v1/auth/select-tenant → 记录调用并返回 200 + 新 token pair
//   其他请求 → 返回 401（触发 TokenInterceptor.onError）
// ---------------------------------------------------------------------------

class ControllableAdapter implements HttpClientAdapter {
  final int refreshStatusCode;
  int selectTenantCallCount = 0;

  ControllableAdapter({required this.refreshStatusCode});

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;

    if (path.contains('/api/client/v1/auth/refresh')) {
      // 模拟 refreshToken 已过期
      return ResponseBody.fromString(
        '{"code":"REFRESH_TOKEN_EXPIRED","message":"refresh token expired"}',
        refreshStatusCode,
        headers: {'content-type': ['application/json']},
      );
    }

    if (path.contains('/api/platform/v1/auth/select-tenant')) {
      // 记录 selectTenant 被调用
      selectTenantCallCount++;
      return ResponseBody.fromString(
        '{"data":{"accessToken":"new_access_token","refreshToken":"new_refresh_token"}}',
        200,
        headers: {'content-type': ['application/json']},
      );
    }

    // 其他租户级 API 请求：重试请求返回 200，首次返回 401，触发 TokenInterceptor 刷新流程
    if (options.extra['_isRetry'] == true) {
      return ResponseBody.fromString(
        '{"data":{}}',
        200,
        headers: {'content-type': ['application/json']},
      );
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
// 测试辅助：构建 HttpClient 并发起一个会触发 401 的请求
// ---------------------------------------------------------------------------

Future<void> _triggerTokenRefresh({
  required FakeSecureStorage storage,
  required ControllableAdapter adapter,
  required List<String> authFailedCalls,
}) async {
  final client = HttpClient(
    storage: storage,
    onAuthFailed: () => authFailedCalls.add('called'),
  );

  // 注入可控 adapter
  client.dio.httpClientAdapter = adapter;

  // 发起一个租户级 API 请求，adapter 会返回 401 触发刷新流程
  try {
    await client.dio.get('/api/client/v1/conversations');
  } catch (_) {
    // 预期会抛出异常（无论修复前后），我们只关心 onAuthFailed 是否被调用
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // 每个测试前重置 GlobalTokenHolder
  setUp(() {
    GlobalTokenHolder.instance.accessToken = null;
  });

  group('Bug Condition 探索性测试: refreshToken 过期时不应直接登出', () {
    // ── 1.1 refreshDio 返回 401 ──────────────────────────────────────────────
    test(
      '1.1 refreshToken 过期（401）且 platformToken 有效 → '
      'onAuthFailed 不应被调用（期望行为），selectTenant 应被调用\n'
      '  预期: FAIL（未修复代码会调用 onAuthFailed，证明 bug 存在）\n'
      '  Validates: Requirements 2.1, 2.2',
      () async {
        const spaceId = 'tenant_abc';

        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = ControllableAdapter(refreshStatusCode: 401);
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        // 期望行为（修复后）：onAuthFailed 不被调用
        // 实际行为（未修复）：onAuthFailed 被调用 → 此断言 FAIL → 证明 bug 存在
        expect(
          authFailedCalls,
          isEmpty,
          reason:
              '[BUG] platformToken 有效时，refreshToken 过期（401）不应触发登出，'
              '但 onAuthFailed 被调用了。这证明 bug 存在：'
              '_refreshToken() 在 refreshToken 失效时直接抛 AuthError，'
              '没有尝试 platformToken 降级路径。',
        );

        // 期望行为（修复后）：selectTenant 被调用
        expect(
          adapter.selectTenantCallCount,
          greaterThan(0),
          reason:
              '[BUG] refreshToken 过期且 platformToken 有效时，'
              '应调用 selectTenant 降级换取新 token，但 selectTenant 未被调用。',
        );
      },
    );

    // ── 1.2 refreshDio 返回 403 ──────────────────────────────────────────────
    test(
      '1.2 refreshToken 过期（403）且 platformToken 有效 → '
      'onAuthFailed 不应被调用（期望行为），selectTenant 应被调用\n'
      '  预期: FAIL（未修复代码会调用 onAuthFailed，证明 bug 存在）\n'
      '  Validates: Requirements 2.1, 2.2',
      () async {
        const spaceId = 'tenant_abc';

        final storage = FakeSecureStorage({
          SecureStorageService.activeSpaceIdKey: spaceId,
          SecureStorageService.refreshTokenKey(spaceId): 'expired_refresh_token',
          SecureStorageService.platformTokenKey: 'valid_platform_token',
        });

        final adapter = ControllableAdapter(refreshStatusCode: 403);
        final authFailedCalls = <String>[];

        await _triggerTokenRefresh(
          storage: storage,
          adapter: adapter,
          authFailedCalls: authFailedCalls,
        );

        // 期望行为（修复后）：onAuthFailed 不被调用
        // 实际行为（未修复）：onAuthFailed 被调用 → 此断言 FAIL → 证明 bug 存在
        expect(
          authFailedCalls,
          isEmpty,
          reason:
              '[BUG] platformToken 有效时，refreshToken 过期（403）不应触发登出，'
              '但 onAuthFailed 被调用了。这证明 bug 存在：'
              '_refreshToken() 对 403 同样直接抛 AuthError，'
              '没有尝试 platformToken 降级路径。',
        );

        // 期望行为（修复后）：selectTenant 被调用
        expect(
          adapter.selectTenantCallCount,
          greaterThan(0),
          reason:
              '[BUG] refreshToken 过期（403）且 platformToken 有效时，'
              '应调用 selectTenant 降级换取新 token，但 selectTenant 未被调用。',
        );
      },
    );
  });
}
