import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/application/friend_relation_status.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _primary = Color(0xFF00B27A);
const _bg = Color(0xFFEFEFEF);
const _text = Color(0xFF2C2C2C);
const _kDirectChatIdPrefix = 'direct_chat_id_';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
class UserProfile {
  final String userId;
  final String name;
  final String? avatarUrl;
  final String? avatarEmoji;
  final String bubbleId;
  final String? gender;
  final String? region;
  final String? signature;
  final String? mobile;
  final List<String> tags;
  final String? remarkName;
  final bool isFriend;

  /// userType: 1=客户, 2=员工（来自 API）
  final int userType;
  final bool isOfficial;

  const UserProfile({
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.avatarEmoji,
    required this.bubbleId,
    this.gender,
    this.region,
    this.signature,
    this.mobile,
    this.tags = const [],
    this.remarkName,
    this.isFriend = false,
    this.userType = 2,
    this.isOfficial = false,
  });

  bool get isEmployee => userType == 2;
  bool get isCustomer => userType == 1;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['userId'] as String? ?? '',
      name: json['displayName'] as String? ?? json['name'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      avatarEmoji: json['avatarEmoji'] as String?,
      bubbleId: json['ztId'] as String? ??
          json['lppId'] as String? ??
          json['bubbleId'] as String? ??
          '',
      gender: json['gender'] as String?,
      region: json['location'] as String? ?? json['region'] as String?,
      signature: json['signature'] as String?,
      mobile: json['mobile'] as String? ?? json['phone'] as String?,
      tags: _parseTags(json['tags']),
      remarkName: json['remarkName'] as String?,
      isFriend: json['isFriend'] as bool? ?? false,
      userType: json['userType'] as int? ??
          ((json['isEmployee'] as bool?) == true ? 2 : 1),
      isOfficial: json['isOfficial'] as bool? ?? false,
    );
  }
}

List<String> _parseTags(Object? raw) {
  if (raw is List) {
    return raw
        .map((e) => e?.toString().trim() ?? '')
        .where((e) => e.isNotEmpty)
        .toList(growable: false);
  }
  if (raw is String && raw.trim().isNotEmpty) {
    return raw
        .split(RegExp(r'[,，、]'))
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList(growable: false);
  }
  return const [];
}

// ---------------------------------------------------------------------------
// Provider — 本地优先缓存，后台异步刷新
// ---------------------------------------------------------------------------

const _kUserProfileCachePrefix = 'user_profile_';

class UserProfileNotifier extends FamilyAsyncNotifier<UserProfile, String> {
  @override
  Future<UserProfile> build(String arg) async {
    final space = ref.watch(currentSpaceProvider);
    if (space == null) {
      return UserProfile(userId: arg, name: '用户', bubbleId: arg);
    }

    // 1. 先读本地缓存，立即显示（只有有头像的缓存才用）
    final cached = await _loadFromCache(space.spaceId, arg);
    if (cached != null && cached.avatarUrl != null) {
      state = AsyncData(cached);
      // 2. 后台静默刷新
      _syncFromRemote(space.spaceId, arg);
      return cached;
    }

    // 3. 无缓存或缓存无头像：走网络获取完整数据
    return _fetchAndCache(space.spaceId, arg);
  }

  Future<UserProfile?> _loadFromCache(String spaceId, String userId) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      final raw = box.get('$_kUserProfileCachePrefix$userId');
      if (raw == null) return null;
      final m = jsonDecode(raw as String) as Map<String, dynamic>;
      return UserProfile(
        userId: m['userId'] as String? ?? userId,
        name: m['name'] as String? ?? '',
        avatarUrl: m['avatarUrl'] as String?,
        bubbleId: m['bubbleId'] as String? ?? '',
        gender: m['gender'] as String?,
        region: m['region'] as String?,
        signature: m['signature'] as String?,
        mobile: m['mobile'] as String?,
        tags: _parseTags(m['tags']),
        remarkName: m['remarkName'] as String?,
        isFriend: m['isFriend'] as bool? ?? false,
        userType: m['userType'] as int? ??
            ((m['isEmployee'] as bool?) == true ? 2 : 1),
        isOfficial: m['isOfficial'] as bool? ?? false,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _saveToCache(String spaceId, UserProfile p) async {
    try {
      final box = await HiveStorage.profileBox(spaceId);
      await box.put(
          '$_kUserProfileCachePrefix${p.userId}',
          jsonEncode({
            'userId': p.userId,
            'name': p.name,
            'avatarUrl': p.avatarUrl,
            'bubbleId': p.bubbleId,
            'gender': p.gender,
            'region': p.region,
            'signature': p.signature,
            'mobile': p.mobile,
            'tags': p.tags,
            'remarkName': p.remarkName,
            'isFriend': p.isFriend,
            'userType': p.userType,
            'isOfficial': p.isOfficial,
          }));
    } catch (_) {}
  }

  Future<UserProfile> _fetchAndCache(String spaceId, String userId) async {
    final dio = ref.read(dioProvider);
    Map<String, dynamic> data;
    try {
      final resp = await dio.get('/api/client/v1/users/$userId/profile');
      data = resp.data['data'] as Map<String, dynamic>;
    } catch (_) {
      final fallback = _profileFromContacts(userId);
      if (fallback != null) return fallback;
      rethrow;
    }

    String? avatarUrl = data['avatarUrl'] as String?;
    if (avatarUrl?.isEmpty == true) avatarUrl = null;

    final profile = UserProfile(
      userId: data['userId'] as String? ?? userId,
      name: data['displayName'] as String? ?? data['name'] as String? ?? '',
      avatarUrl: avatarUrl,
      bubbleId: data['ztId'] as String? ??
          data['lppId'] as String? ??
          data['bubbleId'] as String? ??
          '',
      gender: _genderLabel(data['gender'] as String?),
      region: data['location'] as String? ?? data['region'] as String?,
      signature: data['signature'] as String?,
      mobile: data['mobile'] as String? ?? data['phone'] as String?,
      tags: _parseTags(data['tags']),
      remarkName: data['remarkName'] as String?,
      isFriend: data['isFriend'] as bool? ?? false,
      userType: data['userType'] as int? ??
          ((data['isEmployee'] as bool?) == true ? 2 : 1),
      isOfficial: data['isOfficial'] as bool? ?? false,
    );
    await _saveToCache(spaceId, profile);
    return profile;
  }

  UserProfile? _profileFromContacts(String userId) {
    final contacts = [
      ...?ref.read(tenantMembersProvider).valueOrNull,
      ...?ref.read(friendsProvider).valueOrNull,
    ];
    for (final contact in contacts) {
      if (contact.userId != userId) continue;
      return UserProfile(
        userId: contact.userId,
        name: contact.displayName,
        avatarUrl: contact.avatarUrl,
        bubbleId: contact.userId,
        isFriend: true,
        userType: contact.isCustomer ? 1 : 2,
      );
    }
    return null;
  }

  void _syncFromRemote(String spaceId, String userId) {
    Future.microtask(() async {
      try {
        final fresh = await _fetchAndCache(spaceId, userId);
        state = AsyncData(fresh);
      } catch (_) {}
    });
  }

  Future<void> updateRemark(String remarkName) async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = UserProfile(
      userId: current.userId,
      name: current.name,
      avatarUrl: current.avatarUrl,
      bubbleId: current.bubbleId,
      gender: current.gender,
      region: current.region,
      signature: current.signature,
      mobile: current.mobile,
      tags: current.tags,
      remarkName: remarkName,
      isFriend: current.isFriend,
      userType: current.userType,
      isOfficial: current.isOfficial,
    );
    state = AsyncData(updated);
    await _saveToCache(space.spaceId, updated);
  }
}

