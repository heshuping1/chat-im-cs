import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';

class UserProfileModel extends UserProfile {
  const UserProfileModel({
    required super.userId,
    required super.platformUserId,
    required super.lppId,
    required super.displayName,
    super.avatarUrl,
    super.signature,
    super.gender,
    super.birthday,
    super.location,
    super.bio,
    super.tapTapText,
    super.mobile,
    super.email,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      userId: json['userId'] as String? ?? '',
      platformUserId: json['platformUserId'] as String? ?? '',
      lppId: json['lppId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      signature: json['signature'] as String?,
      gender: json['gender'] as String?,
      birthday: json['birthday'] as String?,
      location: json['location'] as String?,
      bio: json['bio'] as String?,
      tapTapText: json['tapTapText'] as String?,
      mobile: json['mobile'] as String?,
      email: json['email'] as String?,
    );
  }
}
