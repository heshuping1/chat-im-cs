import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';

const _bg = Color(0xFFF2F2F7);
const _card = Colors.white;
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);
const _red = Color(0xFFFF3B30);

class GroupMemberMutePage extends ConsumerStatefulWidget {
  final String groupId;

  const GroupMemberMutePage({super.key, required this.groupId});

  @override
  ConsumerState<GroupMemberMutePage> createState() =>
      _GroupMemberMutePageState();
}

class _GroupMemberMutePageState extends ConsumerState<GroupMemberMutePage> {
  final Set<String> _savingUsers = {};

  Future<void> _setMute(
    GroupMember member,
    bool muted, {
    int durationMinutes = 0,
    String? reason,
  }) async {
    if (_savingUsers.contains(member.userId)) return;
    setState(() => _savingUsers.add(member.userId));
    final normalizedReason = reason?.trim();
    final muteUntil = muted && durationMinutes > 0
        ? DateTime.now()
            .toUtc()
            .add(Duration(minutes: durationMinutes))
            .toIso8601String()
        : null;
    try {
      final dio = ref.read(dioProvider);
      await dio.put<void>(
        '/api/client/v1/groups/${widget.groupId}/members/${member.userId}/mute',
        data: {
          'muteMode': muted ? 1 : 0,
          'muteUntil': muted ? muteUntil : null,
          if (muted && normalizedReason?.isNotEmpty == true)
            'reason': normalizedReason,
        },
      );
      ref.read(groupMembersProvider(widget.groupId).notifier).updateMemberMute(
            member.userId,
            muted,
            muteUntil: muteUntil,
            muteReason: normalizedReason,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(muted ? '已禁言该成员' : '已取消该成员禁言')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    } finally {
      if (mounted) setState(() => _savingUsers.remove(member.userId));
    }
  }

  Future<void> _openMuteDialog(GroupMember member) async {
    final result = await showDialog<_MuteMemberSettings>(
      context: context,
      builder: (context) => _MuteMemberDialog(memberName: member.displayName),
    );
    if (result == null) return;
    await _setMute(
      member,
      true,
      durationMinutes: result.durationMinutes,
      reason: result.reason,
    );
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(groupDetailProvider(widget.groupId));

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('成员禁言',
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
          final canManage = permissions.canManage;
          if (!canManage) {
            return const Center(
              child: Text('仅群主/管理员/企业管理员可设置成员禁言',
                  style: TextStyle(color: _secondary)),
            );
          }
          final membersAsync = ref.watch(groupMembersProvider(widget.groupId));
          return membersAsync.when(
            loading: () =>
                const Center(child: CircularProgressIndicator(color: _primary)),
            error: (_, __) => const Center(
                child: Text('加载失败', style: TextStyle(color: _secondary))),
            data: (members) {
              final candidates = members
                  .where(
                      (m) => m.role == GroupRole.member && m.userId.isNotEmpty)
                  .toList();
              if (candidates.isEmpty) {
                return const Center(
                  child:
                      Text('暂无可禁言的普通成员', style: TextStyle(color: _secondary)),
                );
              }
              return ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  const _HintCard(),
                  const SizedBox(height: 12),
                  ...List.generate(candidates.length, (index) {
                    final member = candidates[index];
                    final saving = _savingUsers.contains(member.userId);
                    return Column(
                      children: [
                        _MemberMuteTile(
                          member: member,
                          saving: saving,
                          onMute: () => _openMuteDialog(member),
                          onUnmute: () => _setMute(member, false),
                        ),
                        if (index != candidates.length - 1)
                          const Divider(height: 1, indent: 72, color: _divider),
                      ],
                    );
                  }),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class _HintCard extends StatelessWidget {
  const _HintCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF8F4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Text(
        '成员禁言只影响普通成员发言。禁言时长按分钟设置，0 表示永久禁言；原因会随操作提交给服务端。',
        style: TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF3A7D63)),
      ),
    );
  }
}

class _MemberMuteTile extends StatelessWidget {
  final GroupMember member;
  final bool saving;
  final VoidCallback onMute;
  final VoidCallback onUnmute;

  const _MemberMuteTile({
    required this.member,
    required this.saving,
    required this.onMute,
    required this.onUnmute,
  });

  @override
  Widget build(BuildContext context) {
    final isMuted = member.isMuted;
    return Container(
      color: _card,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(
        children: [
          UserAvatar(
            avatarUrl: member.avatarUrl,
            name: member.displayName,
            size: 44,
            borderRadius: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.displayName,
                  style: const TextStyle(fontSize: 15, color: _text),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    _MuteStatusChip(isMuted: isMuted),
                    if (isMuted == true && member.muteUntil != null) ...[
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          '至 ${_formatMuteUntil(member.muteUntil!)}',
                          style:
                              const TextStyle(fontSize: 12, color: _secondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    if (isMuted == true &&
                        member.muteReason?.isNotEmpty == true) ...[
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          '原因：${member.muteReason!}',
                          style:
                              const TextStyle(fontSize: 12, color: _secondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (saving)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: _primary),
            )
          else if (isMuted == true)
            TextButton(
              onPressed: onUnmute,
              child: const Text('解除禁言'),
            )
          else if (isMuted == false)
            TextButton(
              onPressed: onMute,
              child: const Text('禁言', style: TextStyle(color: _red)),
            )
          else
            PopupMenuButton<bool>(
              tooltip: '设置禁言',
              onSelected: (value) => value ? onMute() : onUnmute(),
              itemBuilder: (context) => const [
                PopupMenuItem(value: true, child: Text('禁言')),
                PopupMenuItem(value: false, child: Text('解除禁言')),
              ],
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Text('设置', style: TextStyle(color: _primary)),
              ),
            ),
        ],
      ),
    );
  }

  static String _formatMuteUntil(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.month}/${dt.day} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

class _MuteMemberSettings {
  final int durationMinutes;
  final String? reason;

  const _MuteMemberSettings({
    required this.durationMinutes,
    this.reason,
  });
}

class _MuteMemberDialog extends StatefulWidget {
  final String memberName;

  const _MuteMemberDialog({required this.memberName});

  @override
  State<_MuteMemberDialog> createState() => _MuteMemberDialogState();
}

class _MuteMemberDialogState extends State<_MuteMemberDialog> {
  final _minutesController = TextEditingController(text: '0');
  final _reasonController = TextEditingController();
  String? _minutesError;

  @override
  void dispose() {
    _minutesController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  void _submit() {
    final rawMinutes = _minutesController.text.trim();
    final minutes = int.tryParse(rawMinutes);
    if (minutes == null || minutes < 0) {
      setState(() => _minutesError = '请输入不小于 0 的整数');
      return;
    }
    Navigator.of(context).pop(
      _MuteMemberSettings(
        durationMinutes: minutes,
        reason: _reasonController.text.trim().isEmpty
            ? null
            : _reasonController.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('设置禁言'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.memberName.isEmpty ? '将禁言该成员' : '将禁言「${widget.memberName}」',
            style: const TextStyle(fontSize: 14, color: _secondary),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _minutesController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: '禁言时长（分钟）',
              hintText: '0 表示永久',
              errorText: _minutesError,
              border: const OutlineInputBorder(),
            ),
            onChanged: (_) {
              if (_minutesError != null) setState(() => _minutesError = null);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reasonController,
            minLines: 2,
            maxLines: 3,
            textInputAction: TextInputAction.newline,
            decoration: const InputDecoration(
              labelText: '禁言原因',
              hintText: '选填',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消', style: TextStyle(color: _secondary)),
        ),
        TextButton(
          onPressed: _submit,
          child: const Text('确定禁言', style: TextStyle(color: _red)),
        ),
      ],
    );
  }
}

class _MuteStatusChip extends StatelessWidget {
  final bool? isMuted;

  const _MuteStatusChip({required this.isMuted});

  @override
  Widget build(BuildContext context) {
    final (label, color, bg) = switch (isMuted) {
      true => ('已禁言', _red, const Color(0xFFFFF1F0)),
      false => ('未禁言', _primary, const Color(0xFFEFF8F4)),
      null => ('状态未同步', _secondary, const Color(0xFFF2F2F7)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