final userProfileProvider =
    AsyncNotifierProvider.family<UserProfileNotifier, UserProfile, String>(
  UserProfileNotifier.new,
);

String? _genderLabel(String? gender) {
  switch (gender) {
    case 'male':
      return '男';
    case 'female':
      return '女';
    case 'other':
      return '其他';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
class ProfilePage extends ConsumerStatefulWidget {
  final String userId;
  final bool? allowAddFriendFromGroup;
  final bool adminCustomerView;

  const ProfilePage({
    super.key,
    required this.userId,
    this.allowAddFriendFromGroup,
    this.adminCustomerView = false,
  });

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  String _remarkName = '';
  bool _savingRemark = false;
  bool _localFriendRequestPending = false;

  Future<void> _openChat(BuildContext context, UserProfile profile) async {
    final cachedChatId = await _findCachedDirectChatId(profile.userId);
    if (!mounted || !context.mounted) return;
    _pushDirectChat(
      context,
      profile,
      cachedChatId ?? 'pending_direct_${profile.userId}',
    );
  }

  Future<String?> _findCachedDirectChatId(String peerUserId) async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return null;

    final conversations =
        ref.read(conversationsProvider(space.spaceId)).valueOrNull ?? const [];
    for (final conversation in conversations) {
      if (conversation.type == ConversationType.direct &&
          conversation.peerUserId == peerUserId &&
          conversation.conversationId.isNotEmpty) {
        await _cacheDirectChatId(peerUserId, conversation.conversationId);
        return conversation.conversationId;
      }
    }

    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      final cached = box.get('$_kDirectChatIdPrefix$peerUserId');
      if (cached is String && cached.isNotEmpty) return cached;
    } catch (_) {}
    return null;
  }

  Future<void> _cacheDirectChatId(String peerUserId, String chatId) async {
    final space = ref.read(currentSpaceProvider);
    if (space == null || chatId.isEmpty) return;
    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      await box.put('$_kDirectChatIdPrefix$peerUserId', chatId);
    } catch (_) {}
  }

  void _pushDirectChat(
    BuildContext context,
    UserProfile profile,
    String chatId,
  ) {
    context.push('/chat/$chatId', extra: {
      'title': profile.name,
      'isGroup': false,
      'avatarUrl': profile.avatarUrl,
      'peerUserId': widget.userId,
    });
  }

  Future<void> _startCall(
    BuildContext context,
    UserProfile profile, {
    required bool isVideo,
  }) async {
    context.push(
      '/call/${widget.userId}',
      extra: {
        'isVideo': isVideo,
        'title': profile.name,
        'targetUserId': widget.userId,
        'avatarUrl': profile.avatarUrl,
      },
    );
  }

  Future<void> _showCallOptions(
      BuildContext context, UserProfile profile) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final surface = Theme.of(ctx).colorScheme.surface;
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      _ActionSheetItem(
                        label: '语音通话',
                        onTap: () {
                          Navigator.pop(ctx);
                          _startCall(context, profile, isVideo: false);
                        },
                      ),
                      const Divider(height: 1),
                      _ActionSheetItem(
                        label: '视频通话',
                        onTap: () {
                          Navigator.pop(ctx);
                          _startCall(context, profile, isVideo: true);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: _ActionSheetItem(
                    label: '取消',
                    isCancel: true,
                    onTap: () => Navigator.pop(ctx),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _sendFriendRequest() async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/api/client/v1/friends/request',
          data: {'toUserId': widget.userId});
      _localFriendRequestPending = true;
      await _refreshFriendRelations();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已发送好友申请')));
        // 刷新资料页（更新好友状态）
        ref.invalidate(userProfileProvider(widget.userId));
      }
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      if (err is ServerError &&
          isAlreadyFriendErrorCode(err.code, err.message)) {
        _localFriendRequestPending = false;
        await _refreshFriendRelations();
        ref.invalidate(userProfileProvider(widget.userId));
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('你们已经是好友')));
        }
        return;
      }
      if (err is ServerError &&
          isFriendRequestPendingErrorCode(err.code, err.message)) {
        _localFriendRequestPending = true;
        await _refreshFriendRelations();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('好友申请已发送，等待对方通过')),
          );
        }
        return;
      }
      if (mounted) {
        final message = err is ServerError ? err.message : '发送失败，请重试';
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('发送失败，请重试')));
      }
    }
  }

  Future<void> _refreshFriendRelations() async {
    try {
      await ref.read(friendsProvider.notifier).refresh();
    } catch (_) {}
    try {
      final _ = await ref.refresh(friendRequestsProvider.future);
      ref.invalidate(pendingFriendRequestsProvider);
    } catch (_) {}
  }

  FriendRelationSnapshot _relationFor(UserProfile profile) {
    return resolveFriendRelation(
      userId: profile.userId,
      currentUserId: ref.read(currentSpaceProvider)?.userId,
      friends: ref.read(friendsProvider).valueOrNull ?? const [],
      requests: ref.read(friendRequestsProvider).valueOrNull ?? const [],
      isFriend: profile.isFriend,
      localOutgoingPending: _localFriendRequestPending,
    );
  }

  Future<String?> _openRemarkEdit(
    UserProfile profile, {
    String? initialRemark,
  }) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => FriendRemarkEditPage(
          initialRemark: initialRemark ?? _remarkName,
          originalName: profile.name,
          onSave: _saveRemark,
        ),
      ),
    );
    return result ?? _remarkName;
  }

  Future<bool> _saveRemark(String remark) async {
    final newRemark = remark.trim();
    if (_savingRemark) return false;

    setState(() => _savingRemark = true);
    try {
      await ref
          .read(contactsRepositoryProvider)
          .updateFriend(widget.userId, remark: newRemark);
      if (!mounted) return false;
      setState(() {
        _remarkName = newRemark;
        _savingRemark = false;
      });
      await ref
          .read(userProfileProvider(widget.userId).notifier)
          .updateRemark(newRemark);
      ref.invalidate(friendsProvider);
      if (!mounted) return true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(newRemark.isEmpty ? '已清除备注' : '已保存备注')),
      );
      return true;
    } catch (_) {
      if (!mounted) return false;
      setState(() => _savingRemark = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('保存失败，请重试')),
      );
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final profileAsync = ref.watch(userProfileProvider(widget.userId));
    ref.watch(friendsProvider);
    ref.watch(friendRequestsProvider);

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: _text, size: 18),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_horiz, color: _text),
            onPressed: () {},
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败: $e')),
        data: (profile) {
          if (_remarkName.isEmpty && profile.remarkName?.isNotEmpty == true) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _remarkName = profile.remarkName!);
            });
          }
          final displayName =
              _remarkName.isNotEmpty ? _remarkName : profile.name;
          final relation = _relationFor(profile);
          final isFriendOrEmployee =
              relation.status == FriendRelationStatus.friend ||
                  profile.isEmployee;

          // 当前登录用户信息
          final space = ref.watch(currentSpaceProvider);
          final myUserId = space?.userId ?? '';
          final isMe = profile.userId == myUserId;
          final adminCustomerView = widget.adminCustomerView &&
              profile.isCustomer &&
              AppPermissions.canSeeAllCustomers(space);
          final groupAllowsFriendRequest =
              widget.allowAddFriendFromGroup ?? true;
          final friendRequestDecision = AppPermissions.canSendFriendRequest(
            space: space,
            groupAllowsFriendRequest: groupAllowsFriendRequest,
          );
          final canSendFriendRequest = friendRequestDecision.allowed;
          final friendRequestBlockedReason = friendRequestDecision.reason ?? '';
          final canDirectMessage = AppPermissions.canDirectMessageProfile(
            space: space,
            adminCustomerView: adminCustomerView,
            targetIsFriend: relation.status == FriendRelationStatus.friend,
            targetIsEmployee: profile.isEmployee,
          );

          return SingleChildScrollView(
            child: Column(
              children: [
                _buildProfileHeader(profile, displayName, l10n),
                const SizedBox(height: 8),
                _buildProfileActions(context, isFriendOrEmployee, profile,
                    l10n: l10n,
                    relation: relation,
                    isMe: isMe,
                    canDirectMessage: canDirectMessage,
                    canSendFriendRequest: canSendFriendRequest,
                    friendRequestBlockedReason: friendRequestBlockedReason,
                    adminCustomerView: adminCustomerView),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileHeader(
      UserProfile profile, String displayName, AppLocalizations l10n) {
    final space = ref.watch(currentSpaceProvider);
    final showIdentity = space != null && !space.isPersonal;
    final identity = showIdentity
        ? identityBadgeFor(
            userType: profile.userType,
            official: profile.isOfficial,
            includeEmployee: true,
          )
        : null;
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar — 用 UserAvatar 统一处理相对路径、token、缓存
              UserAvatar(
                avatarUrl: profile.avatarUrl,
                name: profile.name,
                size: 80,
                borderRadius: 16,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(displayName,
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w500,
                                  color: _text)),
                        ),
                        if (_genderMarkFrom(profile.gender) != null) ...[
                          const SizedBox(width: 6),
                          _GenderIcon(mark: _genderMarkFrom(profile.gender)!),
                        ],
                        if (showIdentity && profile.isOfficial) ...[
                          const SizedBox(width: 8),
                          const IdentityBadge(
                            label: '官方',
                            tone: IdentityBadgeTone.official,
                          ),
                        ] else if (identity != null) ...[
                          const SizedBox(width: 8),
                          IdentityBadge(
                            label: identity.label,
                            tone: identity.tone,
                          ),
                        ],
                      ],
                    ),
                    if (_remarkName.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('昵称：${profile.name}',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.grey)),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text('${l10n.profilePageLppId}：${profile.bubbleId}',
                            style: const TextStyle(
                                fontSize: 13, color: Colors.grey)),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () {
                            Clipboard.setData(
                                ClipboardData(text: profile.bubbleId));
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('已复制')));
                          },
                          child: const Icon(Icons.copy,
                              size: 14, color: Colors.grey),
                        ),
                      ],
                    ),
                    if (profile.region?.trim().isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text('地区：${profile.region!.trim()}',
                          style: const TextStyle(
                              fontSize: 13, color: Colors.grey)),
                    ],
                    if (profile.isEmployee) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.work_outline,
                                size: 12, color: Color(0xFF2563EB)),
                            SizedBox(width: 4),
                            Text('企业员工',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF1D4ED8),
                                    fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProfileActions(
      BuildContext context, bool isFriendOrEmployee, UserProfile profile,
      {required AppLocalizations l10n,
      required FriendRelationSnapshot relation,
      bool isMe = false,
      bool canDirectMessage = false,
      bool canSendFriendRequest = true,
      String friendRequestBlockedReason = '当前暂不支持添加好友',
      bool adminCustomerView = false}) {
    return Column(
      children: [
        if (!adminCustomerView) ...[
          _FriendSummaryBlock(
            profile: profile,
            remark: _remarkName,
            onTap: () => Navigator.of(context).push<void>(
              MaterialPageRoute(
                builder: (_) => FriendDetailsPage(
                  profile: profile,
                  initialRemark: _remarkName,
                  onEditRemark: (currentRemark) =>
                      _openRemarkEdit(profile, initialRemark: currentRemark),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (isMe) ...[
          _ProfileActionSection(
            rows: [
              _ProfileActionRowData(
                icon: Icons.chat_bubble_outline,
                label: l10n.profilePageSendMessage,
                onTap: () => _openChat(context, profile),
              ),
            ],
          ),
        ] else if (adminCustomerView) ...[
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: _AdminCustomerActions(profile: profile),
          ),
        ] else if (isFriendOrEmployee || canDirectMessage) ...[
          _ProfileActionSection(
            rows: [
              _ProfileActionRowData(
                icon: Icons.chat_bubble_outline,
                label: l10n.profilePageSendMessage,
                onTap: () => _openChat(context, profile),
              ),
              _ProfileActionRowData(
                icon: Icons.call_outlined,
                label: '音视频通话',
                onTap: () => _showCallOptions(context, profile),
              ),
            ],
          ),
        ] else if (relation.status == FriendRelationStatus.outgoingPending) ...[
          Container(
            width: double.infinity,
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            alignment: Alignment.center,
            child: const Text(
              '好友申请已发送，等待对方通过',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
        ] else if (relation.status == FriendRelationStatus.incomingPending) ...[
          _ProfileActionSection(
            rows: [
              _ProfileActionRowData(
                icon: Icons.person_add_alt_1_outlined,
                label: '处理好友申请',
                onTap: () => context.push('/new-friends'),
              ),
            ],
          ),
        ] else if (canSendFriendRequest) ...[
          _ProfileActionSection(
            rows: [
              _ProfileActionRowData(
                icon: Icons.person_add_alt_1_outlined,
                label: l10n.profilePageAddFriend,
                onTap: _sendFriendRequest,
              ),
            ],
          ),
        ] else ...[
          Container(
            width: double.infinity,
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            alignment: Alignment.center,
            child: Text(
              friendRequestBlockedReason,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
        ],
      ],
    );
  }
}

enum _GenderMark { male, female }

_GenderMark? _genderMarkFrom(String? value) {
  final normalized = value?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return null;
  if (normalized == 'male' || normalized == '男' || normalized == '男性') {
    return _GenderMark.male;
  }
  if (normalized == 'female' || normalized == '女' || normalized == '女性') {
    return _GenderMark.female;
  }
  return null;
}

String _friendGenderDisplayLabel(String? value) {
  final normalized = value?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return '未设置';
  if (normalized == 'male' || normalized == '男' || normalized == '男性') {
    return '男';
  }
  if (normalized == 'female' || normalized == '女' || normalized == '女性') {
    return '女';
  }
  if (normalized == 'other' || normalized == '其他') return '其他';
  if (normalized == 'unset' || normalized == 'unknown') return '未设置';
  return value!.trim();
}

class _GenderOption {
  final String label;
  final String apiValue;

  const _GenderOption(this.label, this.apiValue);
}

class _FriendGenderPicker extends StatelessWidget {
  const _FriendGenderPicker();

  static const _options = [
    _GenderOption('男', 'male'),
    _GenderOption('女', 'female'),
    _GenderOption('其他', 'other'),
    _GenderOption('未设置', 'unset'),
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final option in _options)
            ListTile(
              title: Text(
                option.label,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: colorScheme.onSurface),
              ),
              onTap: () => Navigator.of(context).pop(option),
            ),
          const Divider(height: 1),
          ListTile(
            title: Text(
              '取消',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: colorScheme.onSurface),
            ),
            onTap: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}

class _GenderIcon extends StatelessWidget {
  final _GenderMark mark;

  const _GenderIcon({required this.mark});

  @override
  Widget build(BuildContext context) {
    final isMale = mark == _GenderMark.male;
    return Container(
      width: 17,
      height: 17,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: isMale ? const Color(0xFF5AA7FF) : const Color(0xFFFF7DA7),
        shape: BoxShape.circle,
      ),
      child: Icon(
        isMale ? Icons.north_east : Icons.add,
        size: isMale ? 12 : 13,
        color: Colors.white,
      ),
    );
  }
}

const _kFriendProfileExtraPrefix = 'friend_profile_extra_';
const _kFriendCommonGroupsPrefix = 'friend_common_groups_';
const _friendProfileFallbackRefreshInterval = Duration(hours: 6);

class FriendDetailsPage extends ConsumerStatefulWidget {
  final UserProfile profile;
  final String initialRemark;
  final Future<String?> Function(String currentRemark) onEditRemark;

  const FriendDetailsPage({
    super.key,
    required this.profile,
    required this.initialRemark,
    required this.onEditRemark,
  });

  @override
  ConsumerState<FriendDetailsPage> createState() => _FriendDetailsPageState();
}

class _FriendDetailsPageState extends ConsumerState<FriendDetailsPage> {
  late String _remark;
  late String _phone;
  late String _gender;
  late List<String> _tags;
  late String _region;
  late String _signature;
  String _note = '';
  String _source = '';
  String _addedAt = '';
  int _commonGroupCount = 0;
  DateTime? _extraSyncedAt;

  @override
  void initState() {
    super.initState();
    _remark = widget.initialRemark;
    _phone = widget.profile.mobile?.trim() ?? '';
    _gender = _friendGenderDisplayLabel(widget.profile.gender);
    _tags = List<String>.from(widget.profile.tags);
    _region = widget.profile.region?.trim() ?? '';
    _signature = widget.profile.signature?.trim() ?? '';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadExtraThenMaybeRefresh();
    });
  }

  Future<void> _loadExtraThenMaybeRefresh() async {
    final hasCache = await _loadExtra();
    if (!hasCache || _shouldFallbackRefresh(_extraSyncedAt)) {
      await _syncExtraFromRemote();
    }
  }

  Future<void> _editRemark() async {
    if (!widget.profile.isFriend) return;
    final updated = await widget.onEditRemark(_remark);
    if (!mounted || updated == null) return;
    setState(() => _remark = updated);
  }

  Future<bool> _loadExtra() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return false;
    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      final raw =
          box.get('$_kFriendProfileExtraPrefix${widget.profile.userId}');
      if (raw == null) return false;
      final map = jsonDecode(raw as String) as Map<String, dynamic>;
      if (!mounted) return false;
      setState(() {
        _phone = (map['phone'] as String?)?.trim().isNotEmpty == true
            ? (map['phone'] as String).trim()
            : _phone;
        _gender = _friendGenderDisplayLabel(map['gender'] as String?) != '未设置'
            ? _friendGenderDisplayLabel(map['gender'] as String?)
            : _gender;
        _tags = _parseTags(map['tags']);
        if (_tags.isEmpty) {
          _tags = List<String>.from(widget.profile.tags);
        }
        _region = (map['region'] as String?)?.trim().isNotEmpty == true
            ? (map['region'] as String).trim()
            : _region;
        _signature = (map['signature'] as String?)?.trim().isNotEmpty == true
            ? (map['signature'] as String).trim()
            : _signature;
        _note = map['note'] as String? ?? '';
        _source = map['source'] as String? ?? '';
        _addedAt = map['addedAt'] as String? ?? '';
        _commonGroupCount = map['commonGroupCount'] as int? ?? 0;
        _extraSyncedAt = _parseDateTime(map['syncedAt']);
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _saveExtraLocal() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      await box.put(
        '$_kFriendProfileExtraPrefix${widget.profile.userId}',
        jsonEncode({
          'phone': _phone,
          'gender': _gender,
          'tags': _tags,
          'region': _region,
          'signature': _signature,
          'note': _note,
          'source': _source,
          'addedAt': _addedAt,
          'commonGroupCount': _commonGroupCount,
          'syncedAt': (_extraSyncedAt ?? DateTime.now()).toIso8601String(),
        }),
      );
    } catch (_) {}
  }

  Future<void> _syncExtraFromRemote() async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/friends/${widget.profile.userId}/profile-extra',
      );
      final data = resp.data?['data'] as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _phone =
            data['phone'] as String? ?? data['mobile'] as String? ?? _phone;
        final remoteGender =
            _friendGenderDisplayLabel(data['gender'] as String?);
        if (remoteGender != '未设置') _gender = remoteGender;
        final remoteTags = _parseTags(data['tags']);
        if (remoteTags.isNotEmpty) _tags = remoteTags;
        _region =
            data['region'] as String? ?? data['location'] as String? ?? _region;
        _signature = data['signature'] as String? ?? _signature;
        _note = data['note'] as String? ?? _note;
        _source = data['source'] as String? ?? _source;
        _addedAt = data['addedAt'] as String? ??
            data['addedTime'] as String? ??
            data['createdAt'] as String? ??
            _addedAt;
        _commonGroupCount =
            data['commonGroupCount'] as int? ?? _commonGroupCount;
        _extraSyncedAt = DateTime.now();
      });
      await _saveExtraLocal();
    } catch (_) {
      // 查看链路本地优先；远端增量失败不打断页面。
    }
  }

  Future<void> _updateExtraRemote(Map<String, dynamic> payload) async {
    final dio = ref.read(dioProvider);
    await dio.put<Map<String, dynamic>>(
      '/api/client/v1/friends/${widget.profile.userId}/profile-extra',
      data: payload,
    );
  }

  void _showSaved() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已保存')),
    );
  }

  void _showSaveFailed() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('保存失败，请稍后再试')),
    );
  }

  Future<void> _editTextExtra({
    required String title,
    required String labelText,
    required String field,
    required String initialValue,
    String? hintText,
    TextInputType? keyboardType,
    int maxLength = 80,
    int maxLines = 1,
    required void Function(String value) apply,
  }) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => _FriendTextEditPage(
          title: title,
          labelText: labelText,
          hintText: hintText,
          initialValue: initialValue,
          keyboardType: keyboardType,
          maxLength: maxLength,
          maxLines: maxLines,
        ),
      ),
    );
    if (!mounted || result == null) return;
    final next = result.trim();
    try {
      await _updateExtraRemote({field: next});
      if (!mounted) return;
      setState(() => apply(next));
      await _saveExtraLocal();
      if (mounted) _showSaved();
    } catch (_) {
      if (mounted) _showSaveFailed();
    }
  }

  Future<void> _editPhone() async {
    await _editTextExtra(
      title: '电话',
      labelText: '电话',
      field: 'phone',
      initialValue: _phone,
      keyboardType: TextInputType.phone,
      maxLength: 30,
      apply: (value) => _phone = value,
    );
  }

  Future<void> _editGender() async {
    final result = await showModalBottomSheet<_GenderOption>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (context) => const _FriendGenderPicker(),
    );
    if (!mounted || result == null) return;
    try {
      await _updateExtraRemote({'gender': result.apiValue});
      if (!mounted) return;
      setState(() => _gender = result.label);
      await _saveExtraLocal();
      if (mounted) _showSaved();
    } catch (_) {
      if (mounted) _showSaveFailed();
    }
  }

  Future<void> _editTags() async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => _FriendTextEditPage(
          title: '标签',
          labelText: '标签',
          hintText: '多个标签用逗号分隔',
          initialValue: _tags.join('，'),
          maxLength: 80,
        ),
      ),
    );
    if (!mounted || result == null) return;
    final next = _parseTags(result);
    try {
      await _updateExtraRemote({'tags': next});
      if (!mounted) return;
      setState(() => _tags = next);
      await _saveExtraLocal();
      if (mounted) _showSaved();
    } catch (_) {
      if (mounted) _showSaveFailed();
    }
  }

  Future<void> _editNote() async {
    await _editTextExtra(
      title: '备注',
      labelText: '备注',
      field: 'note',
      initialValue: _note,
      maxLength: 200,
      maxLines: 5,
      apply: (value) => _note = value,
    );
  }

  void _openCommonGroups() {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => FriendCommonGroupsPage(
          friendUserId: widget.profile.userId,
          friendName: widget.profile.remarkName?.isNotEmpty == true
              ? widget.profile.remarkName!
              : widget.profile.name,
          count: _commonGroupCount,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final tagsText = _tagsText(_tags);

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: _text, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          '朋友资料',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w500,
            color: _text,
          ),
        ),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 8),
        children: [
          Container(
            color: colorScheme.surface,
            child: Column(
              children: [
                const _SectionHeader(label: '备注'),
                _InfoRow(
                  label: '备注名',
                  value: _remark.isEmpty ? '未设置' : _remark,
                  onTap: widget.profile.isFriend ? _editRemark : null,
                  showArrow: widget.profile.isFriend,
                ),
                _InfoRow(
                  label: '电话',
                  value: _phone.isNotEmpty ? _phone : '未设置',
                  onTap: _editPhone,
                  showArrow: true,
                ),
                _InfoRow(
                  label: '性别',
                  value: _gender,
                  onTap: _editGender,
                  showArrow: true,
                ),
                _InfoRow(
                  label: '标签',
                  value: tagsText,
                  onTap: _editTags,
                  showArrow: true,
                ),
                _InfoRow(
                  label: '备注',
                  value: _note.isNotEmpty ? _note : '未设置',
                  onTap: _editNote,
                  showArrow: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            color: colorScheme.surface,
            child: Column(
              children: [
                const _SectionHeader(label: '更多信息'),
                _InfoRow(
                  label: '我和他的共同群聊',
                  value: _commonGroupCount > 0 ? '$_commonGroupCount 个' : '暂无',
                  onTap: _openCommonGroups,
                  showArrow: true,
                ),
                _InfoRow(
                  label: '地区',
                  value: _region.isNotEmpty ? _region : '未设置',
                ),
                _InfoRow(
                  label: '签名',
                  value: _signature.isNotEmpty ? _signature : '未设置',
                ),
                _InfoRow(
                  label: '来源',
                  value: _source.isNotEmpty ? _source : '未设置',
                ),
                _InfoRow(
                  label: '添加时间',
                  value: _addedAt.isNotEmpty ? _addedAt : '未设置',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

bool _shouldFallbackRefresh(DateTime? syncedAt) {
  if (syncedAt == null) return true;
  return DateTime.now().difference(syncedAt) >
      _friendProfileFallbackRefreshInterval;
}

DateTime? _parseDateTime(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

class _FriendTextEditPage extends StatefulWidget {
  final String title;
  final String labelText;
  final String? hintText;
  final String initialValue;
  final TextInputType? keyboardType;
  final int maxLength;
  final int maxLines;

  const _FriendTextEditPage({
    required this.title,
    required this.labelText,
    this.hintText,
    required this.initialValue,
    this.keyboardType,
    required this.maxLength,
    this.maxLines = 1,
  });

  @override
  State<_FriendTextEditPage> createState() => _FriendTextEditPageState();
}

class _FriendTextEditPageState extends State<_FriendTextEditPage> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    Navigator.of(context).pop(_controller.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消', style: TextStyle(color: _text)),
        ),
        leadingWidth: 64,
        title: Text(
          widget.title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w500,
            color: _text,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _submit,
            child: const Text(
              '完成',
              style: TextStyle(
                color: _primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 12),
        children: [
          Container(
            color: colorScheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
            child: TextField(
              controller: _controller,
              autofocus: true,
              keyboardType: widget.keyboardType,
              maxLength: widget.maxLength,
              minLines: widget.maxLines,
              maxLines: widget.maxLines,
              style: TextStyle(fontSize: 16, color: colorScheme.onSurface),
              decoration: InputDecoration(
                labelText: widget.labelText,
                hintText: widget.hintText,
                counterText: '',
                border: InputBorder.none,
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(
                          Icons.cancel,
                          size: 18,
                          color: Colors.grey,
                        ),
                        onPressed: () => setState(_controller.clear),
                      ),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _submit(),
            ),
          ),
        ],
      ),
    );
  }
}

class FriendCommonGroupsPage extends ConsumerStatefulWidget {
  final String friendUserId;
  final String friendName;
  final int count;

  const FriendCommonGroupsPage({
    super.key,
    required this.friendUserId,
    required this.friendName,
    required this.count,
  });

  @override
  ConsumerState<FriendCommonGroupsPage> createState() =>
      _FriendCommonGroupsPageState();
}

class _FriendCommonGroupsPageState
    extends ConsumerState<FriendCommonGroupsPage> {
  List<_FriendCommonGroup> _groups = const [];
  DateTime? _syncedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadThenMaybeRefresh();
    });
  }

  Future<void> _loadThenMaybeRefresh() async {
    final hasCache = await _loadCached();
    if (!hasCache || _shouldFallbackRefresh(_syncedAt)) {
      await _syncRemote();
    }
  }

  Future<bool> _loadCached() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return false;
    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      final raw = box.get('$_kFriendCommonGroupsPrefix${widget.friendUserId}');
      if (raw == null) return false;
      final map = jsonDecode(raw as String) as Map<String, dynamic>;
      final items = map['items'];
      if (!mounted) return false;
      setState(() {
        _groups = _FriendCommonGroup.listFrom(items);
        _syncedAt = _parseDateTime(map['syncedAt']);
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _saveCached() async {
    final space = ref.read(currentSpaceProvider);
    if (space == null) return;
    try {
      final box = await HiveStorage.profileBox(space.spaceId);
      await box.put(
        '$_kFriendCommonGroupsPrefix${widget.friendUserId}',
        jsonEncode({
          'items': _groups.map((e) => e.toJson()).toList(growable: false),
          'syncedAt': (_syncedAt ?? DateTime.now()).toIso8601String(),
        }),
      );
    } catch (_) {}
  }

  Future<void> _syncRemote() async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/friends/${widget.friendUserId}/common-groups',
      );
      final body = resp.data?['data'];
      final items = body is Map<String, dynamic> ? body['items'] : body;
      if (!mounted) return;
      setState(() {
        _groups = _FriendCommonGroup.listFrom(items);
        _syncedAt = DateTime.now();
      });
      await _saveCached();
    } catch (_) {
      // 共同群聊查看走本地快照；接口不可用时不打断资料页体验。
    }
  }

  void _openGroup(_FriendCommonGroup group) {
    final conversationId =
        group.conversationId.isNotEmpty ? group.conversationId : group.groupId;
    if (conversationId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('暂时无法打开该群聊')),
      );
      return;
    }
    context.push('/chat/$conversationId', extra: {
      'title': group.title,
      'isGroup': true,
      'avatarUrl': group.avatarUrl,
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: _text, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          '共同群聊',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w500,
            color: _text,
          ),
        ),
        centerTitle: true,
      ),
      body: _groups.isEmpty
          ? Center(
              child: Text(
                widget.count > 0 ? '共同群聊数据同步中' : '暂无共同群聊',
                style: const TextStyle(fontSize: 15, color: Colors.grey),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.only(top: 8),
              itemCount: _groups.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final group = _groups[index];
                return ListTile(
                  tileColor: colorScheme.surface,
                  leading: UserAvatar(
                    avatarUrl: group.avatarUrl,
                    name: group.title,
                    size: 44,
                    borderRadius: 8,
                  ),
                  title: Text(
                    group.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: _text,
                    ),
                  ),
                  subtitle: group.memberCount > 0
                      ? Text('${group.memberCount} 人')
                      : null,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: Colors.grey.shade400,
                  ),
                  onTap: () => _openGroup(group),
                );
              },
            ),
    );
  }
}

