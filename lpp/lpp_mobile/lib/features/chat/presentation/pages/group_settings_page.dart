import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/data/mappers/group_member_payload_mapper.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_remark_page.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/// 群角色：严格对应 figma GroupSettingsPage 的三种角色
/// superAdmin = 群主(owner)，admin = 管理员，member = 普通成员
enum GroupRole { superAdmin, admin, member }

class GroupMember {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final GroupRole role;
  final bool? isMuted;
  final String? muteUntil;
  final String? muteReason;

  const GroupMember({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    this.isMuted,
    this.muteUntil,
    this.muteReason,
  });

  GroupMember copyWith({
    String? userId,
    String? displayName,
    String? avatarUrl,
    GroupRole? role,
    bool? isMuted,
    String? muteUntil,
    String? muteReason,
    bool clearMuteUntil = false,
    bool clearMuteReason = false,
  }) {
    return GroupMember(
      userId: userId ?? this.userId,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      role: role ?? this.role,
      isMuted: isMuted ?? this.isMuted,
      muteUntil: clearMuteUntil ? null : (muteUntil ?? this.muteUntil),
      muteReason: clearMuteReason ? null : (muteReason ?? this.muteReason),
    );
  }
}

class GroupDetail {
  final String groupId;
  final String title;
  final String? avatarUrl;
  final bool muteMode;
  final bool preventAddFriend;
  final bool onlyOwnerViewMembers;
  final bool allowQrCodeJoin;
  final bool requireApproval;
  final bool allowMemberAddFriend;
  final bool allowMemberModifyTitle;
  final bool allowMemberInvite;
  final bool allowMemberAtAll;
  final int memberCount;
  final String? ownerUserId;
  final GroupRole myRole;
  final bool isPinned;
  final bool isMuted;

  const GroupDetail({
    required this.groupId,
    required this.title,
    this.avatarUrl,
    required this.muteMode,
    required this.preventAddFriend,
    required this.onlyOwnerViewMembers,
    this.allowQrCodeJoin = true,
    this.requireApproval = false,
    this.allowMemberAddFriend = true,
    this.allowMemberModifyTitle = false,
    this.allowMemberInvite = true,
    this.allowMemberAtAll = false,
    required this.memberCount,
    this.ownerUserId,
    required this.myRole,
    this.isPinned = false,
    this.isMuted = false,
  });

