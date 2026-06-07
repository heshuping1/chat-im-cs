import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/http_client.dart';

class MediaDownloadService {
  final Dio _dio;

  const MediaDownloadService(this._dio);

  Future<void> download({
    required String remoteUrl,
    required String partPath,
    ProgressCallback? onReceiveProgress,
  }) async {
    await _dio.download(
      _resolveMediaUrl(remoteUrl),
      partPath,
      options: Options(responseType: ResponseType.bytes),
      onReceiveProgress: onReceiveProgress,
    );
  }

  String failureReason(Object error) {
    if (error is DioException) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) return 'unauthorized';
      if (status == 404) return 'not_found';
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout) {
        return 'network';
      }
      return status == null ? error.type.name : 'http_$status';
    }
    return error.runtimeType.toString();
  }

  String _resolveMediaUrl(String url) {
    final parsed = Uri.tryParse(url);
    if (parsed != null && parsed.hasScheme) return url;
    return Uri.parse(HttpClient.baseUrl).resolve(url).toString();
  }
}
