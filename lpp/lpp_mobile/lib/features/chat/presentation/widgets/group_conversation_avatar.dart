import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/widgets/group_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';

/// Unified group avatar for every IM surface.
///
/// Group avatars are always derived from the first group members, WeChat-style.
/// We intentionally do not fall back to the group's title initial because that
/// makes the same group look different across chat list, group list and settings.
class GroupConversationAvatar extends ConsumerWidget {
  final String groupId;
  final List<String?> fallbackAvatarUrls;
  final List<String> fallbackNames;
  final double size;
  final double borderRadius;

  const GroupConversationAvatar({
    super.key,
    required this.groupId,
    this.fallbackAvatarUrls = const <String?>[],
    this.fallbackNames = const <String>[],
    this.size = 48,
    this.borderRadius = 10,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final remoteMembers = ref.watch(groupAvatarMembersProvider(groupId));
    final loadedMembers = remoteMembers.valueOrNull ?? const [];
    final avatarUrls = loadedMembers.isNotEmpty
        ? loadedMembers.map((m) => m.avatarUrl).take(9).toList()
        : fallbackAvatarUrls.take(9).toList();
    final names = loadedMembers.isNotEmpty
        ? loadedMembers.map((m) => m.displayName).take(9).toList()
        : fallbackNames.take(9).toList();

    return GroupAvatar(
      memberAvatarUrls: avatarUrls,
      memberNames: names,
      size: size,
      borderRadius: borderRadius,
    );
  }
}