  factory GroupDetail.fromJson(
      Map<String, dynamic> json, String currentUserId) {
    final settings = json['settings'] as Map<String, dynamic>? ?? {};
    final myRoleStr = json['myRole'] as String? ?? 'member';
    final ownerUserId = json['ownerUserId'] as String?;

    GroupRole myRole;
    if (myRoleStr == 'owner' || currentUserId == ownerUserId) {
      myRole = GroupRole.superAdmin;
    } else if (myRoleStr == 'admin') {
      myRole = GroupRole.admin;
    } else {
      myRole = GroupRole.member;
    }

    return GroupDetail(
      groupId: json['groupId'] as String? ?? '',
      title: json['title'] as String? ?? '群聊',
      avatarUrl: json['avatarUrl'] as String?,
      muteMode: _isAllMuted(json['muteMode']),
      // #2 修复：allowMemberAddFriend 控制禁止添加好友（false=禁止）
      preventAddFriend: !(settings['allowMemberAddFriend'] as bool? ?? true),
      // allowMemberViewMemberList=false 时仅限制普通成员，群主和管理员仍可查看。
      onlyOwnerViewMembers:
          !(settings['allowMemberViewMemberList'] as bool? ?? true),
      allowQrCodeJoin: settings['allowQrCodeJoin'] as bool? ?? true,
      requireApproval: settings['requireApproval'] as bool? ?? false,
      allowMemberAddFriend: settings['allowMemberAddFriend'] as bool? ?? true,
      allowMemberModifyTitle:
          settings['allowMemberModifyTitle'] as bool? ?? false,
      allowMemberInvite: settings['allowMemberInvite'] as bool? ?? true,
      allowMemberAtAll: settings['allowMemberAtAll'] as bool? ?? false,
      memberCount: json['memberCount'] as int? ?? 0,
      ownerUserId: ownerUserId,
      myRole: myRole,
      isPinned: json['isPinned'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? false,
    );
  }

  static bool _isAllMuted(Object? value) {
    return value == 1 || value == true || value == '1' || value == 'all_muted';
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

// 群详情用 StateNotifierProvider，支持乐观更新，避免 invalidate 触发全页重建
// keepAlive = true：provider 在内存中保持，重复打开同一群设置页不重复请求
class _GroupDetailNotifier extends StateNotifier<AsyncValue<GroupDetail>> {
  final String groupId;
  final Ref ref;
  DateTime? _lastLoadTime;

  _GroupDetailNotifier(this.groupId, this.ref)
      : super(const AsyncValue.loading()) {
    _load();
  }

  Future<void> _load() async {
    // 如果已有数据且距上次加载不超过 5 分钟，直接用缓存
    if (state.hasValue &&
        _lastLoadTime != null &&
        DateTime.now().difference(_lastLoadTime!) <
            const Duration(minutes: 5)) {
      return;
    }
    state = const AsyncValue.loading();
    try {
      final space = ref.read(currentSpaceProvider);
      if (space == null || space.accessToken.isEmpty) {
        state = AsyncValue.error(Exception('未登录'), StackTrace.current);
        return;
      }
      final dio = ref.read(dioProvider);
      final resp = await dio.get('/api/client/v1/groups/$groupId');
      final detail = GroupDetail.fromJson(
          resp.data['data'] as Map<String, dynamic>, space.userId);
      state = AsyncValue.data(detail);
      _lastLoadTime = DateTime.now();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// 乐观更新群名，不触发全页重建
  void updateTitle(String newTitle) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(GroupDetail(
      groupId: current.groupId,
      title: newTitle,
      avatarUrl: current.avatarUrl,
      muteMode: current.muteMode,
      preventAddFriend: current.preventAddFriend,
      onlyOwnerViewMembers: current.onlyOwnerViewMembers,
      allowQrCodeJoin: current.allowQrCodeJoin,
      requireApproval: current.requireApproval,
      allowMemberAddFriend: current.allowMemberAddFriend,
      allowMemberModifyTitle: current.allowMemberModifyTitle,
      allowMemberInvite: current.allowMemberInvite,
      allowMemberAtAll: current.allowMemberAtAll,
      memberCount: current.memberCount,
      ownerUserId: current.ownerUserId,
      myRole: current.myRole,
      isPinned: current.isPinned,
      isMuted: current.isMuted,
    ));
  }

  /// 乐观更新群设置字段（不重新请求）
  void updateSettings({
    bool? muteMode,
    bool? preventAddFriend,
    bool? onlyOwnerViewMembers,
    bool? allowQrCodeJoin,
    bool? requireApproval,
    bool? allowMemberAddFriend,
    bool? allowMemberModifyTitle,
    bool? allowMemberInvite,
    bool? allowMemberAtAll,
  }) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(GroupDetail(
      groupId: current.groupId,
      title: current.title,
      avatarUrl: current.avatarUrl,
      muteMode: muteMode ?? current.muteMode,
      preventAddFriend: preventAddFriend ?? current.preventAddFriend,
      onlyOwnerViewMembers:
          onlyOwnerViewMembers ?? current.onlyOwnerViewMembers,
      allowQrCodeJoin: allowQrCodeJoin ?? current.allowQrCodeJoin,
      requireApproval: requireApproval ?? current.requireApproval,
      allowMemberAddFriend:
          allowMemberAddFriend ?? current.allowMemberAddFriend,
      allowMemberModifyTitle:
          allowMemberModifyTitle ?? current.allowMemberModifyTitle,
      allowMemberInvite: allowMemberInvite ?? current.allowMemberInvite,
      allowMemberAtAll: allowMemberAtAll ?? current.allowMemberAtAll,
      memberCount: current.memberCount,
      ownerUserId: current.ownerUserId,
      myRole: current.myRole,
      isPinned: current.isPinned,
      isMuted: current.isMuted,
    ));
  }

  /// 乐观更新当前用户的群个人设置（置顶/免打扰），不触发重新请求。
  void updatePersonalSettings({
    bool? isPinned,
    bool? isMuted,
  }) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(GroupDetail(
      groupId: current.groupId,
      title: current.title,
      avatarUrl: current.avatarUrl,
      muteMode: current.muteMode,
      preventAddFriend: current.preventAddFriend,
      onlyOwnerViewMembers: current.onlyOwnerViewMembers,
      allowQrCodeJoin: current.allowQrCodeJoin,
      requireApproval: current.requireApproval,
      allowMemberAddFriend: current.allowMemberAddFriend,
      allowMemberModifyTitle: current.allowMemberModifyTitle,
      allowMemberInvite: current.allowMemberInvite,
      allowMemberAtAll: current.allowMemberAtAll,
      memberCount: current.memberCount,
      ownerUserId: current.ownerUserId,
      myRole: current.myRole,
      isPinned: isPinned ?? current.isPinned,
      isMuted: isMuted ?? current.isMuted,
    ));
  }

  /// 强制从服务端刷新（忽略缓存）
  void refresh() {
    _lastLoadTime = null;
    _load();
  }
}

final groupDetailProvider = StateNotifierProvider.family<_GroupDetailNotifier,
    AsyncValue<GroupDetail>, String>(
  (ref, groupId) {
    final notifier = _GroupDetailNotifier(groupId, ref);
    // keepAlive：provider 不随页面销毁，缓存群详情数据
    ref.keepAlive();
    return notifier;
  },
);

final groupMembersProvider = StateNotifierProvider.family<_GroupMembersNotifier,
    AsyncValue<List<GroupMember>>, String>(
  (ref, groupId) {
    ref.keepAlive();
    return _GroupMembersNotifier(groupId, ref);
  },
);

class _GroupMembersNotifier
    extends StateNotifier<AsyncValue<List<GroupMember>>> {
  final String groupId;
  final Ref ref;

  _GroupMembersNotifier(this.groupId, this.ref)
      : super(const AsyncValue.loading()) {
    _loadWithCache();
  }

  static const String _cacheKeyPrefix = 'group_members_';

  Future<void> _loadWithCache() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null || space.accessToken.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }

    // 1. 先读本地缓存，立即显示
    final cached = await _loadFromCache(space.spaceId);
    if (cached != null && cached.isNotEmpty) {
      await prefetchAvatarUrls(
        cached.map((m) => m.avatarUrl).toList(),
        accessToken: space.accessToken,
      );
      state = AsyncValue.data(cached);
      // 2. 后台静默刷新
      _syncFromRemote(space.spaceId);
      return;
    }

    // 3. 无缓存：走网络
    await _fetchAndCache(space.spaceId);
  }

