import 'dart:async';

import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/admin/admin_access.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/network/site_line_manager.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

class AdminHttpClient {
  static String get adminBaseUrl => SiteLineManager.instance.adminBaseUrl;

  late final Dio dio;

  AdminHttpClient({
    required SecureStorageService storage,
    required SpaceContext? Function() spaceGetter,
  }) {
    dio = Dio(
      BaseOptions(
        baseUrl: AdminHttpClient.adminBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      AdminTokenInterceptor(
        dio: dio,
        storage: storage,
        spaceGetter: spaceGetter,
      ),
    );
    dio.interceptors.add(_AdminLogInterceptor());
    SiteLineManager.instance.addListener(() {
      dio.options.baseUrl = AdminHttpClient.adminBaseUrl;
    });
  }
}

class AdminTokenInterceptor extends Interceptor {
  final Dio dio;
  final SecureStorageService storage;
  final SpaceContext? Function() spaceGetter;

  bool _issuing = false;
  Completer<String>? _issueCompleter;

  AdminTokenInterceptor({
    required this.dio,
    required this.storage,
    required this.spaceGetter,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!options.headers.containsKey('Authorization')) {
      try {
        final token = await _adminAccessToken();
        options.headers['Authorization'] = 'Bearer $token';
      } catch (error) {
        handler.reject(
          DioException(
            requestOptions: options,
            error: error,
            type: DioExceptionType.unknown,
          ),
        );
        return;
      }
    }
    if (!options.headers.containsKey('X-Device-Id')) {
      options.headers['X-Device-Id'] = await storage.stableDeviceId();
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401 ||
        err.requestOptions.extra['_adminRetry'] == true) {
      handler.next(err);
      return;
    }

    try {
      final space = _requireAdminSpace();
      final token = await _refreshAdminToken(space.spaceId);
      final retryOptions = err.requestOptions;
      retryOptions.extra['_adminRetry'] = true;
      retryOptions.headers['Authorization'] = 'Bearer $token';
      final response = await dio.fetch<dynamic>(retryOptions);
      handler.resolve(response);
    } catch (_) {
      handler.next(err);
    }
  }

  Future<String> _adminAccessToken() async {
    final space = _requireAdminSpace();
    final cached = await storage.readAdminAccessToken(space.spaceId);
    if (cached != null && cached.isNotEmpty) return cached;
    return _issueAdminToken(space);
  }

  SpaceContext _requireAdminSpace() {
    final space = spaceGetter();
    if (space == null || !space.isEmployee || space.spaceId.isEmpty) {
      throw StateError('当前角色不能调用管理后台接口');
    }
    return space;
  }

