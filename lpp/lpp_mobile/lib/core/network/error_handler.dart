import 'package:dio/dio.dart';

// ---------------------------------------------------------------------------
// AppError sealed class 层级
// ---------------------------------------------------------------------------

sealed class AppError {
  const AppError();
}

/// 网络层错误（无连接、超时、DNS 失败等）
class NetworkError extends AppError {
  final String message;
  const NetworkError(this.message);

  @override
  String toString() => 'NetworkError($message)';
}

/// 服务端业务错误（HTTP 成功但 code != OK）
class ServerError extends AppError {
  final String code;
  final String message;
  final int? statusCode;
  final String? requestId;
  const ServerError({
    required this.code,
    required this.message,
    this.statusCode,
    this.requestId,
  });

  @override
  String toString() {
    final status = statusCode == null ? '' : ', HTTP $statusCode';
    final request = requestId == null ? '' : ', requestId=$requestId';
    return 'ServerError($code$status$request: $message)';
  }
}

/// 认证错误（需要重新登录或刷新 Token）
class AuthError extends AppError {
  final String code;
  const AuthError(this.code);

  @override
  String toString() => 'AuthError($code)';
}

// ---------------------------------------------------------------------------
// 错误码常量
// ---------------------------------------------------------------------------

abstract final class _ErrorCodes {
  // 认证类
  static const authInvalidCredentials = 'AUTH_INVALID_CREDENTIALS';
  static const authInvalidToken = 'AUTH_INVALID_TOKEN';
  static const authCaptchaRequired = 'AUTH_CAPTCHA_REQUIRED';
  static const authVerificationRequired = 'AUTH_VERIFICATION_REQUIRED';

  // 验证码类
  static const verifyTooFrequent = 'VERIFY_TOO_FREQUENT';
  static const verifyHourlyLimit = 'VERIFY_HOURLY_LIMIT';
  static const verifyDailyLimit = 'VERIFY_DAILY_LIMIT';

  // 租户类
  static const tenantNotMember = 'TENANT_NOT_MEMBER';
  static const tenantSuspended = 'TENANT_SUSPENDED';

  // 消息类
  static const msgGroupMuted = 'MSG_GROUP_MUTED';
  static const msgMemberMuted = 'MSG_MEMBER_MUTED';
  static const msgDuplicateClientMsgId = 'MSG_DUPLICATE_CLIENT_MSG_ID';

  // 限流
  static const rateLimited = 'RATE_LIMITED';
}

// ---------------------------------------------------------------------------
// ErrorHandler
// ---------------------------------------------------------------------------

class ErrorHandler {
  ErrorHandler._();

  /// 将 DioException 转换为 AppError
  static AppError fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkError('请求超时，请检查网络连接');

      case DioExceptionType.connectionError:
        return const NetworkError('无法连接到服务器，请检查网络');

      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 401) {
          return const AuthError(_ErrorCodes.authInvalidToken);
        }
        final body = e.response?.data;
        if (body is Map<String, dynamic>) {
          final code = body['code'] as String? ?? 'SERVER_ERROR';
          final message = body['message'] as String? ?? '服务器错误';
          final requestId = body['requestId'] as String?;
          return fromServerCode(
            code,
            message,
            statusCode: statusCode,
            requestId: requestId,
          );
        }
        return NetworkError('服务器返回错误 (HTTP $statusCode)');

      case DioExceptionType.cancel:
        return const NetworkError('请求已取消');

      case DioExceptionType.unknown:
      default:
        return NetworkError(e.message ?? '未知网络错误');
    }
  }

  /// 将服务端业务错误码映射为 AppError
  ///
  /// 特殊规则：
  /// - [_ErrorCodes.msgDuplicateClientMsgId] 视为成功（幂等），调用方不应将其当作错误
  ///   但此处仍返回 ServerError，由上层（SendMessageUseCase）捕获并忽略。
  static AppError fromServerCode(
    String code,
    String message, {
    int? statusCode,
    String? requestId,
  }) {
    ServerError serverError() => ServerError(
          code: code,
          message: message,
          statusCode: statusCode,
          requestId: requestId,
        );

    switch (code) {
      // 认证错误 → AuthError（触发 Token 刷新或跳转登录）
      case _ErrorCodes.authInvalidCredentials:
      case _ErrorCodes.authInvalidToken:
        return AuthError(code);

      // 需要图形验证码 → ServerError（展示验证码弹窗）
      case _ErrorCodes.authCaptchaRequired:
        return serverError();

      // 需要短信/邮件验证码
      case _ErrorCodes.authVerificationRequired:
        return serverError();

      // 验证码发送过于频繁 → ServerError（禁用发送按钮，显示冷却提示）
      case _ErrorCodes.verifyTooFrequent:
      case _ErrorCodes.verifyHourlyLimit:
      case _ErrorCodes.verifyDailyLimit:
        return serverError();

      // 租户权限 → ServerError
      case _ErrorCodes.tenantNotMember:
      case _ErrorCodes.tenantSuspended:
        return serverError();

      // 消息禁言 → ServerError
      case _ErrorCodes.msgGroupMuted:
      case _ErrorCodes.msgMemberMuted:
        return serverError();

      // 重复 clientMsgId → 视为成功（幂等），返回特殊 ServerError 供上层识别
      case _ErrorCodes.msgDuplicateClientMsgId:
        return serverError();

      // 限流 → ServerError
      case _ErrorCodes.rateLimited:
        return serverError();

      // 其他未知错误码
      default:
        return serverError();
    }
  }

  /// 判断某个 ServerError 是否应视为幂等成功（重复消息 ID）
  static bool isDuplicateClientMsgId(AppError error) {
    return error is ServerError &&
        error.code == _ErrorCodes.msgDuplicateClientMsgId;
  }
}
