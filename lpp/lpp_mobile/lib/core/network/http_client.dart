import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

// ---------------------------------------------------------------------------
// HttpClient
// ---------------------------------------------------------------------------

class HttpClient {
  /// 测试环境地址
  static String get baseUrl => SiteLineManager.instance.apiBaseUrl;

  late final Dio dio;

  HttpClient({
    required SecureStorageService storage,
    String? Function()? tokenGetter,
    VoidCallback? onAuthFailed,
    void Function(String newPlatformToken)? onPlatformTokenRefreshed,

    /// 租户 token 刷新成功后的回调（用于同步更新 authProvider state）
    void Function(String spaceId, String newAccessToken)?
        onTenantTokenRefreshed,
  }) {
    dio = Dio(
      BaseOptions(
        baseUrl: HttpClient.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    dio.interceptors.addAll([
      TokenInterceptor(
        storage: storage,
        dio: dio,
        tokenGetter: tokenGetter,
        onAuthFailed: onAuthFailed,
        onPlatformTokenRefreshed: onPlatformTokenRefreshed,
        onTenantTokenRefreshed: onTenantTokenRefreshed,
      ),
      _AppLogInterceptor(),
    ]);
    SiteLineManager.instance.addListener(() {
      dio.options.baseUrl = HttpClient.baseUrl;
    });
  }
}

// ---------------------------------------------------------------------------
// TokenInterceptor
// ---------------------------------------------------------------------------

/// 负责：
/// 1. 从 SecureStorage 读取当前空间的 accessToken，注入 Authorization header
/// 2. 捕获 401 → 调用 /auth/refresh → 重放原始请求
/// 3. refresh 失败 → 清除 Token，抛出 AuthError
///
/// 并发安全：使用 [Completer] 队列化刷新期间的其他请求，避免多次并发刷新。
class TokenInterceptor extends Interceptor {
  final SecureStorageService _storage;
  final Dio _dio;
  final String? Function()? _tokenGetter;

  /// 认证彻底失败时的回调（用于触发重新登录）
  final VoidCallback? onAuthFailed;

  /// platformToken 刷新成功后的回调（用于同步更新 authProvider state）
  final void Function(String newPlatformToken)? onPlatformTokenRefreshed;

  /// 租户 token 刷新成功后的回调（用于同步更新 authProvider state）
  final void Function(String spaceId, String newAccessToken)?
      onTenantTokenRefreshed;

  bool _isRefreshing = false;
  final List<_PendingRequest> _pendingQueue = [];

  TokenInterceptor({
    required SecureStorageService storage,
    required Dio dio,
    String? Function()? tokenGetter,
    this.onAuthFailed,
    this.onPlatformTokenRefreshed,
    this.onTenantTokenRefreshed,
  })  : _storage = storage,
        _dio = dio,
        _tokenGetter = tokenGetter;

  // -------------------------------------------------------------------------
  // onRequest：注入 Token
  // -------------------------------------------------------------------------

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // 非 FormData 请求才注入 Content-Type: application/json
    if (options.data is! FormData) {
      options.headers['Content-Type'] = 'application/json';
    }

    // 判断是平台级 API 还是租户级 API
    final isPlatformApi = options.path.startsWith('/api/platform/v1/');

    if (isPlatformApi) {
      // 平台级 API：注入 platformToken（如果请求已手动设置了 Authorization，不覆盖）
      if (!options.headers.containsKey('Authorization')) {
        final platformToken =
            await _storage.read(SecureStorageService.platformTokenKey);
        if (platformToken != null && platformToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $platformToken';
        }
      }
    } else {
      // 租户级 API：注入 accessToken
      // 如果请求已手动设置了 Authorization，不覆盖（用于检测 userType 等场景）
      if (!options.headers.containsKey('Authorization')) {
        // 优先从内存（currentSpaceProvider）读 token，避免 SecureStorage 时序问题
        final memToken = _tokenGetter?.call();
        if (memToken != null && memToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $memToken';
        } else {
          // 降级：从 SecureStorage 读
          final spaceId =
              await _storage.read(SecureStorageService.activeSpaceIdKey);
          if (spaceId != null) {
            final token = await _storage.readAccessToken(spaceId);
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
        }
      }
    }
    handler.next(options);
  }

  // -------------------------------------------------------------------------
  // onError：捕获 401，触发 Token 刷新
  // -------------------------------------------------------------------------

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.requestOptions.extra['skipAuthHandling'] == true) {
      handler.next(err);
      return;
    }
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    final options = err.requestOptions;

    // 防止刷新请求本身触发无限循环
    if (options.extra['_isRetry'] == true) {
      await _clearTokensAndFail(handler, err);
      return;
    }

    // 判断是平台级 API 还是租户级 API
    final isPlatformApi = options.path.startsWith('/api/platform/v1/');

    if (_isRefreshing) {
      // 已有刷新在进行中，将当前请求加入等待队列
      final completer = Completer<Response<dynamic>>();
      _pendingQueue
          .add(_PendingRequest(options: options, completer: completer));
      try {
        final response = await completer.future;
        handler.resolve(response);
      } catch (e) {
        handler.next(err);
      }
      return;
    }

    _isRefreshing = true;

    try {
      if (isPlatformApi) {
        // 刷新 platformToken
        await _refreshPlatformToken();
      } else {
        // 刷新 accessToken
        await _refreshToken();
      }
      // 刷新成功，重放原始请求
      final response = await _retry(options);
      // 通知队列中的等待请求
      _resolveQueue();
      handler.resolve(response);
    } catch (e) {
      _rejectQueue();
      // 只有 AuthError（refreshToken 真正失效）才清除 token 并踢回登录页
      // 网络错误等情况不清除 token，避免误踢用户
      if (e is AuthError) {
        await _clearTokensAndFail(handler, err);
      } else {
        // 网络问题：直接把原始错误传递下去，不清除 token
        handler.next(err);
      }
    } finally {
      _isRefreshing = false;
    }
  }

