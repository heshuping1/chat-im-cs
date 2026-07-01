class GroupReadReceiptMember {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? lppId;
  final int lastReadSeq;
  final bool hasRead;
  final String? platformUserId;

  const GroupReadReceiptMember({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.lppId,
    required this.lastReadSeq,
    required this.hasRead,
    this.platformUserId,
  });
}

class GroupReadReceipts {
  final List<GroupReadReceiptMember> members;
  final int totalMembers;
  final int readCount;
  final int unreadCount;

  const GroupReadReceipts({
    required this.members,
    required this.totalMembers,
    required this.readCount,
    required this.unreadCount,
  });

  List<GroupReadReceiptMember> get readMembers =>
      members.where((member) => member.hasRead).toList(growable: false);

  List<GroupReadReceiptMember> get unreadMembers =>
      members.where((member) => !member.hasRead).toList(growable: false);
}

class GroupReadReceiptIdentity {
  final String? displayName;
  final String? lppId;
  final String? platformUserId;
  final String? userId;

  const GroupReadReceiptIdentity({
    this.displayName,
    this.lppId,
    this.platformUserId,
    this.userId,
  });
}

GroupReadReceipts parseGroupReadReceiptsPayload(
  Object? payload, {
  GroupReadReceiptIdentity? currentUser,
  required int messageSeq,
}) {
  if (payload is List) {
    final members = payload
        .whereType<Map>()
        .map((item) => _memberFromJson(
              Map<String, dynamic>.from(item),
              messageSeq: messageSeq,
              preferHasRead: true,
            ))
        .toList(growable: false);
    return _receiptsFromMembers(
      members,
      totalMembers: members.length,
      currentUser: currentUser,
    );
  }

  if (payload is Map) {
    final json = Map<String, dynamic>.from(payload);
    final rawMembers = _listValue(json, const [
      'members',
      'items',
      'users',
      'receipts',
      'data',
    ]);
    final members = rawMembers
        .whereType<Map>()
        .map((item) => _memberFromJson(
              Map<String, dynamic>.from(item),
              messageSeq: messageSeq,
              preferHasRead: false,
            ))
        .toList(growable: false);

    return _receiptsFromMembers(
      members,
      totalMembers: _intValue(json['totalMembers']) ?? members.length,
      fallbackReadCount: _intValue(json['readCount']),
      fallbackUnreadCount: _intValue(json['unreadCount']),
      currentUser: currentUser,
    );
  }

  return const GroupReadReceipts(
    members: [],
    totalMembers: 0,
    readCount: 0,
    unreadCount: 0,
  );
}

GroupReadReceipts _receiptsFromMembers(
  List<GroupReadReceiptMember> members, {
  required int totalMembers,
  int? fallbackReadCount,
  int? fallbackUnreadCount,
  GroupReadReceiptIdentity? currentUser,
}) {
  final selfMember = _currentReceiptMember(members, currentUser);
  final receiptMembers = selfMember == null
      ? members
      : members
          .where((member) => !_isCurrentReceiptMember(member, currentUser))
          .toList(growable: false);
  final readMembers =
      receiptMembers.where((member) => member.hasRead).toList(growable: false);
  final readableTotal = selfMember == null
      ? totalMembers
      : totalMembers > 0
          ? totalMembers - 1
          : 0;
  final readableFallbackReadCount = selfMember?.hasRead == true
      ? _decrementCount(fallbackReadCount)
      : fallbackReadCount ?? 0;
  final readableFallbackUnreadCount = selfMember != null && !selfMember.hasRead
      ? _decrementCount(fallbackUnreadCount)
      : fallbackUnreadCount ?? 0;
  final membersLookComplete =
      readableTotal <= 0 || receiptMembers.length >= readableTotal;
  final shouldUseFallbackCounts = !membersLookComplete &&
      (fallbackReadCount != null || fallbackUnreadCount != null);
  final readCount = shouldUseFallbackCounts
      ? readableFallbackReadCount
      : receiptMembers.isEmpty
          ? readableFallbackReadCount
          : readMembers.length;
  final unreadCount = shouldUseFallbackCounts
      ? fallbackUnreadCount != null
          ? readableFallbackUnreadCount
          : _clampCount(readableTotal - readCount)
      : receiptMembers.isEmpty
          ? readableFallbackUnreadCount
          : receiptMembers.length - readCount;
  return GroupReadReceipts(
    members: receiptMembers,
    totalMembers: readableTotal,
    readCount: readCount,
    unreadCount: unreadCount,
  );
}

