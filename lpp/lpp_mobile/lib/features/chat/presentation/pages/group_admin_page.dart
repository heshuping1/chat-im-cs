import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _bg = Color(0xFFF2F2F7);
const _card = Colors.white;
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);
const _red = Color(0xFFFF3B30);

// ---------------------------------------------------------------------------
// GroupAdminPage — 群管理员（微信风格：说明 + 管理员列表 + 添加成员）
// ---------------------------------------------------------------------------

class GroupAdminPage extends ConsumerWidget {
  final String groupId;

  const GroupAdminPage({super.key, required this.groupId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(groupDetailProvider(groupId));

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('群管理员',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w600, color: _text)),
        centerTitle: true,
      ),
      body: detailAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: _primary)),
        error: (_, __) => const Center(
            child: Text('加载失败', style: TextStyle(color: _secondary))),
        data: (detail) {
          final permissions = AppPermissions.group(
            myRole: detail.myRole,
            isAllMuted: detail.muteMode,
            allowMemberInvite: detail.allowMemberInvite,
            allowMemberModifyTitle: detail.allowMemberModifyTitle,
            allowMemberAtAll: detail.allowMemberAtAll,
            allowMemberViewMemberList: !detail.onlyOwnerViewMembers,
            allowMemberAddFriend: detail.allowMemberAddFriend,
            space: ref.watch(currentSpaceProvider),
          );
          final canView = permissions.canManage;
          final canManage = detail.myRole == GroupRole.superAdmin;
          if (!canView) {
            return const Center(
              child: Text('仅群主/管理员/企业管理员可查看群管理员',
                  style: TextStyle(color: _secondary)),
            );
          }

          final membersAsync = ref.watch(groupMembersProvider(groupId));
          return membersAsync.when(
            loading: () =>
                const Center(child: CircularProgressIndicator(color: _primary)),
            error: (_, __) => const Center(
                child: Text('加载失败', style: TextStyle(color: _secondary))),
            data: (members) {
              final admins =
                  members.where((m) => m.role == GroupRole.admin).toList();

              return ListView(
                padding: const EdgeInsets.symmetric(vertical: 24),
                children: [
                  // ── 说明文字（微信风格）
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text('群管理员',
                            style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: _text)),
                        const SizedBox(height: 16),
                        _bulletText('管理员可协助群主管理群聊，拥有发布群公告、移除群成员等能力。'),
                        const SizedBox(height: 8),
                        _bulletText('只有群主具备设置管理员、转让群主、解散群聊的能力。'),
                        const SizedBox(height: 8),
                        _bulletText('最多可设置 3 个管理员。'),
                      ],
                    ),
                  ),

                  // ── 管理员列表 + 添加
                  Container(
                    color: _card,
                    child: Column(
                      children: [
                        ...admins.asMap().entries.map((e) {
                          final m = e.value;
                          return Column(
                            children: [
                              _AdminTile(
                                member: m,
                                canManage: canManage,
                                onRemove: () => _removeAdmin(context, ref, m),
                              ),
                              if (e.key < admins.length - 1)
                                const Divider(
                                    height: 1, indent: 72, color: _divider),
                            ],
                          );
                        }),
                        // 分割线
                        if (admins.isNotEmpty)
                          const Divider(height: 1, indent: 72, color: _divider),
                        // 添加成员
                        if (canManage && admins.length < 3)
                          InkWell(
                            onTap: () => context
                                .push('/group-manage/$groupId/admins/select'),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface
                                              .withValues(alpha: 0.3),
                                          width: 1.5),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.add,
                                        size: 22, color: _secondary),
                                  ),
                                  const SizedBox(width: 12),
                                  const Text('添加成员',
                                      style: TextStyle(
                                          fontSize: 15, color: _text)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _bulletText(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('• ', style: TextStyle(fontSize: 14, color: _secondary)),
        Expanded(
          child: Text(text,
              style: const TextStyle(fontSize: 14, color: _secondary)),
        ),
      ],
    );
  }

  Future<void> _removeAdmin(
      BuildContext context, WidgetRef ref, GroupMember member) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('移除管理员'),
        content: Text('确定移除「${member.displayName}」的管理员权限吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消', style: TextStyle(color: _secondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('移除', style: TextStyle(color: _red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final dio = ref.read(dioProvider);
      await dio.put(
        '/api/client/v1/groups/$groupId/members/${member.userId}/role',
        data: {'role': 'member'},
      );
      ref.invalidate(groupMembersProvider(groupId));
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// AdminTile
// ---------------------------------------------------------------------------

class _AdminTile extends StatelessWidget {
  final GroupMember member;
  final bool canManage;
  final VoidCallback onRemove;

  const _AdminTile({
    required this.member,
    required this.canManage,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          UserAvatar(
            avatarUrl: member.avatarUrl,
            name: member.displayName,
            size: 44,
            borderRadius: 8,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(member.displayName,
                style: const TextStyle(fontSize: 15, color: _text)),
          ),
          if (canManage)
            TextButton(
              onPressed: onRemove,
              child: const Text('移除',
                  style: TextStyle(fontSize: 14, color: _primary)),
            ),
        ],
      ),
    );
  }
}
