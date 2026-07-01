import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/auth/domain/entities/auth_entities.dart';
import 'package:lpp_mobile/features/space/data/models/enterprise_join_models.dart';

class PlatformTenantDataSource {
  final Dio _dio;

  const PlatformTenantDataSource(this._dio);

  Future<List<JoinableTenant>> searchTenants({
    required String platformToken,
    String keyword = '',
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/platform/v1/tenants/search',
        queryParameters: {'keyword': keyword},
        options: _platformOptions(platformToken),
      );
      final list = _data(response) as List<dynamic>? ?? [];
      return list
          .map((e) => JoinableTenant.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<InvitationPreview> previewInvitation({
    String? platformToken,
    required String code,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/platform/v1/invitations/$code',
        options: _optionalPlatformOptions(platformToken),
      );
      return InvitationPreview.fromJson(
        _data(response) as Map<String, dynamic>? ?? const {},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<PlatformJoinResult> joinByCode({
    required String platformToken,
    required String tenantCode,
    String? message,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/tenants/join-by-code',
        data: {
          'tenantCode': tenantCode,
          if (message != null && message.trim().isNotEmpty)
            'message': message.trim(),
        },
        options: _platformOptions(platformToken),
      );
      return _parseJoinResult(response);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<PlatformJoinResult> submitJoinRequest({
    required String platformToken,
    required String tenantId,
    String? message,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/tenants/$tenantId/join-request',
        data: {'message': message?.trim() ?? ''},
        options: _platformOptions(platformToken),
      );
      return _parseJoinResult(response);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<PlatformJoinResult> acceptInvitation({
    required String platformToken,
    required String code,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/platform/v1/invitations/$code/accept',
        options: _platformOptions(platformToken),
      );
      return _parseJoinResult(response);
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<List<MyJoinRequest>> getMyJoinRequests({
    required String platformToken,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/platform/v1/my/join-requests',
        options: _platformOptions(platformToken),
      );
      final list = _data(response) as List<dynamic>? ?? [];
      return list
          .map((e) => MyJoinRequest.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Future<void> cancelJoinRequest({
    required String platformToken,
    required String requestId,
  }) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/platform/v1/my/join-requests/$requestId',
        options: _platformOptions(platformToken),
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  Options _platformOptions(String platformToken) {
    return Options(headers: {'Authorization': 'Bearer $platformToken'});
  }

  Options? _optionalPlatformOptions(String? platformToken) {
    final token = platformToken?.trim();
    if (token == null || token.isEmpty) return null;
    return _platformOptions(token);
  }

  Object? _data(Response<Map<String, dynamic>> response) {
    final body = response.data;
    if (body == null) return null;
    final code = body['code'] as String? ?? 'OK';
    if (code != 'OK') {
      throw ErrorHandler.fromServerCode(
        code,
        body['message'] as String? ?? '操作失败',
      );
    }
    return body['data'];
  }

  PlatformJoinResult _parseJoinResult(Response<Map<String, dynamic>> response) {
    final data = _data(response);
    if (data is Map<String, dynamic> && data['accessToken'] != null) {
      return PlatformJoinResult.joined(
        message: response.data?['message'] as String? ?? '已加入企业',
        tenantAuth: _parseTenantAuthResult(data),
      );
    }
    final map = data is Map<String, dynamic> ? data : const <String, dynamic>{};
    return PlatformJoinResult.pending(
      message: map['message'] as String? ??
          response.data?['message'] as String? ??
          '申请已提交，等待审批',
    );
  }

  TenantAuthResult _parseTenantAuthResult(Map<String, dynamic> json) {
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
}
