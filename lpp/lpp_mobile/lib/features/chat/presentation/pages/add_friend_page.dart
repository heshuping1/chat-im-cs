import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/contacts/application/friend_relation_status.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

const _primary = Color(0xFF00B27A);
const _bg = Color(0xFFEFEFEF);
const _text = Color(0xFF2C2C2C);

// ---------------------------------------------------------------------------
// 搜索结果用户模型
// ---------------------------------------------------------------------------

class _UserResult {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? lppId;
  final String? signature;
  final int userType; // 1=客户, 2=员工/客服（对照 SearchUserDto）
  final String? matchType;
  final bool? isFriend;

  const _UserResult({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.lppId,
    this.signature,
    this.userType = 0,
    this.matchType,
    this.isFriend,
  });

  factory _UserResult.fromJson(Map<String, dynamic> json) {
    return _UserResult(
      userId: json['userId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      lppId: json['lppId'] as String?,
      signature: json['signature'] as String?,
      userType: json['userType'] as int? ?? 0,
      matchType: json['matchType'] as String?,
      isFriend: json['isFriend'] as bool?,
    );
  }
}

// ---------------------------------------------------------------------------
// AddFriendPage
// ---------------------------------------------------------------------------

class AddFriendPage extends ConsumerStatefulWidget {
  const AddFriendPage({super.key});

  @override
  ConsumerState<AddFriendPage> createState() => _AddFriendPageState();
}

class _AddFriendPageState extends ConsumerState<AddFriendPage> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  bool _loading = false;
  String? _submittingUserId;
  List<_UserResult> _results = [];
  String? _errorMsg;
  final Set<String> _localPendingUserIds = <String>{};

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final l10n = AppLocalizations.of(context);
    final space = ref.read(currentSpaceProvider);
    if (space?.canAddFriend == false) {
      setState(() {
        _results = [];
        _errorMsg = '当前企业已开启客户隔离，暂不支持搜索添加好友';
      });
      return;
    }
    final q = _searchCtrl.text.trim();
    if (q.isEmpty) return;