  // -------------------------------------------------------------------------
  // 内部辅助方法
  // -------------------------------------------------------------------------

  /// 调用 /auth/refresh 换取新 Token，并写入 SecureStorage
  Future<void> _refreshToken() async {
    final spaceId = await _storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId == null) throw const AuthError('NO_ACTIVE_SPACE');

    final refreshToken = await _storage.readRefreshToken(spaceId);
    if (refreshToken == null) throw const AuthError('NO_REFRESH_TOKEN');

    // 使用独立 Dio 实例（不带拦截器）避免循环；继承 adapter 以支持测试注入
    final refreshDio = Dio(
      BaseOptions(
        baseUrl: _dio.options.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    )..httpClientAdapter = _dio.httpClientAdapter;

    Response<Map<String, dynamic>> response;
    try {
      response = await refreshDio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'_isRetry': true}),
      );
    } on DioException catch (e) {
      // 只有服务端明确返回 401/403 才认为 refreshToken 失效
      // 网络超时、连接失败等不清除 token，避免误踢用户
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        // 降级：尝试用 platformToken 重新换取租户 token pair
        await _fallbackWithPlatformToken(spaceId);
        return; // 降级成功，正常返回
      }
      // 网络问题：抛出普通异常，不触发 onAuthFailed
      throw Exception('网络错误，刷新 token 失败');
    }

    final body = response.data;
    if (body == null) throw const AuthError('REFRESH_EMPTY_RESPONSE');

    final newAccessToken = body['data']?['accessToken'] as String?;
    final newRefreshToken = body['data']?['refreshToken'] as String?;

    if (newAccessToken == null || newRefreshToken == null) {
      throw const AuthError('REFRESH_INVALID_RESPONSE');
    }

    await _storage.writeTokenPair(
      spaceId: spaceId,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    );

    // 同步更新内存中的 token，确保后续请求立即使用新 token
    GlobalTokenHolder.instance.accessToken = newAccessToken;
    // 通知 authProvider 更新内存中的 currentSpace.accessToken
    onTenantTokenRefreshed?.call(spaceId, newAccessToken);
  }

  /// 使用 platformToken 调用 selectTenant 降级换取新的租户 token pair
  ///
  /// 当 refreshToken 失效（401/403）时调用此方法作为降级路径。
  /// 成功后写入 SecureStorage 和 GlobalTokenHolder，调用方正常返回。
  /// 失败时抛 AuthError，触发登出流程。
  Future<void> _fallbackWithPlatformToken(String spaceId) async {
    final platformToken =
        await _storage.read(SecureStorageService.platformTokenKey);
    if (platformToken == null || platformToken.isEmpty) {
      throw const AuthError('NO_PLATFORM_TOKEN');
    }

    final fallbackDio = Dio(
      BaseOptions(
        baseUrl: _dio.options.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    )..httpClientAdapter = _dio.httpClientAdapter;

    try {
      final String endpoint;
      final Map<String, dynamic> requestData;

      if (spaceId == 'personal') {
        // 个人空间用 select-personal-space，不需要 tenantId
        endpoint = '/api/platform/v1/auth/select-personal-space';
        requestData = {};
      } else {
        // 租户空间用 select-tenant
        endpoint = '/api/platform/v1/auth/select-tenant';
        requestData = {'tenantId': spaceId};
      }

      final response = await fallbackDio.post<Map<String, dynamic>>(
        endpoint,
        data: requestData.isEmpty ? null : requestData,
        options: Options(
          headers: {'Authorization': 'Bearer $platformToken'},
          extra: {'_isRetry': true},
        ),
      );

      final body = response.data;
      final newAccessToken = body?['data']?['accessToken'] as String?;
      final newRefreshToken = body?['data']?['refreshToken'] as String?;

      if (newAccessToken == null || newRefreshToken == null) {
        throw const AuthError('PLATFORM_TOKEN_EXPIRED');
      }

      await _storage.writeTokenPair(
        spaceId: spaceId,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );
      GlobalTokenHolder.instance.accessToken = newAccessToken;
      // 通知 authProvider 更新内存中的 currentSpace.accessToken
      onTenantTokenRefreshed?.call(spaceId, newAccessToken);
    } catch (e) {
      if (e is AuthError) rethrow;
      throw const AuthError('PLATFORM_TOKEN_EXPIRED');
    }
  }

  /// 调用 /api/platform/v1/auth/refresh-platform-token 刷新 platformToken
  Future<void> _refreshPlatformToken() async {
    final platformToken =
        await _storage.read(SecureStorageService.platformTokenKey);
    if (platformToken == null) throw const AuthError('NO_PLATFORM_TOKEN');

    // 使用独立 Dio 实例（不带拦截器）避免循环；继承 adapter 以支持测试注入
    final refreshDio = Dio(
      BaseOptions(
        baseUrl: _dio.options.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    )..httpClientAdapter = _dio.httpClientAdapter;
    final response = await refreshDio.post<Map<String, dynamic>>(
      '/api/platform/v1/auth/refresh-platform-token',
      options: Options(
        headers: {'Authorization': 'Bearer $platformToken'},
        extra: {'_isRetry': true},
      ),
    );

    final body = response.data;
    if (body == null) throw const AuthError('REFRESH_EMPTY_RESPONSE');

    final newPlatformToken = body['data']?['platformToken'] as String?;

    if (newPlatformToken == null) {
      throw const AuthError('REFRESH_INVALID_RESPONSE');
    }

    await _storage.write(
        SecureStorageService.platformTokenKey, newPlatformToken);
    // 通知 authProvider 更新内存中的 platformToken
    onPlatformTokenRefreshed?.call(newPlatformToken);
  }

  /// 重放原始请求（注入新 Token）
  Future<Response<dynamic>> _retry(RequestOptions options) async {
    // 判断是平台级 API 还是租户级 API
    final isPlatformApi = options.path.startsWith('/api/platform/v1/');

    String? token;
    if (isPlatformApi) {
      // 平台级 API：使用 platformToken
      token = await _storage.read(SecureStorageService.platformTokenKey);
    } else {
      // 租户级 API：使用 accessToken
      final spaceId =
          await _storage.read(SecureStorageService.activeSpaceIdKey);
      if (spaceId != null) {
        token = await _storage.readAccessToken(spaceId);
      }
    }

    final retryOptions = Options(
      method: options.method,
      headers: {
        ...options.headers,
        if (token != null) 'Authorization': 'Bearer $token',
      },
      extra: {...options.extra, '_isRetry': true},
      contentType: options.contentType,
      responseType: options.responseType,
    );

    return _dio.request<dynamic>(
      options.path,
      data: options.data,
      queryParameters: options.queryParameters,
      options: retryOptions,
    );
  }

  /// 刷新成功后，重放队列中所有等待的请求
  void _resolveQueue() {
    for (final pending in _pendingQueue) {
      _retry(pending.options).then(
        (response) => pending.completer.complete(response),
        onError: (e) => pending.completer.completeError(e),
      );
    }
    _pendingQueue.clear();
  }

  /// 刷新失败后，拒绝队列中所有等待的请求
  void _rejectQueue() {
    for (final pending in _pendingQueue) {
      pending.completer.completeError(
        const AuthError('TOKEN_REFRESH_FAILED'),
      );
    }
    _pendingQueue.clear();
  }

  /// 清除当前空间 Token 并将错误传递给 handler
  Future<void> _clearTokensAndFail(
    ErrorInterceptorHandler handler,
    DioException original,
  ) async {
    final spaceId = await _storage.read(SecureStorageService.activeSpaceIdKey);
    if (spaceId != null) {
      await _storage.clearTokens(spaceId);
    }
    // 通知 app 认证失败，触发重新登录
    onAuthFailed?.call();
    handler.next(
      DioException(
        requestOptions: original.requestOptions,
        error: const AuthError('AUTH_INVALID_TOKEN'),
        type: DioExceptionType.badResponse,
        response: original.response,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 内部数据结构
// ---------------------------------------------------------------------------

class _PendingRequest {
  final RequestOptions options;
  final Completer<Response<dynamic>> completer;

  const _PendingRequest({required this.options, required this.completer});
}

// ---------------------------------------------------------------------------
// App Log Interceptor — 打印完整请求和响应，方便后端排查
// ---------------------------------------------------------------------------

class _AppLogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.extra['skipDiagnosticsLog'] == true) {
      handler.next(options);
      return;
    }
    final traceId = _ensureClientTrace(options);
    final buf = StringBuffer();
    buf.writeln('┌─── HTTP Request ───────────────────────────────────');
    buf.writeln('│ ${options.method} ${options.uri}');
    buf.writeln('│ Headers:');
    options.headers.forEach((k, v) {
      // 脱敏 Authorization
      final val =
          k.toLowerCase() == 'authorization' ? _maskAuthorization(v) : v;
      buf.writeln('│   $k: $val');
    });
    if (options.queryParameters.isNotEmpty) {
      buf.writeln('│ Query: ${options.queryParameters}');
    }
    if (options.data != null) {
      buf.writeln('│ Request Body:');
      if (options.data is FormData) {
        final fd = options.data as FormData;
        buf.writeln(
            '│   [FormData] fields: ${fd.fields.map((e) => e.key).toList()}, files: ${fd.files.map((e) => '${e.key}(${e.value.filename})').toList()}');
      } else {
        buf.writeln('│   ${options.data}');
      }
    } else {
      buf.writeln('│ Request Body: (empty)');
    }
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.debug('http.request', buf.toString(), context: {
      'method': options.method,
      'uri': options.uri.toString(),
      'clientTraceId': traceId,
    });
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (response.requestOptions.extra['skipDiagnosticsLog'] == true) {
      handler.next(response);
      return;
    }
    final buf = StringBuffer();
    buf.writeln('┌─── HTTP Response ──────────────────────────────────');
    buf.writeln(
        '│ ${response.requestOptions.method} ${response.requestOptions.uri}');
    buf.writeln('│ Status: ${response.statusCode}');
    buf.writeln('│ Response Body:');
    buf.writeln('│   ${response.data}');
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.debug('http.response', buf.toString(), context: {
      'method': response.requestOptions.method,
      'uri': response.requestOptions.uri.toString(),
      'statusCode': response.statusCode,
      'requestId': _responseRequestId(response.data),
      'clientTraceId': response.requestOptions.extra['clientTraceId'],
    });
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.requestOptions.extra['skipDiagnosticsLog'] == true) {
      handler.next(err);
      return;
    }
    final responseData = err.response?.data;
    final isExpectedTenantMemberForbidden = err.response?.statusCode == 403 &&
        responseData is Map<String, dynamic> &&
        responseData['code'] == 'TENANT_MEMBER_LIST_FORBIDDEN';
    final buf = StringBuffer();
    buf.writeln(isExpectedTenantMemberForbidden
        ? '┌─── HTTP Notice ────────────────────────────────────'
        : '┌─── HTTP Error ─────────────────────────────────────');
    buf.writeln('│ ${err.requestOptions.method} ${err.requestOptions.uri}');
    buf.writeln('│ Status: ${err.response?.statusCode}');
    if (isExpectedTenantMemberForbidden) {
      buf.writeln(
          '│ Notice: customer account is not allowed to list tenant members');
    } else {
      buf.writeln('│ Error: ${err.message}');
    }
    if (responseData != null) {
      buf.writeln('│ Response Body:');
      buf.writeln('│   $responseData');
    }
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.record(
      isExpectedTenantMemberForbidden
          ? AppDiagnosticLevel.info
          : AppDiagnosticLevel.error,
      isExpectedTenantMemberForbidden ? 'http.notice' : 'http.error',
      buf.toString(),
      context: {
        'method': err.requestOptions.method,
        'uri': err.requestOptions.uri.toString(),
        'statusCode': err.response?.statusCode,
        'requestId': _responseRequestId(responseData),
        'clientTraceId': err.requestOptions.extra['clientTraceId'],
      },
    );
    handler.next(err);
  }

  String _ensureClientTrace(RequestOptions options) {
    final existing = options.extra['clientTraceId']?.toString();
    final traceId = existing?.isNotEmpty == true
        ? existing!
        : AppDiagnostics.instance.nextTraceId('http');
    options.extra['clientTraceId'] = traceId;
    options.headers.putIfAbsent('X-Client-Trace-Id', () => traceId);
    return traceId;
  }

  String? _responseRequestId(Object? data) {
    if (data is Map<String, dynamic>) return data['requestId'] as String?;
    return null;
  }

  String _maskAuthorization(Object? value) {
    final raw = value?.toString() ?? '';
    if (raw.length <= 20) return '$raw...';
    return '${raw.substring(0, 20)}...';
  }
}