  Future<List<GroupMember>?> _loadFromCache(String spaceId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get('$_cacheKeyPrefix$groupId');
      if (raw == null) return null;
      final list = jsonDecode(raw as String) as List<dynamic>;
      return list
          .map((e) => _memberFromMap(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToCache(String spaceId, List<GroupMember> members) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      await box.put(
          '$_cacheKeyPrefix$groupId',
          jsonEncode(
            members
                .map((m) => {
                      'userId': m.userId,
                      'displayName': m.displayName,
                      'avatarUrl': m.avatarUrl,
                      'role': m.role.name,
                      'isMuted': m.isMuted,
                      'muteUntil': m.muteUntil,
                      'muteReason': m.muteReason,
                    })
                .toList(),
          ));
    } catch (_) {}
  }

  static GroupMember _memberFromMap(Map<String, dynamic> m) {
    GroupRole role;
    switch (m['role'] as String?) {
      case 'superAdmin':
        role = GroupRole.superAdmin;
      case 'admin':
        role = GroupRole.admin;
      default:
        role = GroupRole.member;
    }
    return GroupMember(
      userId: m['userId'] as String? ?? '',
      displayName: m['displayName'] as String? ?? '',
      avatarUrl: m['avatarUrl'] as String?,
      role: role,
      isMuted: parseGroupMemberMuted(m),
      muteUntil: m['muteUntil'] as String?,
      muteReason: m['muteReason'] as String?,
    );
  }

  Future<void> _fetchAndCache(String spaceId) async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get('/api/client/v1/groups/$groupId/members');
      final list = extractGroupMemberPayloadList(resp.data['data']);
      final members = <GroupMember>[];
      for (final m in list) {
        final parsed = parseGroupMemberPayload(m);
        final preview = parsed.avatarUrl?.isNotEmpty == true
            ? null
            : await ref.read(userAvatarPreviewProvider(parsed.userId).future);
        final role = _roleFromServer(parsed.role);
        members.add(
          GroupMember(
            userId: parsed.userId,
            displayName: parsed.displayName.isNotEmpty
                ? parsed.displayName
                : preview?.displayName ?? '',
            avatarUrl: parsed.avatarUrl?.isNotEmpty == true
                ? parsed.avatarUrl
                : preview?.avatarUrl,
            role: role,
            isMuted: parsed.isMuted,
            muteUntil: parsed.muteUntil,
            muteReason: parsed.muteReason,
          ),
        );
      }
      await _saveToCache(spaceId, members);
      await prefetchAvatarUrls(
        members.map((m) => m.avatarUrl).toList(),
        accessToken: ref.read(currentSpaceProvider)?.accessToken,
      );
      state = AsyncValue.data(members);
    } catch (e, st) {
      if (state.valueOrNull == null) {
        state = AsyncValue.error(e, st);
      }
    }
  }

  void _syncFromRemote(String spaceId) {
    Future.microtask(() => _fetchAndCache(spaceId));
  }

  void refresh() {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    _fetchAndCache(space.spaceId);
  }

  static GroupRole _roleFromServer(String? role) {
    switch (role) {
      case 'owner':
      case 'superAdmin':
        return GroupRole.superAdmin;
      case 'admin':
        return GroupRole.admin;
      default:
        return GroupRole.member;
    }
  }

  void updateMemberMute(
    String userId,
    bool isMuted, {
    String? muteUntil,
    String? muteReason,
  }) {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = current
        .map(
          (member) => member.userId == userId
              ? member.copyWith(
                  isMuted: isMuted,
                  muteUntil: muteUntil,
                  muteReason: muteReason,
                  clearMuteUntil: !isMuted || muteUntil == null,
                  clearMuteReason: !isMuted || muteReason == null,
                )
              : member,
        )
        .toList();
    state = AsyncValue.data(updated);
    final space = ref.read(currentSpaceProvider);
    if (space != null) {
      _saveToCache(space.spaceId, updated);
    }
  }
}