    setState(() {
      _loading = true;
      _errorMsg = null;
      _results = [];
    });

    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.get<Map<String, dynamic>>(
        '/api/client/v1/search/users',
        queryParameters: {'keyword': q},
      );
      final items = _extractSearchItems(resp.data);
      await _refreshFriendRelations();
      if (!mounted) return;
      setState(() {
        _results = items
            .map((e) => _UserResult.fromJson(e as Map<String, dynamic>))
            .where((user) => user.userId.isNotEmpty)
            .toList();
        if (_results.isEmpty) _errorMsg = l10n.friendSearchEmpty;
      });
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      setState(() {
        _errorMsg =
            err is ServerError ? err.message : l10n.commonOperationFailed;
      });
    } catch (_) {
      setState(() => _errorMsg = l10n.commonOperationFailed);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> _extractSearchItems(Map<String, dynamic>? data) {
    final payload = data?['data'];
    if (payload is List<dynamic>) return payload;
    if (payload is Map<String, dynamic>) {
      final items = payload['items'];
      if (items is List<dynamic>) return items;
    }
    return const [];
  }

  bool _isSelf(_UserResult user) {
    final currentUserId = ref.read(currentSpaceProvider)?.userId;
    return currentUserId != null && currentUserId == user.userId;
  }

  bool _shouldOpenChat(_UserResult user) {
    final space = ref.read(currentSpaceProvider);
    final relation = _relationFor(user);
    if (relation.status == FriendRelationStatus.self) return false;
    if (relation.status == FriendRelationStatus.friend) return true;
    if (space == null || space.isPersonal) return false;
    return user.userType == 2;
  }

  FriendRelationSnapshot _relationFor(_UserResult user) {
    return resolveFriendRelation(
      userId: user.userId,
      currentUserId: ref.read(currentSpaceProvider)?.userId,
      friends: ref.read(friendsProvider).valueOrNull ?? const [],
      requests: ref.read(friendRequestsProvider).valueOrNull ?? const [],
      isFriend: user.isFriend,
      localOutgoingPending: _localPendingUserIds.contains(user.userId),
    );
  }

  Future<void> _refreshFriendRelations() async {
    try {
      await ref.read(friendsProvider.notifier).refresh();
    } catch (_) {
      // 搜索结果仍可展示；好友关系用搜索返回的 isFriend 或本地缓存兜底。
    }
    try {
      final _ = await ref.refresh(friendRequestsProvider.future);
      ref.invalidate(pendingFriendRequestsProvider);
    } catch (_) {
      // 待验证申请读取失败不影响搜索结果展示。
    }
  }

  Future<void> _sendFriendRequest(_UserResult user) async {
    final l10n = AppLocalizations.of(context);
    final space = ref.read(currentSpaceProvider);
    if (space?.canAddFriend == false) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('当前企业已开启客户隔离，暂不支持添加好友')),
      );
      return;
    }
    if (_isSelf(user)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.addFriendCannotAddSelf)),
      );
      return;
    }

    setState(() => _submittingUserId = user.userId);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/api/client/v1/friends/request',
          data: {'toUserId': user.userId});
      _localPendingUserIds.add(user.userId);
      await _refreshFriendRelations();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.friendRequestSent)));
      }
    } on DioException catch (e) {
      final err = ErrorHandler.fromDioException(e);
      if (mounted) {
        if (_isAlreadyFriendError(err)) {
          _localPendingUserIds.remove(user.userId);
          await _refreshFriendRelations();
          if (mounted) _openProfile(user);
        } else if (_isPendingFriendRequestError(err)) {
          _localPendingUserIds.add(user.userId);
          await _refreshFriendRelations();
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('好友申请已发送，等待对方通过')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(_friendRequestErrorMessage(l10n, err))));
        }
      }
    } finally {
      if (mounted) setState(() => _submittingUserId = null);
    }
  }

  bool _isAlreadyFriendError(AppError err) {
    if (err is! ServerError) return false;
    return isAlreadyFriendErrorCode(err.code, err.message);
  }

  bool _isPendingFriendRequestError(AppError err) {
    if (err is! ServerError) return false;
    return isFriendRequestPendingErrorCode(err.code, err.message);
  }

  String _friendRequestErrorMessage(AppLocalizations l10n, AppError err) {
    if (err is ServerError &&
        err.message.toLowerCase().contains('invalid operation')) {
      return l10n.addFriendUnsupportedUser;
    }
    return err is ServerError ? err.message : l10n.friendRequestFailed;
  }

  Future<void> _openDirectChat(_UserResult user) async {
    setState(() => _submittingUserId = user.userId);
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats',
        data: {'peerUserId': user.userId},
      );
      final data = resp.data?['data'] as Map<String, dynamic>?;
      final chatId = data?['chatId'] as String?;
      if (mounted && chatId != null && chatId.isNotEmpty) {
        context.push('/chat/$chatId', extra: {
          'peerName': user.displayName,
          'title': user.displayName,
          'peerAvatarUrl': user.avatarUrl,
          'avatarUrl': user.avatarUrl,
          'isGroup': false,
          'peerUserId': user.userId,
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text(AppLocalizations.of(context).commonOperationFailed)),
        );
      }
    } finally {
      if (mounted) setState(() => _submittingUserId = null);
    }
  }

  void _openProfile(_UserResult user) {
    context.push('/profile/${user.userId}');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: _bg,
      body: Column(
        children: [
          _buildHeader(l10n),
          const SizedBox(height: 8),
          _buildOptions(),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: _primary),
            )
          else if (_results.isNotEmpty)
            Expanded(child: _buildResults(l10n))
          else if (_errorMsg != null)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  const Icon(Icons.search, size: 48, color: Color(0xFFAEAEB2)),
                  const SizedBox(height: 12),
                  Text(_errorMsg!,
                      style: const TextStyle(
                          color: Color(0xFF8E8E93), fontSize: 14)),
                ],
              ),
            )
          else if (_query.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  const Icon(Icons.search, size: 48, color: Color(0xFFAEAEB2)),
                  const SizedBox(height: 12),
                  Text(l10n.addFriendSearchHint,
                      style: const TextStyle(
                          color: Color(0xFF8E8E93), fontSize: 14)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(AppLocalizations l10n) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios,
                        color: _text, size: 20),
                    onPressed: () => context.pop(),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(l10n.addFriendTitle,
                          style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: _text)),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 40,
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: Theme.of(context).colorScheme.outline),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 10),
                          const Icon(Icons.search,
                              size: 16, color: Color(0xFFAEAEB2)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: TextField(
                              controller: _searchCtrl,
                              onChanged: (v) => setState(() => _query = v),
                              onSubmitted: (_) => _search(),
                              keyboardType: TextInputType.emailAddress,
                              style:
                                  const TextStyle(fontSize: 15, color: _text),
                              decoration: InputDecoration(
                                hintText: l10n.addFriendSearchHint,
                                hintStyle: const TextStyle(
                                    color: Color(0xFFAEAEB2), fontSize: 15),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _search,
                    child: Text(l10n.commonSearch,
                        style: const TextStyle(
                            fontSize: 15,
                            color: _primary,
                            fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptions() {
    final canAddFriend = ref.watch(currentSpaceProvider)?.canAddFriend ?? true;
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          if (canAddFriend) ...[
            _OptionTile(
              icon: Icons.qr_code_scanner,
              label: '扫一扫',
              onTap: () => context.push('/scan'),
            ),
            Divider(height: 1, indent: 56, color: Colors.grey.shade100),
          ],
          _OptionTile(
            icon: Icons.qr_code,
            label: '我的二维码',
            onTap: () => context.push('/qrcode'),
          ),
        ],
      ),
    );
  }

  Widget _buildResults(AppLocalizations l10n) {
    ref.watch(friendsProvider);
    ref.watch(friendRequestsProvider);
    return ListView.builder(
      padding: const EdgeInsets.only(top: 8),
      itemCount: _results.length,
      itemBuilder: (context, i) {
        final user = _results[i];
        final relation = _relationFor(user);
        final isSelf = relation.status == FriendRelationStatus.self;
        final isFriend = relation.status == FriendRelationStatus.friend;
        final isOutgoingPending =
            relation.status == FriendRelationStatus.outgoingPending;
        final isIncomingPending =
            relation.status == FriendRelationStatus.incomingPending;
        final opensChat = _shouldOpenChat(user);
        final isSubmitting = _submittingUserId == user.userId;
        final buttonLabel = isSelf
            ? '自己'
            : isFriend
                ? '查看'
                : isOutgoingPending
                    ? '等待验证'
                    : isIncomingPending
                        ? '去处理'
                        : opensChat
                            ? l10n.friendSendMessage
                            : l10n.addFriendButton;
        return Container(
          color: Theme.of(context).colorScheme.surface,
          margin: const EdgeInsets.only(bottom: 1),
          child: ListTile(
            leading: UserAvatar(
              avatarUrl: user.avatarUrl,
              name: user.displayName,
              size: 48,
              borderRadius: 24,
            ),
            title: Text(user.displayName,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w500, color: _text)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (user.lppId != null)
                  Text('${l10n.profilePageLppId}: ${user.lppId}',
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFF8E8E93))),
                if (user.signature != null && user.signature!.isNotEmpty)
                  Text(user.signature!,
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFF8E8E93)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
              ],
            ),
            trailing: ElevatedButton(
              onPressed: isSubmitting || isSelf || isOutgoingPending
                  ? null
                  : () {
                      if (isIncomingPending) {
                        context.push('/new-friends');
                        return;
                      }
                      if (isFriend) {
                        _openProfile(user);
                        return;
                      }
                      if (opensChat) {
                        _openDirectChat(user);
                        return;
                      }
                      _sendFriendRequest(user);
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                minimumSize: const Size(72, 32),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                textStyle: const TextStyle(fontSize: 13),
              ),
              child: isSubmitting
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(buttonLabel),
            ),
            onTap: () => _openProfile(user),
          ),
        );
      },
    );
  }
}

class _OptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _OptionTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration:
                  const BoxDecoration(color: _primary, shape: BoxShape.circle),
              child: Icon(icon,
                  color: Theme.of(context).colorScheme.surface, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 16, color: _text)),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFFAEAEB2), size: 20),
          ],
        ),
      ),
    );
  }
}