GroupReadReceiptMember _memberFromJson(
  Map<String, dynamic> json, {
  required int messageSeq,
  required bool preferHasRead,
}) {
  final lastReadSeq = _intValue(json['lastReadSeq']) ?? 0;
  final hasRead = preferHasRead && json.containsKey('hasRead')
      ? json['hasRead'] == true
      : lastReadSeq >= messageSeq && messageSeq > 0;
  final user = _mapValue(json, const ['user', 'member', 'profile', 'reader']);
  final displayName = _firstTextFrom(json, user, const [
        'displayName',
        'display_name',
        'name',
        'nickname',
        'userName',
        'user_name',
      ]) ??
      '用户';
  return GroupReadReceiptMember(
    userId: _firstTextFrom(json, user, const [
          'userId',
          'user_id',
          'memberUserId',
          'member_user_id',
          'targetUserId',
          'target_user_id',
          'readerUserId',
          'reader_user_id',
          'id',
        ]) ??
        '',
    displayName: displayName,
    avatarUrl:
        _firstTextFrom(json, user, const ['avatarUrl', 'avatar_url', 'avatar']),
    lppId: _firstTextFrom(json, user, const [
      'lppId',
      'lpp_id',
      'lppNo',
      'lpp_no',
    ]),
    lastReadSeq: lastReadSeq,
    hasRead: hasRead,
    platformUserId: _firstTextFrom(json, user, const [
      'platformUserId',
      'platform_user_id',
      'platformId',
      'readerPlatformUserId',
      'reader_platform_user_id',
    ]),
  );
}

List<Object?> _listValue(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is List) return value;
  }
  return const [];
}

String? _firstText(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key]?.toString().trim();
    if (value != null && value.isNotEmpty) return value;
  }
  return null;
}

String? _firstTextFrom(
  Map<String, dynamic> primary,
  Map<String, dynamic>? secondary,
  List<String> keys,
) {
  return _firstText(primary, keys) ??
      (secondary == null ? null : _firstText(secondary, keys));
}

Map<String, dynamic>? _mapValue(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is Map) return Map<String, dynamic>.from(value);
  }
  return null;
}

int? _intValue(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

GroupReadReceiptMember? _currentReceiptMember(
  List<GroupReadReceiptMember> members,
  GroupReadReceiptIdentity? currentUser,
) {
  for (final member in members) {
    if (_isCurrentReceiptMember(member, currentUser)) return member;
  }
  return null;
}

bool _isCurrentReceiptMember(
  GroupReadReceiptMember member,
  GroupReadReceiptIdentity? currentUser,
) {
  final currentIds = _compactIdentityValues([
    currentUser?.userId,
    currentUser?.platformUserId,
    currentUser?.lppId,
  ]);
  final memberIds = _compactIdentityValues([
    member.userId,
    member.platformUserId,
    member.lppId,
  ]);
  if (currentIds.isNotEmpty && memberIds.any((id) => currentIds.contains(id))) {
    return true;
  }
  final currentName = _normalizeText(currentUser?.displayName);
  return currentName.isNotEmpty &&
      currentName == _normalizeText(member.displayName);
}

List<String> _compactIdentityValues(List<String?> values) {
  return values.map(_normalizeText).where((value) => value.isNotEmpty).toList();
}

String _normalizeText(String? value) {
  return value?.trim().toLowerCase() ?? '';
}

int _decrementCount(int? value) {
  return _clampCount((value ?? 0) - 1);
}

int _clampCount(int value) {
  return value > 0 ? value : 0;
}