// ---------------------------------------------------------------------------
// GroupSettingsPage
// ---------------------------------------------------------------------------

class GroupSettingsPage extends ConsumerStatefulWidget {
  final String groupId;

  const GroupSettingsPage({super.key, required this.groupId});

  @override
  ConsumerState<GroupSettingsPage> createState() => _GroupSettingsPageState();
}

class _GroupSettingsPageState extends ConsumerState<GroupSettingsPage> {
  bool _removeMode = false;
  final Set<String> _selectedForRemoval = {};

  // 从 groupDetail 初始化后的本地状态
  bool? _isPinned;
  bool? _isMuted;

  Future<void> _togglePin(bool value) async {
    setState(() => _isPinned = value);
    try {
      await ref.read(conversationActionsControllerProvider).setPinned(
            widget.groupId,
            pinned: value,
            isGroup: true,
          );
      ref
          .read(groupDetailProvider(widget.groupId).notifier)
          .updatePersonalSettings(isPinned: value);
    } catch (_) {
      setState(() => _isPinned = !value); // 回滚
      if (mounted) _showError('操作失败');
    }
  }

  Future<void> _toggleMute(bool value) async {
    setState(() => _isMuted = value);
    try {
      await ref.read(conversationActionsControllerProvider).setMuted(
            widget.groupId,
            muted: value,
            isGroup: true,
          );
      ref
          .read(groupDetailProvider(widget.groupId).notifier)
          .updatePersonalSettings(isMuted: value);
    } catch (_) {
      setState(() => _isMuted = !value); // 回滚
      if (mounted) _showError('操作失败');
    }
  }

  // 修改群名（在父页面执行，避免子 widget dispose 后 ref 失效）
  Future<void> _editGroupName(String currentTitle) async {
    // 用 StatefulBuilder 管理 controller 生命周期，避免 dispose 时序问题
    String? newName;
    await showDialog<void>(
      context: context,
      builder: (ctx) => _EditNameDialog(
        initialTitle: currentTitle,
        onConfirm: (name) {
          newName = name;
          Navigator.pop(ctx);
        },
        onCancel: () => Navigator.pop(ctx),
      ),
    );

    if (newName == null || newName!.isEmpty || !mounted) return;

    // 提前读取所有 ref 依赖，避免 await 后 widget dispose
    final dio = ref.read(dioProvider);
    final groupId = widget.groupId;
    final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';

    try {
      await dio.put('/api/client/v1/groups/$groupId', data: {'title': newName});
      if (!mounted) return;
      // 同步更新详情页、会话列表内存和本地 SQLite，避免返回聊天页/消息列表时显示旧群名。
      ref.read(groupDetailProvider(groupId).notifier).updateTitle(newName!);
      if (spaceId.isNotEmpty) {
        await ref
            .read(conversationsProvider(spaceId).notifier)
            .updateConversationTitle(groupId, newName!);
      }
      ref.read(groupDetailProvider(groupId).notifier).refresh();
      if (spaceId.isNotEmpty) {
        ref.invalidate(conversationsProvider(spaceId));
      }
    } catch (_) {
      if (mounted) _showError('修改失败，请重试');
    }
  }

  Future<void> _removeMembers() async {
    if (_selectedForRemoval.isEmpty) return;
    try {
      final dio = ref.read(dioProvider);
      for (final uid in _selectedForRemoval) {
        await dio
            .delete('/api/client/v1/groups/${widget.groupId}/members/$uid');
      }
      ref.invalidate(groupMembersProvider(widget.groupId));
      if (mounted) {
        setState(() {
          _removeMode = false;
          _selectedForRemoval.clear();
        });
        AppToast.success(context, '已移除成员');
      }
    } catch (_) {
      if (mounted) _showError('操作失败');
    }
  }

