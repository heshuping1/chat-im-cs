import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

// ---------------------------------------------------------------------------
// 企业成员列表页
// GET    /api/client/v1/tenant/members
// PUT    /api/client/v1/tenant/members/{userId}/role  （仅所有者）
// DELETE /api/client/v1/tenant/members/{userId}       （所有者/管理员）
// ---------------------------------------------------------------------------

class _Member {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final int membershipRole;
  final int userType;

  const _Member({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.membershipRole,
    required this.userType,
  });

  factory _Member.fromContact(Contact contact) => _Member(
        userId: contact.userId,
        displayName: contact.displayName,
        avatarUrl: contact.avatarUrl,
        membershipRole: _roleFromLabel(contact.customerTag),
        userType: contact.userType ?? 2,
      );

  static int _roleFromLabel(String? label) {
    switch (label) {
      case '所有者':
        return 4;
      case '管理员':
        return 3;
      case '客服':
        return 2;
      case '技术支持':
        return 1;
      default:
        return 0;
    }
  }

  String get roleLabel {
    switch (membershipRole) {
      case 4:
        return '所有者';
      case 3:
        return '管理员';
      case 2:
        return '客服';
      case 1:
        return '技术支持';
      default:
        return '普通成员';
    }
  }
}

class EnterpriseMembersPage extends ConsumerStatefulWidget {
  /// 为 true 时进入「选择新所有者」模式
  final bool selectOwnerMode;

  const EnterpriseMembersPage({super.key, this.selectOwnerMode = false});

  @override
  ConsumerState<EnterpriseMembersPage> createState() =>
      _EnterpriseMembersPageState();
}

class _EnterpriseMembersPageState extends ConsumerState<EnterpriseMembersPage> {
  final _searchDebouncer = Debouncer();
  String _query = '';

  @override
  void dispose() {
    _searchDebouncer.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) {
        setState(() => _query = value.trim());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final isOwner = (space?.membershipRole ?? 0) == 4;
    final role = space?.membershipRole;
    final isAdminOrAbove = role == 3 || role == 4;
    final myUserId = space?.userId ?? '';

    final membersAsync = ref.watch(tenantMembersProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: Text(
          widget.selectOwnerMode ? '选择新所有者' : '成员列表',
          style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1C1C1E)),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
              size: 18, color: Color(0xFF1C1C1E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: '搜索成员',
                hintStyle:
                    const TextStyle(color: Color(0xFF8E8E93), fontSize: 14),
                prefixIcon: const Icon(Icons.search,
                    color: Color(0xFF8E8E93), size: 20),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: membersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('加载失败: $e')),
              data: (contacts) {
                final members = contacts
                    .where((c) => !c.isCustomer && c.customerTag != '客户')
                    .map(_Member.fromContact)
                    .toList();
                final filtered = _query.isEmpty
                    ? members
                    : members
                        .where((m) => m.displayName.contains(_query))
                        .toList();

                return ListView.separated(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 1),
                  itemBuilder: (context, i) {
                    final member = filtered[i];
                    final isSelf = member.userId == myUserId;
                    return _MemberTile(
                      member: member,
                      isSelf: isSelf,
                      isOwner: isOwner,
                      isAdminOrAbove: isAdminOrAbove,
                      selectOwnerMode: widget.selectOwnerMode,
                      onRoleChanged: () =>
                          ref.read(tenantMembersProvider.notifier).refresh(),
                      onRemoved: () =>
                          ref.read(tenantMembersProvider.notifier).refresh(),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberTile extends ConsumerWidget {
  final _Member member;
  final bool isSelf;
  final bool isOwner;
  final bool isAdminOrAbove;
  final bool selectOwnerMode;
  final VoidCallback onRoleChanged;
  final VoidCallback onRemoved;

  const _MemberTile({
    required this.member,
    required this.isSelf,
    required this.isOwner,
    required this.isAdminOrAbove,
    required this.selectOwnerMode,
    required this.onRoleChanged,
    required this.onRemoved,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: selectOwnerMode && !isSelf
            ? () => _confirmTransferOwner(context, ref)
            : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              UserAvatar(
                avatarUrl: member.avatarUrl,
                name: member.displayName,
                size: 44,
                borderRadius: 10,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(member.displayName,
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF1C1C1E))),
                        if (isSelf) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('我',
                                style: TextStyle(
                                    fontSize: 11, color: Color(0xFF8E8E93))),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(member.roleLabel,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF8E8E93))),
                  ],
                ),
              ),
              if (!selectOwnerMode && !isSelf && isAdminOrAbove)
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz, color: Color(0xFF8E8E93)),
                  onSelected: (value) {
                    if (value == 'remove') _confirmRemove(context, ref);
                    if (value.startsWith('role_')) {
                      final role = int.parse(value.substring(5));
                      _changeRole(context, ref, role);
                    }
                  },
                  itemBuilder: (_) => [
                    if (isOwner) ...[
                      const PopupMenuItem(
                          value: 'role_0', child: Text('设为普通成员')),
                      const PopupMenuItem(
                          value: 'role_1', child: Text('设为技术支持')),
                      const PopupMenuItem(value: 'role_2', child: Text('设为客服')),
                      const PopupMenuItem(
                          value: 'role_3', child: Text('设为管理员')),
                    ],
                    const PopupMenuItem(
                      value: 'remove',
                      child: Text('移除成员',
                          style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _changeRole(
      BuildContext context, WidgetRef ref, int role) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.put<Map<String, dynamic>>(
        '/api/client/v1/tenant/members/${member.userId}/role',
        data: {'membershipRole': role},
      );
      onRoleChanged();
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败')));
      }
    }
  }

  void _confirmRemove(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('移除成员'),
        content: Text('确认将「${member.displayName}」移出企业？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('取消')),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final dio = ref.read(dioProvider);
              await dio.delete<Map<String, dynamic>>(
                '/api/client/v1/tenant/members/${member.userId}',
              );
              onRemoved();
            },
            child: const Text('移除', style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }

  void _confirmTransferOwner(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('转让所有者'),
        content: Text('确认将所有者身份转让给「${member.displayName}」？转让后您将降为管理员，无法撤销。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('取消')),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final dio = ref.read(dioProvider);
              await dio.put<Map<String, dynamic>>(
                '/api/client/v1/tenant/members/${member.userId}/role',
                data: {'membershipRole': 4},
              );
              if (context.mounted) Navigator.of(context).pop();
            },
            child:
                const Text('确认转让', style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }
}
