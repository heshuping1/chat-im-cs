import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';

abstract class ProfileRepository {
  /// GET /api/client/v1/profile/me
  Future<UserProfile> getMyProfile();

  /// PUT /api/client/v1/profile/me
  Future<UserProfile> updateProfile(UpdateProfileRequest request);

  /// PUT /api/client/v1/profile/me/lpp-id
  Future<void> updateZtId(String newZtId);

  /// GET /api/client/v1/users/{userId}/profile
  Future<UserProfile> getUserProfile(String userId);

  /// POST /api/client/v1/auth/change-password
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  });

  Future<ProfilePrivacySettings> getPrivacySettings();
  Future<ProfilePrivacySettings> updatePrivacySettings(
      ProfilePrivacySettings settings);
  Future<List<UserAddress>> getAddresses();
  Future<UserAddress> createAddress(AddressRequest request);
  Future<void> updateAddress(String addressId, AddressRequest request);
  Future<void> deleteAddress(String addressId);
  Future<FeedbackResult> submitFeedback(FeedbackRequest request);
}