  Future<void> _leaveOrDismiss(bool isSuperAdmin) async {
    final label = isSuperAdmin ? '解散群聊' : '删除并退出';
    final desc = isSuperAdmin ? '确定要解散该群聊吗？所有成员将收到通知。' : '确定要退出该群聊吗？';
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(label),
        content: Text(desc),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消', style: TextStyle(color: Color(0xFF8E8E93))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                Text(label, style: const TextStyle(color: Color(0xFFFF3B30))),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    try {
      final dio = ref.read(dioProvider);
      if (isSuperAdmin) {
        await dio.delete('/api/client/v1/groups/${widget.groupId}');
      } else {
        await dio.post('/api/client/v1/groups/${widget.groupId}/leave');
      }
      if (mounted) context.go('/');
    } catch (_) {
      if (mounted) _showError('操作失败');
    }
  }

  void _showError(String msg) {
    AppToast.error(context, msg);
  }

  void _showPermissionDenied(String msg) {
    AppToast.info(context, msg);
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(groupDetailProvider(widget.groupId));

    return Scaffold(
      backgroundColor: const Color(0xFFEFEFEF),
      appBar: _removeMode
          ? AppBar(
              backgroundColor: null,
              elevation: 0,
              leading: TextButton(
                onPressed: () => setState(() {
                  _removeMode = false;
                  _selectedForRemoval.clear();
                }),
                child: const Text('取消',
                    style: TextStyle(color: Color(0xFF576B95))),
              ),
              title: const Text('选择成员',
                  style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C2C2C))),
              centerTitle: true,
              actions: [
                TextButton(
                  onPressed:
                      _selectedForRemoval.isNotEmpty ? _removeMembers : null,
                  child: Text(
                    '删除(${_selectedForRemoval.length})',
                    style: TextStyle(
                        color: _selectedForRemoval.isNotEmpty
                            ? Colors.red
                            : Colors.grey),
                  ),
                ),
              ],
            )
          : AppBar(
              backgroundColor: Theme.of(context).colorScheme.surface,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios,
                    size: 20, color: Color(0xFF2C2C2C)),
                onPressed: () => context.pop(),
              ),
              title: detailAsync.valueOrNull != null
                  ? Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: '聊天信息 ',
                            style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF2C2C2C)),
                          ),
                          TextSpan(
                            text: '(${detailAsync.value!.memberCount})',
                            style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF2C2C2C)),
                          ),
                        ],
                      ),
                    )
                  : const Text('聊天信息',
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF2C2C2C))),
              centerTitle: true,
            ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('加载失败')),
        data: (detail) {
          final space = ref.watch(currentSpaceProvider);
          final permissions = AppPermissions.group(
            myRole: detail.myRole,
            isAllMuted: detail.muteMode,
            allowMemberInvite: detail.allowMemberInvite,
            allowMemberModifyTitle: detail.allowMemberModifyTitle,
            allowMemberAtAll: detail.allowMemberAtAll,
            allowMemberViewMemberList: !detail.onlyOwnerViewMembers,
            allowMemberAddFriend: detail.allowMemberAddFriend,
            space: space,
          );
          final isSuperAdmin = detail.myRole == GroupRole.superAdmin;
          final isAdminOrAbove = permissions.canManage;
          final canViewMembers = permissions.canViewMembers;
          final canInviteMembers = permissions.canInviteMembers;
          final canRemoveMembers = permissions.canManage;
          final currentUserId = space?.userId ?? '';
          final membersAsync = canViewMembers
              ? ref.watch(groupMembersProvider(widget.groupId))
              : const AsyncValue<List<GroupMember>>.data([]);
          final rawMembers = membersAsync.valueOrNull ?? [];
          final tenantContacts =
              ref.watch(tenantMembersProvider).valueOrNull ?? const [];
          final friendContacts =
              ref.watch(friendsProvider).valueOrNull ?? const [];
          final knownContacts = [...tenantContacts, ...friendContacts];
          final avatarByUserId = {
            for (final contact in knownContacts)
              if (contact.avatarUrl?.isNotEmpty == true)
                contact.userId: contact.avatarUrl!
          };
          final nameByUserId = {
            for (final contact in knownContacts)
              if (contact.displayName.isNotEmpty)
                contact.userId: contact.displayName
          };
          final members = rawMembers
              .map((member) => GroupMember(
                    userId: member.userId,
                    displayName: member.displayName.isNotEmpty
                        ? member.displayName
                        : nameByUserId[member.userId] ?? '',
                    avatarUrl: member.avatarUrl?.isNotEmpty == true
                        ? member.avatarUrl
                        : avatarByUserId[member.userId],
                    role: member.role,
                    muteReason: member.muteReason,
                  ))
              .toList();
          bool canRemoveMember(GroupMember member) {
            if (!canRemoveMembers || member.userId == currentUserId) {
              return false;
            }
            if (member.role == GroupRole.superAdmin) {
              return false;
            }
            if (!isSuperAdmin && member.role != GroupRole.member) {
              return false;
            }
            return true;
          }

          // 首次加载时从 detail 初始化本地状态
          _isPinned ??= detail.isPinned;
          _isMuted ??= detail.isMuted;

          return ListView(
            children: [
              const SizedBox(height: 8),

              // 成员区域
              if (canViewMembers)
                _MembersGrid(
                  members: members,
                  isLoading: membersAsync.isLoading,
                  canInviteMembers: canInviteMembers,
                  canRemoveMembers: canRemoveMembers &&
                      members.any((member) => canRemoveMember(member)),
                  canRemoveMember: canRemoveMember,
                  removeMode: _removeMode,
                  selectedForRemoval: _selectedForRemoval,
                  onMemberTap: (uid) {
                    if (_removeMode) {
                      final member = members.firstWhere(
                        (m) => m.userId == uid,
                        orElse: () => const GroupMember(
                          userId: '',
                          displayName: '',
                          role: GroupRole.superAdmin,
                        ),
                      );
                      if (!canRemoveMember(member)) return;
                      setState(() {
                        if (_selectedForRemoval.contains(uid)) {
                          _selectedForRemoval.remove(uid);
                        } else {
                          _selectedForRemoval.add(uid);
                        }
                      });
                    } else {
                      context.push('/profile/$uid', extra: {
                        'allowAddFriendFromGroup':
                            isAdminOrAbove || detail.allowMemberAddFriend,
                      });
                    }
                  },
                  onAddMember: () async {
                    // #7 修复：普通成员受限时弹出提示
                    if (!isAdminOrAbove && !detail.allowMemberInvite) {
                      _showPermissionDenied('该群已关闭成员邀请权限');
                      return;
                    }
                    final result = await context.push('/create-group',
                        extra: widget.groupId);
                    // 如果添加成功，刷新成员列表
                    if (result == true && mounted) {
                      ref.invalidate(groupMembersProvider(widget.groupId));
                      ref
                          .read(groupDetailProvider(widget.groupId).notifier)
                          .refresh();
                    }
                  },
                  onRemoveMember: () => setState(() => _removeMode = true),
                )
              else
                Container(
                  color: Theme.of(context).colorScheme.surface,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.lock_outline,
                          size: 36, color: Color(0xFFC9CDD4)),
                      const SizedBox(height: 8),
                      const Text(
                        '群主或管理员已关闭普通成员查看成员列表权限',
                        textAlign: TextAlign.center,
                        style:
                            TextStyle(fontSize: 13, color: Color(0xFF86909C)),
                      ),
                      if (canInviteMembers) ...[
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final result = await context.push(
                              '/create-group',
                              extra: widget.groupId,
                            );
                            if (result == true && mounted) {
                              ref
                                  .read(groupDetailProvider(widget.groupId)
                                      .notifier)
                                  .refresh();
                            }
                          },
                          icon: const Icon(Icons.person_add_alt_1, size: 18),
                          label: const Text('添加群成员'),
                        ),
                      ],
                    ],
                  ),
                ),

              const SizedBox(height: 8),

              // 群信息
              _InfoSection(
                detail: detail,
                groupId: widget.groupId,
                isAdminOrAbove: isAdminOrAbove,
                onEditName: () {
                  // #7 修复：普通成员受限时弹出提示
                  if (!isAdminOrAbove && !detail.allowMemberModifyTitle) {
                    _showPermissionDenied('仅群主/管理员可修改群名称');
                    return;
                  }
                  _editGroupName(detail.title);
                },
              ),

              const SizedBox(height: 8),

              // 个人设置（所有角色）
              Container(
                color: Theme.of(context).colorScheme.surface,
                child: Column(
                  children: [
                    _SwitchRow(
                      label: '置顶聊天',
                      value: _isPinned ?? detail.isPinned,
                      onChanged: _togglePin,
                    ),
                    const _Div(),
                    _SwitchRow(
                      label: '消息免打扰',
                      value: _isMuted ?? detail.isMuted,
                      onChanged: _toggleMute,
                    ),
                  ],
                ),
              ),

              // 操作区
              Container(
                color: Theme.of(context).colorScheme.surface,
                child: Column(
                  children: [
                    _Row(
                        label: '设置当前聊天背景',
                        onTap: () => context.push('/chat-background')),
                    const _Div(),
                    _Row(
                        label: '清空聊天记录',
                        showArrow: false,
                        onTap: () => _showClearSheet(context)),
                    const _Div(),
                    _Row(
                        label: '投诉',
                        onTap: () => context.push(
                            '/group-settings/${widget.groupId}/complaint')),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 退出/解散按钮
              // 只有超级管理员才能解散群，管理员和普通成员只能退出
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ElevatedButton(
                  onPressed: () => _leaveOrDismiss(isSuperAdmin),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    foregroundColor: Colors.red,
                    elevation: 0,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFE5E5EA)),
                    ),
                  ),
                  child: Text(isSuperAdmin ? '解散群聊' : '删除并退出'),
                ),
              ),

              const SizedBox(height: 32),
            ],
          );
        },
      ),
    );
  }

  void _showClearSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('清空聊天记录',
                  style: TextStyle(color: Colors.red),
                  textAlign: TextAlign.center),
              onTap: () {
                Navigator.pop(context);
                AppToast.success(context, '聊天记录已清空');
              },
            ),
            const Divider(height: 1),
            ListTile(
              title: const Text('取消',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Members Grid
// ---------------------------------------------------------------------------

class _MembersGrid extends StatelessWidget {
  final List<GroupMember> members;
  final bool isLoading;
  final bool canInviteMembers;
  final bool canRemoveMembers;
  final bool Function(GroupMember member) canRemoveMember;
  final bool removeMode;
  final Set<String> selectedForRemoval;
  final void Function(String uid) onMemberTap;
  final VoidCallback onAddMember;
  final VoidCallback onRemoveMember;

  const _MembersGrid({
    required this.members,
    required this.isLoading,
    required this.canInviteMembers,
    required this.canRemoveMembers,
    required this.canRemoveMember,
    required this.removeMode,
    required this.selectedForRemoval,
    required this.onMemberTap,
    required this.onAddMember,
    required this.onRemoveMember,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.all(16),
      child: isLoading
          ? const SizedBox(
              height: 80, child: Center(child: CircularProgressIndicator()))
          : Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ...members.take(15).map((m) => _MemberCell(
                      member: m,
                      removeMode: removeMode,
                      removable: canRemoveMember(m),
                      selected: selectedForRemoval.contains(m.userId),
                      onTap: () => onMemberTap(m.userId),
                    )),
                if (!removeMode && canInviteMembers)
                  _ActionCell(icon: Icons.add, onTap: onAddMember),
                if (!removeMode && canRemoveMembers)
                  _ActionCell(icon: Icons.remove, onTap: onRemoveMember),
              ],
            ),
    );
  }
}