  Future<String> _issueAdminToken(SpaceContext space) async {
    if (_issuing) return _issueCompleter!.future;
    _issuing = true;
    _issueCompleter = Completer<String>();

    try {
      final platformToken =
          await storage.read(SecureStorageService.platformTokenKey);
      if (platformToken == null || platformToken.isEmpty) {
        throw StateError('缺少平台登录凭证，无法换取管理后台 Token');
      }

      final plainDio = _plainDio();
      await _ensureAdminTenantAllowed(
        plainDio: plainDio,
        platformToken: platformToken,
        tenantId: space.spaceId,
      );
      final deviceId = await storage.stableDeviceId();
      final tokenResp = await plainDio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/admin-token',
        data: {'tenantId': space.spaceId},
        options: Options(headers: {
          'Authorization': 'Bearer $platformToken',
          'X-Device-Id': deviceId,
        }),
      );
      final data = tokenResp.data?['data'] as Map<String, dynamic>? ?? {};
      final accessToken = data['accessToken'] as String?;
      if (accessToken == null || accessToken.isEmpty) {
        throw StateError('管理后台 Token 响应缺少 accessToken 字段');
      }
      await storage.clearOtherAdminTokens(space.spaceId);
      await storage.write(
        SecureStorageService.adminAccessTokenKey(space.spaceId),
        accessToken,
      );
      final refreshToken = data['refreshToken'] as String?;
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await storage.write(
          SecureStorageService.adminRefreshTokenKey(space.spaceId),
          refreshToken,
        );
      } else {
        await storage.delete(
          SecureStorageService.adminRefreshTokenKey(space.spaceId),
        );
      }
      await _writeAdminPermissionCache(space.spaceId, data);
      _issueCompleter!.complete(accessToken);
      return accessToken;
    } catch (e, st) {
      _issueCompleter!.future.catchError((_) => '');
      _issueCompleter!.completeError(e, st);
      rethrow;
    } finally {
      _issuing = false;
      _issueCompleter = null;
    }
  }

  Future<String> _refreshAdminToken(String spaceId) async {
    final refreshToken = await storage.readAdminRefreshToken(spaceId);
    if (refreshToken == null || refreshToken.isEmpty) {
      await storage.clearAdminTokens(spaceId);
      return _issueAdminToken(_requireAdminSpace());
    }

    final refreshDio = _plainDio();
    final deviceId = await storage.stableDeviceId();
    try {
      final response = await refreshDio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {
            'X-Tenant-Id': spaceId,
            'X-Device-Id': deviceId,
          },
          extra: {'_adminRetry': true},
        ),
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? {};
      final accessToken = data['accessToken'] as String?;
      final newRefreshToken = data['refreshToken'] as String?;
      if (accessToken == null ||
          accessToken.isEmpty ||
          newRefreshToken == null ||
          newRefreshToken.isEmpty) {
        throw StateError('管理后台刷新 Token 响应缺少 accessToken/refreshToken');
      }
      await storage.writeAdminTokenPair(
        spaceId: spaceId,
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      );
      return accessToken;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        await storage.clearAdminTokens(spaceId);
        return _issueAdminToken(_requireAdminSpace());
      }
      rethrow;
    }
  }

  Future<void> _ensureAdminTenantAllowed({
    required Dio plainDio,
    required String platformToken,
    required String tenantId,
  }) async {
    final deviceId = await storage.stableDeviceId();
    final response = await plainDio.get<Map<String, dynamic>>(
      '/api/platform/v1/my/admin-tenants',
      options: Options(headers: {
        'Authorization': 'Bearer $platformToken',
        'X-Device-Id': deviceId,
      }),
    );
    final raw = response.data?['data'] as List<dynamic>? ?? const [];
    final tenants = raw
        .whereType<Map>()
        .map(
            (e) => AdminAccessibleTenant.fromJson(Map<String, dynamic>.from(e)))
        .where((tenant) => tenant.canAccess)
        .toList(growable: false);
    final matched = tenants.where(
      (tenant) => tenant.tenantId == tenantId && tenant.hasAdminApiTokenAccess,
    );
    if (matched.isEmpty) {
      throw StateError('当前账号没有该企业的管理后台接口权限');
    }
  }

  Future<void> _writeAdminPermissionCache(
    String spaceId,
    Map<String, dynamic> data,
  ) async {
    final roleCodes = (data['roleCodes'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .where((code) => code.trim().isNotEmpty)
        .join(',');
    final permissionCodes =
        (data['permissionCodes'] as List<dynamic>? ?? const [])
            .whereType<String>()
            .where((code) => code.trim().isNotEmpty)
            .join(',');
    final isPlatformAdministrator =
        data['isPlatformAdministrator'] == true ? 'true' : 'false';
    await storage.write(
        SecureStorageService.adminRoleCodesKey(spaceId), roleCodes);
    await storage.write(
        SecureStorageService.adminPermissionCodesKey(spaceId), permissionCodes);
    await storage.write(
      SecureStorageService.adminIsPlatformAdministratorKey(spaceId),
      isPlatformAdministrator,
    );
  }

  Dio _plainDio() {
    return Dio(
      BaseOptions(
        baseUrl: HttpClient.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    )..httpClientAdapter = dio.httpClientAdapter;
  }
}

class _AdminLogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final traceId = _ensureClientTrace(options);
    final buf = StringBuffer();
    buf.writeln('┌─── Admin HTTP Request ─────────────────────────────');
    buf.writeln('│ ${options.method} ${options.uri}');
    if (options.queryParameters.isNotEmpty) {
      buf.writeln('│ Query: ${options.queryParameters}');
    }
    if (options.data != null) {
      buf.writeln(
        '│ Request Body: ${options.data is FormData ? '[FormData]' : options.data}',
      );
    } else {
      buf.writeln('│ Request Body: (empty)');
    }
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.debug(
      'admin_http.request',
      buf.toString(),
      context: {
        'method': options.method,
        'uri': options.uri.toString(),
        'clientTraceId': traceId,
      },
    );
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final data = response.data;
    final buf = StringBuffer();
    buf.writeln('┌─── Admin HTTP Response ────────────────────────────');
    buf.writeln(
      '│ ${response.requestOptions.method} ${response.requestOptions.uri}',
    );
    buf.writeln('│ Status: ${response.statusCode}');
    buf.writeln('│ Response Body:');
    buf.writeln('│   $data');
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.debug(
      'admin_http.response',
      buf.toString(),
      context: {
        'method': response.requestOptions.method,
        'uri': response.requestOptions.uri.toString(),
        'statusCode': response.statusCode,
        'requestId': _responseRequestId(data),
        'clientTraceId': response.requestOptions.extra['clientTraceId'],
      },
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final responseData = err.response?.data;
    final buf = StringBuffer();
    buf.writeln('┌─── Admin HTTP Error ───────────────────────────────');
    buf.writeln('│ ${err.requestOptions.method} ${err.requestOptions.uri}');
    buf.writeln('│ Status: ${err.response?.statusCode}');
    buf.writeln('│ Error: ${err.message}');
    if (responseData != null) {
      buf.writeln('│ Response Body:');
      buf.writeln('│   $responseData');
    }
    buf.writeln('└────────────────────────────────────────────────────');
    AppDiagnostics.instance.error(
      'admin_http.error',
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
        : AppDiagnostics.instance.nextTraceId('admin-http');
    options.extra['clientTraceId'] = traceId;
    options.headers.putIfAbsent('X-Client-Trace-Id', () => traceId);
    return traceId;
  }

  String? _responseRequestId(Object? data) {
    if (data is Map<String, dynamic>) return data['requestId'] as String?;
    if (data is Map) return data['requestId']?.toString();
    return null;
  }
}
