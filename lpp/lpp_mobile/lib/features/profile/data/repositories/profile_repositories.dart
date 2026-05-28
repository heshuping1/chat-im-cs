import 'package:lpp_mobile/features/profile/data/datasources/profile_datasources.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';
import 'package:lpp_mobile/features/profile/domain/repositories/profile_repositories.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource _remote;

  ProfileRepositoryImpl(this._remote);

  @override
  Future<UserProfile> getMyProfile() => _remote.getMyProfile();

  @override
  Future<UserProfile> updateProfile(UpdateProfileRequest request) =>
      _remote.updateProfile(request);

  @override
  Future<void> updateZtId(String newZtId) => _remote.updateZtId(newZtId);

  @override
  Future<UserProfile> getUserProfile(String userId) =>
      _remote.getUserProfile(userId);

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) =>
      _remote.changePassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
      );

  @override
  Future<ProfilePrivacySettings> getPrivacySettings() =>
      _remote.getPrivacySettings();

  @override
  Future<ProfilePrivacySettings> updatePrivacySettings(
          ProfilePrivacySettings settings) =>
      _remote.updatePrivacySettings(settings);

  @override
  Future<List<UserAddress>> getAddresses() => _remote.getAddresses();

  @override
  Future<UserAddress> createAddress(AddressRequest request) =>
      _remote.createAddress(request);

  @override
  Future<void> updateAddress(String addressId, AddressRequest request) =>
      _remote.updateAddress(addressId, request);

  @override
  Future<void> deleteAddress(String addressId) =>
      _remote.deleteAddress(addressId);

  @override
  Future<FeedbackResult> submitFeedback(FeedbackRequest request) =>
      _remote.submitFeedback(request);
}
