class UserIdentitySummary {
  final String? userId;
  final String? platformUserId;
  final String? displayName;
  final String? avatarUrl;

  const UserIdentitySummary({
    this.userId,
    this.platformUserId,
    this.displayName,
    this.avatarUrl,
  });

  factory UserIdentitySummary.fromJson(
    Map<String, dynamic> json, {
    Iterable<String> userIdKeys = const [
      'userId',
      'applicantUserId',
      'tenantUserId',
      'customerUserId',
    ],
    Iterable<String> platformUserIdKeys = const ['platformUserId'],
    Iterable<String> displayNameKeys = const [
      'displayName',
      'userDisplayName',
      'applicantDisplayName',
      'customerDisplayName',
      'name',
    ],
    Iterable<String> avatarUrlKeys = const [
      'avatarUrl',
      'userAvatarUrl',
      'applicantAvatarUrl',
      'customerAvatarUrl',
    ],
  }) {
    return UserIdentitySummary(
      userId: firstNonEmptyString(json, userIdKeys),
      platformUserId: firstNonEmptyString(json, platformUserIdKeys),
      displayName: firstNonEmptyString(json, displayNameKeys),
      avatarUrl: firstNonEmptyString(json, avatarUrlKeys),
    );
  }

  String get displayNameOrId => displayName ?? userId ?? platformUserId ?? '';
}

String? firstNonEmptyString(
  Map<String, dynamic> json,
  Iterable<String> keys,
) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return null;
}
