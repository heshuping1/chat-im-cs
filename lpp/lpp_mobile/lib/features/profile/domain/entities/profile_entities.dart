import 'package:flutter/foundation.dart';

/// 当前用户完整资料
@immutable
class UserProfile {
  final String userId;
  final String platformUserId;
  final String lppId;
  final String displayName;
  final String? avatarUrl;
  final String? signature;
  final String? gender;
  final String? birthday;
  final String? location;
  final String? bio;
  final String? tapTapText;
  final String? mobile; // 脱敏
  final String? email; // 脱敏

  const UserProfile({
    required this.userId,
    required this.platformUserId,
    required this.lppId,
    required this.displayName,
    this.avatarUrl,
    this.signature,
    this.gender,
    this.birthday,
    this.location,
    this.bio,
    this.tapTapText,
    this.mobile,
    this.email,
  });

  UserProfile copyWith({
    String? displayName,
    String? avatarUrl,
    String? signature,
    String? gender,
    String? birthday,
    String? location,
    String? bio,
    String? tapTapText,
  }) {
    return UserProfile(
      userId: userId,
      platformUserId: platformUserId,
      lppId: lppId,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      signature: signature ?? this.signature,
      gender: gender ?? this.gender,
      birthday: birthday ?? this.birthday,
      location: location ?? this.location,
      bio: bio ?? this.bio,
      tapTapText: tapTapText ?? this.tapTapText,
      mobile: mobile,
      email: email,
    );
  }
}

/// 更新资料请求
@immutable
class UpdateProfileRequest {
  final String? displayName;
  final String? avatarUrl;
  final String? signature;
  final String? gender;
  final String? birthday;
  final String? location;
  final String? bio;
  final String? tapTapText;

  const UpdateProfileRequest({
    this.displayName,
    this.avatarUrl,
    this.signature,
    this.gender,
    this.birthday,
    this.location,
    this.bio,
    this.tapTapText,
  });

  Map<String, dynamic> toJson() => {
        if (displayName != null) 'displayName': displayName,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (signature != null) 'signature': signature,
        if (gender != null) 'gender': gender,
        if (birthday != null) 'birthday': birthday,
        if (location != null) 'location': location,
        if (bio != null) 'bio': bio,
        if (tapTapText != null) 'tapTapText': tapTapText,
      };
}

@immutable
class ProfilePrivacySettings {
  final bool searchableByMobile;
  final bool searchableByLppId;
  final String allowFriendRequest;
  final String profileVisibility;

  const ProfilePrivacySettings({
    required this.searchableByMobile,
    required this.searchableByLppId,
    required this.allowFriendRequest,
    required this.profileVisibility,
  });

  factory ProfilePrivacySettings.fromJson(Map<String, dynamic> json) {
    return ProfilePrivacySettings(
      searchableByMobile: json['searchableByMobile'] as bool? ?? true,
      searchableByLppId: json['searchableByLppId'] as bool? ?? true,
      allowFriendRequest: json['allowFriendRequest'] as String? ?? 'everyone',
      profileVisibility: json['profileVisibility'] as String? ?? 'friends',
    );
  }

  Map<String, dynamic> toJson() => {
        'searchableByMobile': searchableByMobile,
        'searchableByLppId': searchableByLppId,
        'allowFriendRequest': allowFriendRequest,
        'profileVisibility': profileVisibility,
      };
}

@immutable
class UserAddress {
  final String addressId;
  final String? label;
  final String contactName;
  final String contactMobile;
  final String? province;
  final String? city;
  final String? district;
  final String detail;
  final bool isDefault;
  final DateTime? createdAt;

  const UserAddress({
    required this.addressId,
    this.label,
    required this.contactName,
    required this.contactMobile,
    this.province,
    this.city,
    this.district,
    required this.detail,
    required this.isDefault,
    this.createdAt,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    return UserAddress(
      addressId: json['addressId'] as String? ?? '',
      label: json['label'] as String?,
      contactName: json['contactName'] as String? ?? '',
      contactMobile: json['contactMobile'] as String? ?? '',
      province: json['province'] as String?,
      city: json['city'] as String?,
      district: json['district'] as String?,
      detail: json['detail'] as String? ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
    );
  }
}

@immutable
class AddressRequest {
  final String? label;
  final String? contactName;
  final String? contactMobile;
  final String? province;
  final String? city;
  final String? district;
  final String? detail;
  final bool? isDefault;

  const AddressRequest({
    this.label,
    this.contactName,
    this.contactMobile,
    this.province,
    this.city,
    this.district,
    this.detail,
    this.isDefault,
  });

  Map<String, dynamic> toJson() => {
        if (label != null) 'label': label,
        if (contactName != null) 'contactName': contactName,
        if (contactMobile != null) 'contactMobile': contactMobile,
        if (province != null) 'province': province,
        if (city != null) 'city': city,
        if (district != null) 'district': district,
        if (detail != null) 'detail': detail,
        if (isDefault != null) 'isDefault': isDefault,
      };
}

@immutable
class FeedbackRequest {
  final String type;
  final String content;
  final String? contactInfo;
  final List<String>? attachmentUrls;

  const FeedbackRequest({
    required this.type,
    required this.content,
    this.contactInfo,
    this.attachmentUrls,
  });

  Map<String, dynamic> toJson() => {
        'type': type,
        'content': content,
        if (contactInfo != null) 'contactInfo': contactInfo,
        if (attachmentUrls != null) 'attachmentUrls': attachmentUrls,
      };
}

@immutable
class FeedbackResult {
  final String feedbackId;
  final DateTime? submittedAt;

  const FeedbackResult({required this.feedbackId, this.submittedAt});

  factory FeedbackResult.fromJson(Map<String, dynamic> json) {
    return FeedbackResult(
      feedbackId: json['feedbackId'] as String? ?? '',
      submittedAt: DateTime.tryParse(json['submittedAt'] as String? ?? ''),
    );
  }
}
