class ParsedGroupMemberPayload {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? role;
  final bool? isMuted;
  final String? muteUntil;
  final String? muteReason;

  const ParsedGroupMemberPayload({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.role,
    this.isMuted,
    this.muteUntil,
    this.muteReason,
  });
}

List<Map<String, dynamic>> extractGroupMemberPayloadList(Object? raw) {
  if (raw is List) return raw.whereType<Map<String, dynamic>>().toList();
  if (raw is Map<String, dynamic>) {
    for (final key in const ['items', 'members', 'groupMembers', 'data']) {
      final value = raw[key];
      if (value is List) {
        return value.whereType<Map<String, dynamic>>().toList();
      }
    }
  }
  return const [];
}

ParsedGroupMemberPayload parseGroupMemberPayload(Map<String, dynamic> json) {
  final user = json['user'];
  final userMap = user is Map<String, dynamic> ? user : null;
  final userId = firstString(json, const [
        'userId',
        'memberUserId',
        'targetUserId',
        'id',
      ]) ??
      firstString(userMap, const ['userId', 'id']) ??
      '';
  final avatarUrl = firstString(json, const [
        'avatarUrl',
        'userAvatarUrl',
        'memberAvatarUrl',
      ]) ??
      firstString(userMap, const ['avatarUrl', 'userAvatarUrl']);
  final displayName = firstString(json, const [
        'displayName',
        'name',
        'nickname',
        'memberName',
      ]) ??
      firstString(userMap, const ['displayName', 'name', 'nickname']) ??
      '';
  return ParsedGroupMemberPayload(
    userId: userId,
    displayName: displayName,
    avatarUrl: avatarUrl,
    role: firstString(json, const ['role', 'memberRole']),
    isMuted: parseGroupMemberMuted(json),
    muteUntil: firstString(json, const ['muteUntil', 'mutedUntil']),
    muteReason:
        firstString(json, const ['muteReason', 'reason', 'mutedReason']),
  );
}

String? firstString(Map<String, dynamic>? json, List<String> keys) {
  if (json == null) return null;
  for (final key in keys) {
    final value = json[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
  }
  return null;
}

bool? parseGroupMemberMuted(Map<String, dynamic> json) {
  final value = json['muteMode'] ?? json['isMuted'] ?? json['muted'];
  if (value == null) return null;
  if (value is bool) return value;
  if (value is num) return value.toInt() == 1;
  if (value is String) {
    final normalized = value.toLowerCase();
    if (normalized == '1' || normalized == 'true' || normalized == 'muted') {
      return true;
    }
    if (normalized == '0' || normalized == 'false' || normalized == 'normal') {
      return false;
    }
  }
  return null;
}
