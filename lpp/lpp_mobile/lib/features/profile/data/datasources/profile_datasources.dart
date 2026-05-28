import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/network/api_response.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/profile/data/models/profile_models.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';

abstract class ProfileRemoteDataSource {
  Future<UserProfile> getMyProfile();
  Future<UserProfile> updateProfile(UpdateProfileRequest request);
  Future<void> updateZtId(String newZtId);
  Future<UserProfile> getUserProfile(String userId);
  Future<void> changePassword(
      {required String oldPassword, required String newPassword});
  Future<ProfilePrivacySettings> getPrivacySettings();
  Future<ProfilePrivacySettings> updatePrivacySettings(
      ProfilePrivacySettings settings);
  Future<List<UserAddress>> getAddresses();
  Future<UserAddress> createAddress(AddressRequest request);
  Future<void> updateAddress(String addressId, AddressRequest request);
  Future<void> deleteAddress(String addressId);
  Future<FeedbackResult> submitFeedback(FeedbackRequest request);
}

class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  final Dio _dio;

  ProfileRemoteDataSourceImpl(this._dio);

  @override
  Future<UserProfile> getMyProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/profile/me',
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => UserProfileModel.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<UserProfile> updateProfile(UpdateProfileRequest request) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/profile/me',
        data: request.toJson(),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => UserProfileModel.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> updateZtId(String newZtId) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/profile/me/lpp-id',
        data: {'lppId': newZtId},
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<UserProfile> getUserProfile(String userId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/users/$userId/profile',
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => UserProfileModel.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/auth/change-password',
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<ProfilePrivacySettings> getPrivacySettings() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/profile/me/privacy',
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => ProfilePrivacySettings.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<ProfilePrivacySettings> updatePrivacySettings(
      ProfilePrivacySettings settings) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/profile/me/privacy',
        data: settings.toJson(),
      );
      final data = response.data?['data'];
      if (data is Map<String, dynamic>) {
        return ProfilePrivacySettings.fromJson(data);
      }
      return settings;
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<List<UserAddress>> getAddresses() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/client/v1/profile/me/addresses',
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => (json as List<dynamic>)
            .map((e) => UserAddress.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<UserAddress> createAddress(AddressRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/profile/me/addresses',
        data: request.toJson(),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => UserAddress.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> updateAddress(String addressId, AddressRequest request) async {
    try {
      await _dio.put<Map<String, dynamic>>(
        '/api/client/v1/profile/me/addresses/$addressId',
        data: request.toJson(),
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<void> deleteAddress(String addressId) async {
    try {
      await _dio.delete<Map<String, dynamic>>(
        '/api/client/v1/profile/me/addresses/$addressId',
      );
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }

  @override
  Future<FeedbackResult> submitFeedback(FeedbackRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/client/v1/feedback',
        data: request.toJson(),
      );
      final apiResponse = ApiResponse.fromJson(
        response.data!,
        (json) => FeedbackResult.fromJson(json as Map<String, dynamic>),
      );
      return apiResponse.getDataOrThrow();
    } on DioException catch (e) {
      throw ErrorHandler.fromDioException(e);
    }
  }
}
