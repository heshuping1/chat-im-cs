import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/data/mappers/group_read_receipts_mapper.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';

// ---------------------------------------------------------------------------
// 群聊已读回执页
// GET /api/client/v1/groups/{groupId}/read-receipts
// ---------------------------------------------------------------------------

final _readReceiptsProvider = FutureProvider.autoDispose.family<
    GroupReadReceipts, (String groupId, String messageId, int messageSeq)>(
  (ref, args) async {
    final dio = ref.read(dioProvider);
    final currentSpace = ref.watch(currentSpaceProvider);
    var currentProfile = ref.watch(currentUserProfileProvider);
    if (currentProfile == null && currentSpace?.userId.isNotEmpty == true) {
      await ref.read(profileProvider.notifier).loadProfile();
      currentProfile = ref.read(currentUserProfileProvider);
    }
    final resp = await dio.get<Map<String, dynamic>>(
      '/api/client/v1/groups/${args.$1}/read-receipts',
      queryParameters: {'messageId': args.$2},
    );
    final receipts = parseGroupReadReceiptsPayload(
      resp.data?['data'],
      currentUser: GroupReadReceiptIdentity(
        userId: currentProfile?.userId ?? currentSpace?.userId,
        platformUserId: currentProfile?.platformUserId,
        lppId: currentProfile?.lppId,
        displayName: currentProfile?.displayName,
      ),
      messageSeq: args.$3,
    );
    final spaceId = currentSpace?.spaceId;
    if (spaceId != null && spaceId.isNotEmpty) {
      ref
          .read(chatProvider((spaceId, args.$1, true)).notifier)
          .syncGroupReadReceiptSnapshot(
            messageId: args.$2,
            messageSeq: args.$3,
            readCount: receipts.readCount,
          );
    }
    return receipts;
  },
);

class GroupReadReceiptsPage extends ConsumerWidget {
  final String groupId;
  final String messageId;
  final int messageSeq;

  const GroupReadReceiptsPage({
    super.key,
    required this.groupId,
    required this.messageId,
    required this.messageSeq,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providerKey = (groupId, messageId, messageSeq);
    final receiptsAsync = ref.watch(_readReceiptsProvider(providerKey));

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: const Text('已读回执',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1C1C1E))),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
              size: 18, color: Color(0xFF1C1C1E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20, color: Color(0xFF1C1C1E)),
            onPressed: () => ref.invalidate(_readReceiptsProvider(providerKey)),
          ),
        ],
      ),
      body: receiptsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: TextButton.icon(
            onPressed: () => ref.invalidate(_readReceiptsProvider(providerKey)),
            icon: const Icon(Icons.refresh),
            label: const Text('加载失败，点击重试'),
          ),
        ),
        data: (receipts) {
          final readUsers = receipts.readMembers;
          final unreadUsers = receipts.unreadMembers;

          return RefreshIndicator(
            onRefresh: () async {
              final _ =
                  await ref.refresh(_readReceiptsProvider(providerKey).future);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _SectionHeader(
                  title: '已读',
                  count: readUsers.length,
                  color: const Color(0xFF00B27A),
                ),
                const SizedBox(height: 8),
                if (readUsers.isEmpty)
                  const _EmptyHint(text: '暂无人已读')
                else
                  _UserList(users: readUsers),
                const SizedBox(height: 16),
                _SectionHeader(
                  title: '未读',
                  count: unreadUsers.length,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                ),
                const SizedBox(height: 8),
                if (unreadUsers.isEmpty)
                  const _EmptyHint(text: '所有人已读')
                else
                  _UserList(users: unreadUsers),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;

  const _SectionHeader(
      {required this.title, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 16,
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 8),
        Text('$title ($count)',
            style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }
}

class _UserList extends StatelessWidget {
  final List<GroupReadReceiptMember> users;

  const _UserList({required this.users});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: users.asMap().entries.map((e) {
          final i = e.key;
          final user = e.value;
          return Column(
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    UserAvatar(
                      avatarUrl: user.avatarUrl,
                      name: user.displayName,
                      size: 40,
                      borderRadius: 8,
                    ),
                    const SizedBox(width: 12),
                    Text(user.displayName,
                        style: const TextStyle(
                            fontSize: 15, color: Color(0xFF1C1C1E))),
                  ],
                ),
              ),
              if (i < users.length - 1)
                const Divider(height: 1, indent: 68, color: Color(0xFFF2F2F7)),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String text;

  const _EmptyHint({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(text,
            style: const TextStyle(fontSize: 14, color: Color(0xFF8E8E93))),
      ),
    );
  }
}
