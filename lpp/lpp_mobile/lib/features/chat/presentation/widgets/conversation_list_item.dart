import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/conversation_row.dart';

/// Backward-compatible adapter for the unified conversation row.
class ConversationListItem extends ConsumerWidget {
  final Conversation conversation;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const ConversationListItem({
    super.key,
    required this.conversation,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(currentSpaceProvider);
    return ConversationRow(
      conversation: conversation,
      isPersonal: space?.isPersonal ?? true,
      isEmployee: space?.isEmployee ?? false,
      isPinned: conversation.isPinned,
      onTap: onTap ?? () {},
      onLongPress: onLongPress,
    );
  }
}