class _MemberCell extends StatelessWidget {
  final GroupMember member;
  final bool removeMode;
  final bool removable;
  final bool selected;
  final VoidCallback onTap;

  const _MemberCell({
    required this.member,
    required this.removeMode,
    required this.removable,
    required this.selected,
    required this.onTap,
  });

  String get _roleLabel {
    switch (member.role) {
      case GroupRole.superAdmin:
        return '群主';
      case GroupRole.admin:
        return '管理员';
      case GroupRole.member:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final disabled = removeMode && !removable;
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: SizedBox(
        width: 56,
        child: Column(
          children: [
            Opacity(
              opacity: disabled ? 0.45 : 1,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: selected
                          ? Border.all(color: Colors.red, width: 2)
                          : null,
                    ),
                    child: UserAvatar(
                      avatarUrl: member.avatarUrl,
                      name: member.displayName,
                      size: 52,
                      borderRadius: 12,
                    ),
                  ),
                  if (_roleLabel.isNotEmpty && !removeMode)
                    Positioned(
                      bottom: -6,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                                colors: [Color(0xFFFFC107), Color(0xFFFF9800)]),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(_roleLabel,
                              style: TextStyle(
                                  fontSize: 9,
                                  color: Theme.of(context).colorScheme.surface,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                  if (removeMode && selected)
                    Positioned(
                      top: 0,
                      right: 0,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: const BoxDecoration(
                            color: Colors.red, shape: BoxShape.circle),
                        child: Icon(Icons.close,
                            size: 12,
                            color: Theme.of(context).colorScheme.surface),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Text(member.displayName,
                style: const TextStyle(fontSize: 11, color: Color(0xFF1D2129)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _ActionCell extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _ActionCell({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 56,
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                border: Border.all(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.3),
                    width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon,
                  size: 24,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 10),
            const SizedBox(height: 14),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Info Section
// ---------------------------------------------------------------------------

class _InfoSection extends ConsumerStatefulWidget {
  final GroupDetail detail;
  final String groupId;
  final bool isAdminOrAbove;
  final VoidCallback onEditName;

  const _InfoSection({
    required this.detail,
    required this.groupId,
    required this.isAdminOrAbove,
    required this.onEditName,
  });

  @override
  ConsumerState<_InfoSection> createState() => _InfoSectionState();
}

class _InfoSectionState extends ConsumerState<_InfoSection> {
  String? _remark;

  @override
  void initState() {
    super.initState();
    _loadRemark();
  }

  Future<void> _loadRemark() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    final r = await loadGroupRemark(space.spaceId, widget.groupId);
    if (mounted) setState(() => _remark = r);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          _Row(
            label: '群聊名称',
            value: widget.detail.title,
            onTap: widget.onEditName,
          ),
          const _Div(),
          _Row(
            label: '群二维码',
            trailing:
                const Icon(Icons.qr_code, size: 20, color: Color(0xFF8E8E93)),
            onTap: () =>
                context.push('/group-settings/${widget.groupId}/qrcode'),
          ),
          if (widget.isAdminOrAbove) ...[
            const _Div(),
            _Row(
              label: '群管理',
              onTap: () => context.push('/group-manage/${widget.groupId}'),
            ),
          ],
          const _Div(),
          _Row(
              label: '群公告',
              onTap: () => context.push(
                    '/group-settings/${widget.groupId}/announcement',
                    extra: {'isAdminOrAbove': widget.isAdminOrAbove},
                  )),
          const _Div(),
          _Row(
            label: '备注',
            value: _remark?.isNotEmpty == true ? _remark : '未设置',
            onTap: () async {
              final result = await context.push<String>(
                '/group-settings/${widget.groupId}/remark',
                extra: {
                  'groupName': widget.detail.title,
                  'groupAvatarUrl': widget.detail.avatarUrl,
                },
              );
              if (result != null) {
                setState(() => _remark = result.isEmpty ? null : result);
              }
            },
          ),
          const _Div(),
          _Row(
            icon: Icons.search,
            label: '查找聊天内容',
            onTap: () => GoRouter.of(context).push('/search'),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------

class _Row extends StatelessWidget {
  final IconData? icon;
  final String label;
  final String? value;
  final Widget? trailing;
  final bool showArrow;
  final VoidCallback? onTap;

  const _Row({
    this.icon,
    required this.label,
    this.value,
    this.trailing,
    this.showArrow = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon,
                  size: 20,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6)),
              const SizedBox(width: 12),
            ],
            Expanded(
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15, color: Color(0xFF2C2C2C)))),
            Expanded(
              child: Align(
                alignment: Alignment.centerRight,
                child: value != null
                    ? Text(value!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                            fontSize: 15, color: Color(0xFF8E8E93)))
                    : trailing ?? const SizedBox.shrink(),
              ),
            ),
            if (showArrow)
              const Icon(Icons.chevron_right,
                  color: Color(0xFFC7C7CC), size: 18),
          ],
        ),
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool>? onChanged;

  const _SwitchRow({
    required this.label,
    required this.value,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 15, color: Color(0xFF2C2C2C))),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: const Color(0xFF00B27A),
          ),
        ],
      ),
    );
  }
}

class _Div extends StatelessWidget {
  const _Div();

  @override
  Widget build(BuildContext context) =>
      Divider(height: 1, indent: 16, color: Theme.of(context).dividerColor);
}

// ---------------------------------------------------------------------------
// Edit Name Dialog — 独立 StatefulWidget，自己管理 TextEditingController 生命周期
// ---------------------------------------------------------------------------

class _EditNameDialog extends StatefulWidget {
  final String initialTitle;
  final void Function(String name) onConfirm;
  final VoidCallback onCancel;

  const _EditNameDialog({
    required this.initialTitle,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  State<_EditNameDialog> createState() => _EditNameDialogState();
}

class _EditNameDialogState extends State<_EditNameDialog> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialTitle);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('修改群名称'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        maxLength: 30,
        decoration: const InputDecoration(
          hintText: '请输入群名称',
          counterText: '',
        ),
      ),
      actions: [
        TextButton(
          onPressed: widget.onCancel,
          child: const Text('取消', style: TextStyle(color: Color(0xFF8E8E93))),
        ),
        TextButton(
          onPressed: () => widget.onConfirm(_ctrl.text.trim()),
          child: const Text('确定', style: TextStyle(color: Color(0xFF00B27A))),
        ),
      ],
    );
  }
}