class _FriendCommonGroup {
  final String groupId;
  final String conversationId;
  final String title;
  final String? avatarUrl;
  final int memberCount;

  const _FriendCommonGroup({
    required this.groupId,
    required this.conversationId,
    required this.title,
    this.avatarUrl,
    this.memberCount = 0,
  });

  factory _FriendCommonGroup.fromJson(Map<String, dynamic> json) {
    return _FriendCommonGroup(
      groupId: json['groupId'] as String? ?? '',
      conversationId:
          json['conversationId'] as String? ?? json['chatId'] as String? ?? '',
      title: json['title'] as String? ??
          json['groupName'] as String? ??
          json['name'] as String? ??
          '群聊',
      avatarUrl: json['avatarUrl'] as String?,
      memberCount: json['memberCount'] as int? ?? 0,
    );
  }

  static List<_FriendCommonGroup> listFrom(Object? raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => _FriendCommonGroup.fromJson(
              e.cast<String, dynamic>(),
            ))
        .where((e) => e.title.trim().isNotEmpty)
        .toList(growable: false);
  }

  Map<String, dynamic> toJson() {
    return {
      'groupId': groupId,
      'conversationId': conversationId,
      'title': title,
      'avatarUrl': avatarUrl,
      'memberCount': memberCount,
    };
  }
}

