import 'package:lpp_mobile/core/network/error_handler.dart';

/// 统一响应包装类，对应服务端 { code, message, requestId, data } 结构
class ApiResponse<T> {
  final String code;
  final String message;
  final String? requestId;
  final T? data;

  const ApiResponse({
    required this.code,
    required this.message,
    this.requestId,
    this.data,
  });

  /// 成功判断：code == 'OK'
  bool get isSuccess => code == 'OK';

  /// 从 JSON 构造，[fromData] 负责将 data 字段转换为具体类型 T
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json)? fromData,
  ) {
    return ApiResponse<T>(
      code: json['code'] as String? ?? '',
      message: json['message'] as String? ?? '',
      requestId: json['requestId'] as String?,
      data: json['data'] != null && fromData != null
          ? fromData(json['data'])
          : null,
    );
  }

  /// 将响应转换为 Result，成功返回 data，失败抛出 AppError
  T getDataOrThrow() {
    if (isSuccess) {
      if (data == null) {
        throw const ServerError(code: 'NULL_DATA', message: '响应数据为空');
      }
      return data as T;
    }
    throw ErrorHandler.fromServerCode(code, message, requestId: requestId);
  }
}
