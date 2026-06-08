class GroupReadReceiptMember {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final int lastReadSeq;
  final bool hasRead;

  const GroupReadReceiptMember({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.lastReadSeq,
    required this.hasRead,
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

GroupReadReceipts parseGroupReadReceiptsPayload(
  Object? payload, {
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
    return _receiptsFromMembers(members, totalMembers: members.length);
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
}) {
  final readCount = members.isEmpty
      ? fallbackReadCount ?? 0
      : members.where((member) => member.hasRead).length;
  final unreadCount = members.isEmpty
      ? fallbackUnreadCount ?? 0
      : members.length - readCount;
  return GroupReadReceipts(
    members: members,
    totalMembers: totalMembers,
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
  final displayName = _firstText(json, const [
        'displayName',
        'name',
        'nickname',
        'userName',
      ]) ??
      '用户';
  return GroupReadReceiptMember(
    userId: _firstText(json, const ['userId', 'id']) ?? '',
    displayName: displayName,
    avatarUrl: _firstText(json, const ['avatarUrl', 'avatar']),
    lastReadSeq: lastReadSeq,
    hasRead: hasRead,
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

int? _intValue(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
