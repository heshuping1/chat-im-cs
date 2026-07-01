import 'package:dio/dio.dart';
import 'package:lpp_mobile/features/app_update/data/app_update_dto.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';

class AppUpdateRemoteDataSource {
  AppUpdateRemoteDataSource({
    required Dio dio,
    required String Function() baseUrl,
  })  : _dio = dio,
        _baseUrl = baseUrl;

  final Dio _dio;
  final String Function() _baseUrl;

  Future<AppReleaseUpdate> fetchLatest({
    required String appKey,
    required String platform,
    required int versionCode,
  }) async {
    _dio.options.baseUrl = _baseUrl();
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/client/v1/app-releases/latest',
      queryParameters: {
        'appKey': appKey,
        'platform': platform,
        'versionCode': versionCode,
      },
    );
    final body = response.data;
    if (body == null) {
      throw const AppUpdateDtoException('更新服务返回为空');
    }
    return AppReleaseUpdateDto.fromEnvelope(body).toDomain();
  }
}