class FriendRemarkEditPage extends StatefulWidget {
  final String initialRemark;
  final String originalName;
  final Future<bool> Function(String remark) onSave;

  const FriendRemarkEditPage({
    super.key,
    required this.initialRemark,
    required this.originalName,
    required this.onSave,
  });

  @override
  State<FriendRemarkEditPage> createState() => _FriendRemarkEditPageState();
}

class _FriendRemarkEditPageState extends State<FriendRemarkEditPage> {
  late final TextEditingController _controller;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialRemark);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() => _saving = true);
    final remark = _controller.text.trim();
    final saved = await widget.onSave(remark);
    if (!mounted) return;
    if (saved) {
      Navigator.of(context).pop(remark);
    } else {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('取消', style: TextStyle(color: _text)),
        ),
        leadingWidth: 64,
        title: const Text(
          '设置备注',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w500,
            color: _text,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _saving ? null : _submit,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _primary,
                    ),
                  )
                : const Text(
                    '完成',
                    style: TextStyle(
                      color: _primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 12),
        children: [
          Container(
            color: colorScheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
            child: TextField(
              controller: _controller,
              autofocus: true,
              enabled: !_saving,
              maxLength: 20,
              style: TextStyle(fontSize: 16, color: colorScheme.onSurface),
              decoration: InputDecoration(
                labelText: '备注名',
                hintText: '请输入备注名',
                counterText: '',
                border: InputBorder.none,
                suffixIcon: _controller.text.isEmpty || _saving
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.cancel,
                            size: 18, color: Colors.grey),
                        onPressed: () => setState(_controller.clear),
                      ),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _submit(),
            ),
          ),
          if (widget.originalName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Text(
                '昵称：${widget.originalName}',
                style: TextStyle(
                  fontSize: 13,
                  color: colorScheme.onSurface.withValues(alpha: 0.46),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helper widgets
// ---------------------------------------------------------------------------
String _tagsText(List<String> tags) {
  if (tags.isEmpty) return '未设置';
  return tags.join('，');
}

class _FriendSummaryBlock extends StatelessWidget {
  final UserProfile profile;
  final String remark;
  final VoidCallback onTap;

  const _FriendSummaryBlock({
    required this.profile,
    required this.remark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final mobile = profile.mobile?.trim();
    final tags = _tagsText(profile.tags);
    final lines = <_SummaryLine>[
      if (mobile?.isNotEmpty == true) _SummaryLine(label: '电话', value: mobile!),
      _SummaryLine(label: '标签', value: tags),
      if (remark.trim().isNotEmpty)
        _SummaryLine(label: '备注', value: remark.trim()),
    ];
    return InkWell(
      onTap: onTap,
      child: Container(
        color: Theme.of(context).colorScheme.surface,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 54,
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      '朋友资料',
                      style: TextStyle(
                        fontSize: 17,
                        color: _text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: Colors.grey.shade400,
                    size: 22,
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: lines,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 46,
            child: Text(
              label,
              style: const TextStyle(fontSize: 15, color: Colors.grey),
            ),
          ),
          Expanded(
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, color: _text),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileActionRowData {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _ProfileActionRowData({
    required this.icon,
    required this.label,
    this.onTap,
  });
}

class _ProfileActionSection extends StatelessWidget {
  final List<_ProfileActionRowData> rows;

  const _ProfileActionSection({required this.rows});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            _ProfileCenterActionRow(row: rows[i]),
            if (i < rows.length - 1)
              const Divider(
                height: 1,
                thickness: 0.5,
                color: Color(0xFFE5E5E5),
              ),
          ],
        ],
      ),
    );
  }
}

class _ProfileCenterActionRow extends StatelessWidget {
  final _ProfileActionRowData row;

  const _ProfileCenterActionRow({required this.row});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: row.onTap,
        child: SizedBox(
          height: 64,
          width: double.infinity,
          child: Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(row.icon, size: 23, color: const Color(0xFF576B95)),
                const SizedBox(width: 8),
                Text(
                  row.label,
                  style: const TextStyle(
                    fontSize: 17,
                    color: Color(0xFF576B95),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionSheetItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool isCancel;

  const _ActionSheetItem({
    required this.label,
    required this.onTap,
    this.isCancel = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 54,
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 17,
              color: isCancel ? _text : Theme.of(context).colorScheme.primary,
              fontWeight: isCancel ? FontWeight.w500 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;

  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          label,
          style: const TextStyle(fontSize: 13, color: Colors.grey),
        ),
      ),
    );
  }
}

class _AdminCustomerActions extends ConsumerStatefulWidget {
  final UserProfile profile;

  const _AdminCustomerActions({required this.profile});

  @override
  ConsumerState<_AdminCustomerActions> createState() =>
      _AdminCustomerActionsState();
}

class _AdminCustomerActionsState extends ConsumerState<_AdminCustomerActions> {
  List<String>? _tagsOverride;
  bool _savingTags = false;

  UserProfile get profile => widget.profile;

  void _comingSoon(BuildContext context, String action) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$action功能即将上线')),
    );
  }

  Future<void> _showMissingCustomerChatApi(BuildContext context) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('缺少服务端接口'),
          content: const SingleChildScrollView(
            child: Text(
              '查看客户聊天信息需要服务端提供对应的会话查询接口。\n\n'
              '建议接口：GET /api/admin/v1/customer-service/center/threads?customerUserId={userId}\n'
              '或在客户资料接口中返回可查看的会话 ID 列表。',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('知道了'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _showAssignStaffSheet(
      BuildContext context, WidgetRef ref) async {
    final reasonController = TextEditingController(text: '客户服务分配');
    final members = ref.read(tenantMembersProvider).valueOrNull ?? const [];
    final staff = members.where(_canServeCustomer).toList();

    if (staff.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('暂无可分配客服')),
      );
      reasonController.dispose();
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
            decoration: BoxDecoration(
              color: Theme.of(ctx).colorScheme.surface,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  '分配客服',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: _text,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '选择新的负责客服，操作会以客服线程转接方式记录。',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: reasonController,
                  minLines: 2,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: '填写分配原因，例如回访、投诉升级、离职交接',
                    filled: true,
                    fillColor: const Color(0xFFF7F7F7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: staff.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, index) {
                      final member = staff[index];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: UserAvatar(
                          avatarUrl: member.avatarUrl,
                          name: member.displayName,
                          size: 38,
                          borderRadius: 10,
                        ),
                        title: Text(
                          member.displayName,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w500),
                        ),
                        subtitle: Text(member.customerTag ?? '客服'),
                        onTap: () async {
                          Navigator.pop(ctx);
                          await _assignStaff(
                            context,
                            ref,
                            member,
                            reasonController.text.trim(),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    reasonController.dispose();
  }

  bool _canServeCustomer(Contact contact) {
    return AppPermissions.canBeAssignedAsCustomerService(
      roleTag: contact.customerTag,
    );
  }

  Future<void> _assignStaff(
    BuildContext context,
    WidgetRef ref,
    Contact staff,
    String reason,
  ) async {
    try {
      final repo = ref.read(customerServiceRepositoryProvider);
      final thread = await repo.outboundDirectCustomer(
        customerUserId: profile.userId,
        reason: reason.isEmpty ? '所有者分配客服' : reason,
        fallbackTitle: profile.name,
        fallbackAvatarUrl: profile.avatarUrl,
      );
      await repo.transferDirectCustomer(
        threadId: thread.threadId,
        toStaffUserId: staff.userId,
        reason: reason.isEmpty ? '所有者分配客服' : reason,
        fallbackTitle: profile.name,
        fallbackAvatarUrl: profile.avatarUrl,
      );
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('已分配给 ${staff.displayName}')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('分配客服失败：$e')),
      );
    }
  }

  Future<void> _editEnterpriseTags(List<String> currentTags) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => _FriendTextEditPage(
          title: '企业标签',
          labelText: '企业标签',
          hintText: '多个标签用逗号分隔',
          initialValue: currentTags.join('，'),
          maxLength: 120,
          maxLines: 3,
        ),
      ),
    );
    if (result == null) return;
    final nextTags = _parseTags(result);
    if (_savingTags) return;

    setState(() => _savingTags = true);
    try {
      await ref.read(adminCustomerServiceRepositoryProvider).updateCustomerTags(
            customerUserId: profile.userId,
            tags: nextTags,
          );
      ref.invalidate(adminCustomersProvider);
      ref.invalidate(adminCustomerDetailProvider(profile.userId));
      if (!mounted) return;
      setState(() {
        _tagsOverride = nextTags;
        _savingTags = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('已保存企业标签')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _savingTags = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('保存标签失败，请稍后重试')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final isOwner = space?.isOwner ?? false;
    final detailAsync = ref.watch(adminCustomerDetailProvider(profile.userId));
    final currentTags =
        _tagsOverride ?? detailAsync.valueOrNull?.tags ?? profile.tags;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: InkWell(
            onTap: _savingTags ? null : () => _editEnterpriseTags(currentTags),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '企业标签',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: _text,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '用于客户管理筛选，企业内共享',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      _savingTags ? '保存中...' : _tagsText(currentTags),
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 14,
                        color: currentTags.isEmpty
                            ? Colors.grey
                            : const Color(0xFF374151),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right,
                    color: Colors.grey.shade400,
                    size: 22,
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F7F7),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Text(
            '所有者可调整该客户的负责客服。查看服务会话记录需要服务端提供对应接口。',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey,
              height: 1.4,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: isOwner
                    ? () => _showMissingCustomerChatApi(context)
                    : () => _comingSoon(context, '查看聊天信息'),
                icon: const Icon(Icons.chat_outlined, size: 18),
                label: const Text('查看聊天信息'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _primary,
                  side: const BorderSide(color: _primary, width: 1.5),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: isOwner
                    ? () => _showAssignStaffSheet(context, ref)
                    : () => _comingSoon(context, '分配客服'),
                icon: const Icon(Icons.support_agent, size: 18),
                label: const Text('分配客服'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => context.push('/group-list'),
          icon: const Icon(Icons.groups_outlined, size: 18),
          label: const Text('该客户的服务群'),
          style: OutlinedButton.styleFrom(
            foregroundColor: _primary,
            side: const BorderSide(color: _primary, width: 1.5),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback? onTap;
  final bool showArrow;

  const _InfoRow({
    required this.label,
    required this.value,
    this.onTap,
    this.showArrow = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 62),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 150,
              child: Text(
                label,
                style: const TextStyle(fontSize: 16, color: _text),
              ),
            ),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
            if (showArrow) ...[
              const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
            ],
          ],
        ),
      ),
    );
  }
}
