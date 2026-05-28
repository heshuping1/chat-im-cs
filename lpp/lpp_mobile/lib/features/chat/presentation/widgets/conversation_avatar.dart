import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/group_conversation_avatar.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

/// Single entry point for rendering a conversation avatar.
///
/// Group conversations always use the loaded member-preview grid. Direct
/// conversations use the peer avatar preview and optional identity badge.
class ConversationAvatar extends ConsumerWidget {
  final Conversation conversation;
  final bool isPersonal;
  final bool isEmployee;
  final double size;
  final double groupBorderRadius;
  final double personBorderRadius;
  final String? overrideTitle;
  final bool showIdentity;

  const ConversationAvatar({
    super.key,
    required this.conversation,
    required this.isPersonal,
    required this.isEmployee,
    this.size = 48,
    this.groupBorderRadius = 10,
    this.personBorderRadius = 10,
    this.overrideTitle,
    this.showIdentity = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isGroup = conversation.type == ConversationType.group ||
        conversation.type == ConversationType.tempSession;
    if (isGroup) {
      return GroupConversationAvatar(
        groupId: conversation.conversationId,
        fallbackAvatarUrls: conversation.memberAvatarUrls ?? const <String?>[],
        fallbackNames: conversation.memberNames ?? const <String>[],
        size: size,
        borderRadius: groupBorderRadius,
      );
    }

    final preview = conversation.avatarUrl?.isNotEmpty != true &&
            conversation.peerUserId?.isNotEmpty == true
        ? ref
            .watch(userAvatarPreviewProvider(conversation.peerUserId!))
            .valueOrNull
        : null;
    final avatarUrl = conversation.avatarUrl?.isNotEmpty == true
        ? conversation.avatarUrl
        : preview?.avatarUrl;
    final name = overrideTitle ??
        (conversation.title.isNotEmpty
            ? conversation.title
            : preview?.displayName ?? conversation.title);
    final identity = _resolveIdentity(ref);

    return PersonAvatarWithBadge(
      avatarUrl: avatarUrl,
      name: name,
      size: size,
      borderRadius: personBorderRadius,
      showIdentity: showIdentity && !isPersonal && identity != null,
      badgeLabel: identity?.shortLabel,
      badgeTone: identity?.tone,
      badgeSize: 17,
    );
  }

  ({String label, String shortLabel, IdentityBadgeTone tone})? _resolveIdentity(
    WidgetRef ref,
  ) {
    if (isPersonal) return null;
    final peerUserType = conversation.peerUserType;
    if (peerUserType != null) {
      return identityBadgeFor(userType: peerUserType);
    }
    if (conversation.peerUserId?.isNotEmpty == true) {
      final membersAsync = ref.watch(tenantMembersProvider);
      if (membersAsync.hasValue) {
        final members = membersAsync.valueOrNull ?? [];
        final peer = members
            .where((member) => member.userId == conversation.peerUserId)
            .firstOrNull;
        if (peer != null) {
          return identityBadgeFor(
            userType: peer.userType,
            customerTag: peer.customerTag,
          );
        }
      }
    }
    if (!isEmployee) {
      return identityBadgeFor(userType: 2, customerTag: '客服');
    }
    return null;
  }
}
