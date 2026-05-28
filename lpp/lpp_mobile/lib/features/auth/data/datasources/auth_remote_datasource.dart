import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/api_response.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/platform/app_platform.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';

abstract class AuthRemoteDataSource {
  Future<PlatformLoginResult> login(LoginRequest request);
  Future<PlatformLoginResult> loginByCode(LoginRequest request);
  Future<void> sendVerificationCode({
    required String identifier,
    required String channel,
    required String purpose,
  });
  Future<TenantAuthResult> selectTenant(String tenantId, String platformToken);
  Future<TenantAuthResult> selectPersonalSpace(String platformToken);
  Future<TenantAuthResult> refreshToken(String refreshToken);
  Future<TenantAuthResult> tenantLogin(LoginRequest request);

  /// GET /api/platform/v1/my/tenants
  Future<List<TenantSummary>> getMyTenants(String platformToken);

  /// POST /api/platform/v1/auth/refresh-platform-token
  Future<PlatformLoginResult> refreshPlatformToken(String platformToken);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSourceImpl(this._dio);

  @override
  Future<PlatformLoginResult> login(LoginRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/login',
        data: {
          'identifier': request.identifier,
          'password': request.password,
          'loginType': request.loginType,
          if (request.captchaToken != null)
            'captchaToken': request.captchaToken,
          if (request.captchaAnswer != null)
            'captchaAnswer': request.captchaAnswer,
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => _parsePlatformLoginResult(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<PlatformLoginResult> loginByCode(LoginRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/login-by-code',
        data: {
          'identifier': request.identifier,
          'verificationCode': request.verificationCode,
          'loginType': request.loginType,
          if (request.captchaToken != null)
            'captchaToken': request.captchaToken,
          if (request.captchaAnswer != null)
            'captchaAnswer': request.captchaAnswer,
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => _parsePlatformLoginResult(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> sendVerificationCode({
    required String identifier,
    required String channel,
    required String purpose,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/verification/send',
        data: {
          'identifier': identifier,
          'channel': channel,
          'purpose': purpose,
        },
      );
      final apiResponse = ApiResponse<void>.fromJson(
        response.data!,
        null,
      );
      if (!apiResponse.isSuccess) {
        throw ErrorHandler.fromServerCode(
            apiResponse.code, apiResponse.message);
      }
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<TenantAuthResult> selectPersonalSpace(String platformToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/select-personal-space',
        options: Options(
          headers: {'Authorization': 'Bearer $platformToken'},
        ),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) =>
            _parseTenantAuthResult(json as Map<String, dynamic>, 'personal'),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<TenantAuthResult> selectTenant(
      String tenantId, String platformToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/select-tenant',
        data: {'tenantId': tenantId},
        options: Options(
          headers: {'Authorization': 'Bearer $platformToken'},
        ),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) =>
            _parseTenantAuthResult(json as Map<String, dynamic>, tenantId),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<TenantAuthResult> refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) =>
            _parseTenantAuthResultFromRefresh(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  // ---------------------------------------------------------------------------
  // Parsers
  // ---------------------------------------------------------------------------

  PlatformLoginResult _parsePlatformLoginResult(Map<String, dynamic> json) {
    final tenantsList = (json['tenants'] as List<dynamic>? ?? [])
        .map((t) => _parseTenantSummary(t as Map<String, dynamic>))
        .toList();

    // 解析 spaceContext（对照 API 文档 PlatformSpaceContextDto）
    final spaceCtx = json['spaceContext'] as Map<String, dynamic>?;
    final spaceType = spaceCtx?['spaceType'] as int? ?? 0;
    final suggestedTenantId = spaceCtx?['tenantId'] as String?;

    return PlatformLoginResult(
      platformToken: json['platformToken'] as String,
      platformUserId: json['platformUserId'] as String,
      lppId: json['lppId'] as String?,
      displayName: json['displayName'] as String?,
      userType: json['userType'] as int?,
      expiresIn: json['expiresIn'] as int? ?? 3600,
      tenants: tenantsList,
      spaceType: spaceType,
      suggestedTenantId: suggestedTenantId,
      pendingApproval: json['pendingApproval'] as bool? ?? false,
      accountStatus: json['accountStatus'] as String? ?? 'active',
    );
  }

  TenantSummary _parseTenantSummary(Map<String, dynamic> json) {
    return TenantSummary(
      tenantId: json['tenantId'] as String,
      tenantName: json['tenantName'] as String,
      tenantCode: json['tenantCode'] as String?,
      logoUrl: (json['logoUrl'] as String?)?.isNotEmpty == true
          ? json['logoUrl'] as String
          : null,
      membershipRole: json['membershipRole'] as int? ?? 0,
    );
  }

  TenantAuthResult _parseTenantAuthResult(
      Map<String, dynamic> json, String fallbackTenantId) {
    // 优先用响应里的 tenantId（select-tenant 响应包含此字段）
    final tenantId = json['tenantId'] as String? ?? fallbackTenantId;
    final spaceCtx = json['spaceContext'] as Map<String, dynamic>?;
    return TenantAuthResult(
      tenantId: tenantId,
      userId: json['userId'] as String? ?? '',
      platformUserId: json['platformUserId'] as String?,
      lppId: json['lppId'] as String?,
      displayName: json['displayName'] as String?,
      userType: json['userType'] as int?,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: json['expiresIn'] as int? ?? 3600,
      spaceType: spaceCtx?['spaceType'] as int?,
    );
  }

  TenantAuthResult _parseTenantAuthResultFromRefresh(
      Map<String, dynamic> json) {
    return TenantAuthResult(
      tenantId: json['tenantId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      platformUserId: json['platformUserId'] as String?,
      lppId: json['lppId'] as String?,
      displayName: json['displayName'] as String?,
      userType: json['userType'] as int?,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: json['expiresIn'] as int? ?? 3600,
      spaceType:
          (json['spaceContext'] as Map<String, dynamic>?)?['spaceType'] as int?,
    );
  }

  @override
  Future<TenantAuthResult> tenantLogin(LoginRequest request) async {
    try {
      // ztId/login_name/lpp_id 租户登录需要显式租户上下文。
      // 服务端同时支持 header X-Tenant-Id、body.tenantId、body.tenantCode；
      // 未登录场景下 tenants/search 可能 401，所以必须保留原始 tenantCode 到 body。
      final rawTenant = request.tenantCode?.trim();
      String? headerTenantId;
      String? tenantIdForBody;
      String? tenantCodeForBody;
      if (rawTenant != null && rawTenant.isNotEmpty) {
        final isGuid = RegExp(
          r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        ).hasMatch(rawTenant);
        if (isGuid) {
          tenantIdForBody = rawTenant;
          headerTenantId = rawTenant;
        } else {
          tenantCodeForBody = rawTenant;
        }
        if (!isGuid) {
          // 是 tenantCode，搜索对应的 tenantId
          try {
            final searchResp = await _dio.get<Map<String, dynamic>>(
              '/api/platform/v1/tenants/search',
              queryParameters: {'keyword': rawTenant},
            );
            final list = searchResp.data?['data'] as List<dynamic>? ?? [];
            final match = list.firstWhere(
              (t) => (t as Map<String, dynamic>)['tenantCode'] == rawTenant,
              orElse: () => list.isNotEmpty ? list.first : null,
            );
            if (match != null) {
              tenantIdForBody =
                  (match as Map<String, dynamic>)['tenantId'] as String?;
              headerTenantId = tenantIdForBody;
            }
          } catch (_) {
            // 搜索失败，继续用原值
          }
        }
      }

      final extraHeaders = headerTenantId != null && headerTenantId.isNotEmpty
          ? {'X-Tenant-Id': headerTenantId}
          : <String, String>{};
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/login',
        options:
            extraHeaders.isNotEmpty ? Options(headers: extraHeaders) : null,
        data: {
          'loginName': request.identifier,
          'password': request.password,
          'loginType': request.loginType,
          'deviceType': _clientDeviceType(),
          if (tenantIdForBody != null && tenantIdForBody.isNotEmpty)
            'tenantId': tenantIdForBody,
          if (tenantCodeForBody != null && tenantCodeForBody.isNotEmpty)
            'tenantCode': tenantCodeForBody,
          if (request.captchaToken != null)
            'captchaToken': request.captchaToken,
          if (request.captchaAnswer != null)
            'captchaAnswer': request.captchaAnswer,
        },
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) =>
            _parseTenantAuthResultFromRefresh(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<TenantSummary>> getMyTenants(String platformToken) async {
    // 直接用主 Dio 实例，TokenInterceptor 会自动处理 platformToken 注入和刷新
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/platform/v1/my/tenants',
        options: Options(headers: {
          'Authorization': 'Bearer $platformToken',
        }),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final list = json as List<dynamic>;
          return list
              .map((t) => _parseTenantSummary(t as Map<String, dynamic>))
              .toList();
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<PlatformLoginResult> refreshPlatformToken(String platformToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/auth/refresh-platform-token',
        options: Options(headers: {'Authorization': 'Bearer $platformToken'}),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) {
          final j = json as Map<String, dynamic>;
          // refresh-platform-token 只返回 platformToken 相关字段，不含 tenants
          return PlatformLoginResult(
            platformToken: j['platformToken'] as String,
            platformUserId: j['platformUserId'] as String? ?? '',
            lppId: j['lppId'] as String?,
            displayName: j['displayName'] as String?,
            expiresIn: j['expiresIn'] as int? ?? 3600,
            tenants: const [],
            spaceType: 0,
          );
        },
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  static String _clientDeviceType() => AppPlatformInfo.clientDeviceType;
}
