import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';

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
const double _groupManageSideInset = 8;

// ---------------------------------------------------------------------------
// GroupManagePage
// ---------------------------------------------------------------------------

class GroupManagePage extends ConsumerStatefulWidget {
  final String groupId;

  const GroupManagePage({super.key, required this.groupId});

  @override
  ConsumerState<GroupManagePage> createState() => _GroupManagePageState();
}

class _GroupManagePageState extends ConsumerState<GroupManagePage> {
  final Set<String> _savingKeys = {};

  bool _isSaving(String key) => _savingKeys.contains(key);

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(groupDetailProvider(widget.groupId));

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('群管理',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w600, color: _text)),
        centerTitle: true,
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('加载失败')),
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
          final isSuperAdmin = permissions.canDismiss;
          final isAdminOrAbove = permissions.canManage;

          return ListView(
            children: [
              const SizedBox(height: 16),

              _CardSection(
                children: [
                  _NavTile(
                    label: '群聊名称',
                    value: detail.title,
                    onTap: () => _editGroupName(detail),
                  ),
                  const _Divider(),
                  _NavTile(
                    label: '群二维码',
                    onTap: () => context
                        .push('/group-settings/${widget.groupId}/qrcode'),
                  ),
                  const _Divider(),
                  _NavTile(
                    label: '群公告',
                    onTap: () => context.push(
                      '/group-settings/${widget.groupId}/announcement',
                      extra: {'isAdminOrAbove': isAdminOrAbove},
                    ),
                  ),
                  if (isAdminOrAbove) ...[
                    const _Divider(),
                    _NavTile(
                      label: '入群申请',
                      onTap: () => context.push(
                          '/group-manage/${widget.groupId}/join-requests'),
                    ),
                  ],
                  const _Divider(),
                  _NavTile(
                    label: '备注',
                    onTap: () => context.push(
                      '/group-settings/${widget.groupId}/remark',
                      extra: {
                        'groupName': detail.title,
                        'groupAvatarUrl': detail.avatarUrl,
                      },
                    ),
                  ),
                  if (isAdminOrAbove) ...[
                    const _Divider(),
                    _NavTile(
                      label: '群管理员',
                      onTap: () => context
                          .push('/group-manage/${widget.groupId}/admins'),
                    ),
                    const _Divider(),
                    _NavTile(
                      label: '成员禁言',
                      onTap: () => context
                          .push('/group-manage/${widget.groupId}/member-mute'),
                    ),
                  ],
                  if (isSuperAdmin) ...[
                    const _Divider(),
                    _NavTile(
                      label: '群主管理权转让',
                      onTap: () => context.push(
                          '/group-manage/${widget.groupId}/transfer-owner'),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 16),

              // ── 开关设置组 ──────────────────────────────────────────────
              _CardSection(
                children: [
                  _SwitchTile(
                    label: '二维码进群',
                    subtitle:
                        isAdminOrAbove ? '开启后，成员可通过二维码加入群聊' : '仅群主/管理员可修改',
                    value: detail.allowQrCodeJoin,
                    enabled: !_isSaving('allowQrCodeJoin'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove && !_isSaving('allowQrCodeJoin')
                        ? (v) async => _updateSettings(
                              'allowQrCodeJoin',
                              {'allowQrCodeJoin': v},
                            )
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '进群需要群主/群管理员确认',
                    subtitle: isAdminOrAbove ? '开启后，申请入群需审批通过' : '仅群主/管理员可修改',
                    value: detail.requireApproval,
                    enabled: !_isSaving('requireApproval'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove && !_isSaving('requireApproval')
                        ? (v) async => _updateSettings(
                              'requireApproval',
                              {'requireApproval': v},
                            )
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '允许普通成员修改群聊名称',
                    subtitle:
                        isAdminOrAbove ? '关闭后，仅群主和管理员可修改群名称' : '仅群主/管理员可修改',
                    value: detail.allowMemberModifyTitle,
                    enabled: !_isSaving('allowMemberModifyTitle'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged:
                        isAdminOrAbove && !_isSaving('allowMemberModifyTitle')
                            ? (v) async =>
                                _updateSettings('allowMemberModifyTitle', {
                                  'allowMemberModifyTitle': v,
                                })
                            : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '允许普通成员邀请入群',
                    subtitle: isAdminOrAbove ? '开启后，普通成员可添加新成员' : '仅群主/管理员可修改',
                    value: detail.allowMemberInvite,
                    enabled: !_isSaving('allowMemberInvite'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove && !_isSaving('allowMemberInvite')
                        ? (v) async => _updateSettings(
                              'allowMemberInvite',
                              {'allowMemberInvite': v},
                            )
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '允许普通成员 @所有人',
                    subtitle:
                        isAdminOrAbove ? '开启后，普通成员可在群聊中 @所有人' : '仅群主/管理员可修改',
                    value: detail.allowMemberAtAll,
                    enabled: !_isSaving('allowMemberAtAll'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove && !_isSaving('allowMemberAtAll')
                        ? (v) async => _updateSettings(
                              'allowMemberAtAll',
                              {'allowMemberAtAll': v},
                            )
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '全员禁言',
                    subtitle: isAdminOrAbove
                        ? AppPermissions.groupMutedReason
                        : '仅群主/管理员可修改',
                    value: detail.muteMode,
                    enabled: !_isSaving('muteMode'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove && !_isSaving('muteMode')
                        ? (v) async => _updateMuteMode(v)
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '允许群成员互加好友',
                    subtitle: isAdminOrAbove ? '关闭后，群成员之间无法添加好友' : '仅群主/管理员可修改',
                    value: detail.allowMemberAddFriend,
                    enabled: !_isSaving('allowMemberAddFriend'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove &&
                            !_isSaving('allowMemberAddFriend')
                        ? (v) async => _updateSettings('allowMemberAddFriend', {
                              'allowMemberAddFriend': v,
                            })
                        : null,
                  ),
                  const _Divider(),
                  _SwitchTile(
                    label: '允许普通成员查看成员列表',
                    subtitle:
                        isAdminOrAbove ? '关闭后，普通成员无法查看成员列表' : '仅群主/管理员可修改',
                    value: !detail.onlyOwnerViewMembers,
                    enabled: !_isSaving('allowMemberViewMemberList'),
                    onTapWhenDisabled: isAdminOrAbove
                        ? null
                        : () => _showSnack('仅群主/管理员可修改群管理设置'),
                    onChanged: isAdminOrAbove &&
                            !_isSaving('allowMemberViewMemberList')
                        ? (v) async =>
                            _updateSettings('allowMemberViewMemberList', {
                              'allowMemberViewMemberList': v,
                            })
                        : null,
                  ),
                ],
              ),

              // ── 解散群聊 ────────────────────────────────────────────────
              if (isSuperAdmin)
                _CardSection(
                  children: [
                    InkWell(
                      onTap: () => _confirmDismiss(context),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text('解散该群聊',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: _red)),
                        ),
                      ),
                    ),
                  ],
                ),

              const SizedBox(height: 32),
            ],
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  Future<void> _editGroupName(GroupDetail detail) async {
    final permissions = AppPermissions.group(
      myRole: detail.myRole,
      isAllMuted: detail.muteMode,
      allowMemberInvite: detail.allowMemberInvite,
      allowMemberModifyTitle: detail.allowMemberModifyTitle,
      allowMemberAtAll: detail.allowMemberAtAll,
      allowMemberViewMemberList: !detail.onlyOwnerViewMembers,
      allowMemberAddFriend: detail.allowMemberAddFriend,
      space: ref.read(currentSpaceProvider),
    );
    if (!permissions.canModifyTitle) {
      _showSnack(AppPermissions.groupNameDeniedReason);
      return;
    }

    String? newName;
    await showDialog<void>(
      context: context,
      builder: (ctx) => _EditNameDialog(
        initialTitle: detail.title,
        onConfirm: (name) {
          newName = name;
          Navigator.pop(ctx);
        },
        onCancel: () => Navigator.pop(ctx),
      ),
    );

    if (newName == null || newName!.isEmpty || !mounted) return;
    final dio = ref.read(dioProvider);
    final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
    try {
      await dio.put(
        '/api/client/v1/groups/${widget.groupId}',
        data: {'title': newName},
      );
      ref
          .read(groupDetailProvider(widget.groupId).notifier)
          .updateTitle(newName!);
      if (spaceId.isNotEmpty) {
        await ref
            .read(conversationsProvider(spaceId).notifier)
            .updateConversationTitle(widget.groupId, newName!);
        ref.invalidate(conversationsProvider(spaceId));
      }
      ref.read(groupDetailProvider(widget.groupId).notifier).refresh();
    } catch (error) {
      _showSnack(_operationErrorMessage(error));
    }
  }

  Future<void> _updateSettings(String key, Map<String, dynamic> data) async {
    if (!_ensureCanManage()) return;
    final previous = ref.read(groupDetailProvider(widget.groupId)).valueOrNull;
    setState(() => _savingKeys.add(key));
    _optimisticUpdateSettings(data);
    try {
      final dio = ref.read(dioProvider);
      await dio.put(
        '/api/client/v1/groups/${widget.groupId}/settings',
        data: data,
      );
    } catch (error) {
      if (previous != null) _restoreDetail(previous);
      _showSnack(_operationErrorMessage(error));
    } finally {
      if (mounted) setState(() => _savingKeys.remove(key));
    }
  }

  /// 全员禁言专用接口：PUT /groups/{id}/mute-mode
  Future<void> _updateMuteMode(bool mute) async {
    if (!_ensureCanManage()) return;
    final previous = ref.read(groupDetailProvider(widget.groupId)).valueOrNull;
    setState(() => _savingKeys.add('muteMode'));
    ref
        .read(groupDetailProvider(widget.groupId).notifier)
        .updateSettings(muteMode: mute);
    try {
      final dio = ref.read(dioProvider);
      await dio.put(
        '/api/client/v1/groups/${widget.groupId}/mute-mode',
        data: {'muteMode': mute ? 1 : 0},
      );
    } catch (error) {
      if (previous != null) _restoreDetail(previous);
      _showSnack(_operationErrorMessage(error));
    } finally {
      if (mounted) setState(() => _savingKeys.remove('muteMode'));
    }
  }

  bool _ensureCanManage() {
    final detail = ref.read(groupDetailProvider(widget.groupId)).valueOrNull;
    final canManage = detail != null &&
        AppPermissions.group(
          myRole: detail.myRole,
          isAllMuted: detail.muteMode,
          allowMemberInvite: detail.allowMemberInvite,
          allowMemberModifyTitle: detail.allowMemberModifyTitle,
          allowMemberAtAll: detail.allowMemberAtAll,
          allowMemberViewMemberList: !detail.onlyOwnerViewMembers,
          allowMemberAddFriend: detail.allowMemberAddFriend,
          space: ref.read(currentSpaceProvider),
        ).canManage;
    if (!canManage) {
      _showSnack(AppPermissions.groupManageDeniedReason);
      return false;
    }
    return true;
  }

  void _optimisticUpdateSettings(Map<String, dynamic> data) {
    final allowMemberAddFriend = data['allowMemberAddFriend'] as bool?;
    ref.read(groupDetailProvider(widget.groupId).notifier).updateSettings(
          allowQrCodeJoin: data['allowQrCodeJoin'] as bool?,
          requireApproval: data['requireApproval'] as bool?,
          allowMemberModifyTitle: data['allowMemberModifyTitle'] as bool?,
          allowMemberAddFriend: allowMemberAddFriend,
          preventAddFriend:
              allowMemberAddFriend == null ? null : !allowMemberAddFriend,
          allowMemberAtAll: data['allowMemberAtAll'] as bool?,
          onlyOwnerViewMembers: data.containsKey('allowMemberViewMemberList')
              ? !(data['allowMemberViewMemberList'] as bool)
              : null,
          allowMemberInvite: data['allowMemberInvite'] as bool?,
        );
  }

  void _restoreDetail(GroupDetail detail) {
    ref.read(groupDetailProvider(widget.groupId).notifier).updateSettings(
          muteMode: detail.muteMode,
          preventAddFriend: detail.preventAddFriend,
          onlyOwnerViewMembers: detail.onlyOwnerViewMembers,
          allowQrCodeJoin: detail.allowQrCodeJoin,
          requireApproval: detail.requireApproval,
          allowMemberAddFriend: detail.allowMemberAddFriend,
          allowMemberModifyTitle: detail.allowMemberModifyTitle,
          allowMemberInvite: detail.allowMemberInvite,
          allowMemberAtAll: detail.allowMemberAtAll,
        );
  }

  String _operationErrorMessage(Object error) {
    if (error is DioException) {
      final appError = ErrorHandler.fromDioException(error);
      if (appError is AuthError) return '登录状态已失效，请重新登录';
      if (appError is ServerError) {
        if (appError.statusCode == 403 ||
            appError.code == 'FORBIDDEN' ||
            appError.code == 'GROUP_PERMISSION_DENIED') {
          return '仅群主/管理员可修改群管理设置';
        }
        final message = appError.message.trim();
        return message.isNotEmpty ? message : '操作失败，请重试';
      }
      if (appError is NetworkError) return appError.message;
    }
    return '操作失败，请重试';
  }

  void _showSnack(String message) {
    if (!mounted) return;
    AppToast.show(context, message);
  }

  Future<void> _confirmDismiss(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('解散群聊'),
        content: const Text('确定要解散该群聊吗？所有成员将收到通知，此操作不可撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消', style: TextStyle(color: _secondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('解散', style: TextStyle(color: _red)),
          ),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    try {
      final dio = ref.read(dioProvider);
      await dio.delete('/api/client/v1/groups/${widget.groupId}');
      if (!context.mounted) return;
      context.go('/');
    } catch (error) {
      if (context.mounted) _showSnack(_operationErrorMessage(error));
    }
  }
}

class _EditNameDialog extends StatefulWidget {
  final String initialTitle;
  final ValueChanged<String> onConfirm;
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
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialTitle);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('修改群聊名称'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLength: 30,
        decoration: const InputDecoration(
          hintText: '请输入群聊名称',
          counterText: '',
        ),
      ),
      actions: [
        TextButton(
          onPressed: widget.onCancel,
          child: const Text('取消', style: TextStyle(color: _secondary)),
        ),
        TextButton(
          onPressed: () {
            final value = _controller.text.trim();
            if (value.isNotEmpty) widget.onConfirm(value);
          },
          child: const Text('确定', style: TextStyle(color: _primary)),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Shared Widgets
// ---------------------------------------------------------------------------

class _CardSection extends StatelessWidget {
  final List<Widget> children;
  const _CardSection({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: _groupManageSideInset),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(children: children),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final String label;
  final String? subtitle;
  final bool value;
  final bool enabled;
  final VoidCallback? onTapWhenDisabled;
  final ValueChanged<bool>? onChanged;

  const _SwitchTile({
    required this.label,
    this.subtitle,
    required this.value,
    this.enabled = true,
    this.onTapWhenDisabled,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveOnChanged = enabled ? onChanged : null;
    final disabled = effectiveOnChanged == null;
    return InkWell(
      onTap: disabled ? onTapWhenDisabled : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: _groupManageSideInset, vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Opacity(
                opacity: disabled ? 0.62 : 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label,
                        style: const TextStyle(fontSize: 15, color: _text)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!,
                          style:
                              const TextStyle(fontSize: 12, color: _secondary)),
                    ],
                  ],
                ),
              ),
            ),
            Switch(
              value: value,
              onChanged: effectiveOnChanged,
              activeThumbColor: _primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;

  const _NavTile({required this.label, this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: _groupManageSideInset, vertical: 16),
        child: Row(
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width * 0.42,
              ),
              child: Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 15, color: _text)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: value?.isNotEmpty == true
                  ? Text(
                      value!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontSize: 14, color: _secondary),
                    )
                  : const SizedBox.shrink(),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, color: _secondary, size: 20),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, indent: _groupManageSideInset, color: _divider);
}
