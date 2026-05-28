import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/group_conversation_avatar.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';

bool _groupListIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _groupListPrimaryText(BuildContext context) => _groupListIsDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1D2129);

Color _groupListSecondaryText(BuildContext context) => _groupListIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _groupListHintText(BuildContext context) => _groupListIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.42)
    : const Color(0xFFAEAEB2);

class GroupListPage extends ConsumerStatefulWidget {
  final bool adminMode;

  const GroupListPage({super.key, this.adminMode = false});

  @override
  ConsumerState<GroupListPage> createState() => _GroupListPageState();
}

class _GroupListPageState extends ConsumerState<GroupListPage> {
  final _searchCtrl = TextEditingController();
  final _searchDebouncer = Debouncer();
  String _query = '';

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(currentSpaceProvider);
    final spaceId = space?.spaceId ?? 'personal';
    final convsAsync = ref.watch(conversationsProvider(spaceId));
    final adminGroupsAsync =
        widget.adminMode ? ref.watch(adminGroupsProvider) : null;

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 20, color: _groupListPrimaryText(context)),
          onPressed: () => context.pop(),
        ),
        title: Text(widget.adminMode ? '群组监管' : '群聊',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: _groupListPrimaryText(context))),
        centerTitle: true,
        actions: [
          if (!widget.adminMode &&
              ((space?.isEmployee ?? false)
                  ? space?.isAdminOrAbove == true
                  : !(space?.isCustomer ?? false)))
            IconButton(
              icon: Icon(Icons.add,
                  color: _groupListPrimaryText(context), size: 24),
              onPressed: () => context.push('/create-group'),
              tooltip: '发起群聊',
            ),
        ],
      ),
      body: Column(
        children: [
          // 搜索框
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: _onSearchChanged,
              style: TextStyle(
                  color: _groupListPrimaryText(context), fontSize: 15),
              cursorColor: const Color(0xFF00B27A),
              decoration: InputDecoration(
                hintText: widget.adminMode ? '搜索群组' : '搜索群聊',
                hintStyle:
                    TextStyle(color: _groupListHintText(context), fontSize: 15),
                prefixIcon: Icon(Icons.search,
                    color: _groupListHintText(context), size: 20),
                filled: true,
                fillColor: _groupListIsDark(context)
                    ? Theme.of(context).colorScheme.surfaceContainerHighest
                    : const Color(0xFFF2F2F7),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: widget.adminMode
                ? _buildAdminGroups(adminGroupsAsync!, spaceId)
                : convsAsync.when(
                    loading: () => const Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF00B27A))),
                    error: (_, __) => Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.error_outline,
                              size: 48, color: _groupListHintText(context)),
                          const SizedBox(height: 12),
                          Text('加载失败',
                              style: TextStyle(
                                  color: _groupListSecondaryText(context))),
                          TextButton(
                            onPressed: () =>
                                ref.invalidate(conversationsProvider(spaceId)),
                            child: const Text('重试',
                                style: TextStyle(color: Color(0xFF00B27A))),
                          ),
                        ],
                      ),
                    ),
                    data: (convs) {
                      final groups = convs
                          .where((c) => c.type == ConversationType.group)
                          .where((c) =>
                              _query.isEmpty ||
                              c.title
                                  .toLowerCase()
                                  .contains(_query.toLowerCase()))
                          .toList();

                      if (groups.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .surfaceContainerHighest,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.group_outlined,
                                    size: 36,
                                    color: _groupListHintText(context)),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _query.isNotEmpty ? '未找到相关群聊' : '暂无群聊',
                                style: TextStyle(
                                    fontSize: 15,
                                    color: _groupListSecondaryText(context)),
                              ),
                              if (_query.isEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  '点击右上角 + 发起群聊',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: _groupListHintText(context)),
                                ),
                              ],
                            ],
                          ),
                        );
                      }

                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: groups.length,
                        itemBuilder: (context, i) => _GroupTile(
                          group: groups[i],
                          showDivider: i < groups.length - 1,
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminGroups(
    AsyncValue<List<AdminGroup>> groupsAsync,
    String spaceId,
  ) {
    return groupsAsync.when(
      loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFF00B27A))),
      error: (_, __) => _AdminGroupGovernanceBody(
        groups: const [],
        query: _query,
        dataUnavailable: true,
        onRetry: () => ref.invalidate(adminGroupsProvider),
      ),
      data: (groups) {
        final filtered = groups
            .where((group) =>
                _query.isEmpty ||
                group.title.toLowerCase().contains(_query.toLowerCase()))
            .toList();
        return _AdminGroupGovernanceBody(
          groups: filtered,
          query: _query,
          totalGroups: groups.length,
          onRetry: () => ref.invalidate(adminGroupsProvider),
        );
      },
    );
  }
}

class _AdminGroupGovernanceBody extends StatelessWidget {
  final List<AdminGroup> groups;
  final String query;
  final int? totalGroups;
  final bool dataUnavailable;
  final VoidCallback onRetry;

  const _AdminGroupGovernanceBody({
    required this.groups,
    required this.query,
    required this.onRetry,
    this.totalGroups,
    this.dataUnavailable = false,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: () async => onRetry(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          _AdminGroupGovernanceSummary(
            totalGroups: dataUnavailable ? null : totalGroups ?? groups.length,
            visibleGroups: groups.length,
            dataUnavailable: dataUnavailable,
          ),
          const SizedBox(height: 16),
          _AdminGroupSectionHeader(count: groups.length),
          const SizedBox(height: 8),
          if (groups.isEmpty)
            _AdminGroupEmptyState(
              query: query,
              dataUnavailable: dataUnavailable,
              onRetry: onRetry,
            )
          else
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: groups.asMap().entries.map((entry) {
                  return _AdminGroupTile(
                    group: entry.value,
                    showDivider: entry.key < groups.length - 1,
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _AdminGroupGovernanceSummary extends StatelessWidget {
  final int? totalGroups;
  final int visibleGroups;
  final bool dataUnavailable;

  const _AdminGroupGovernanceSummary({
    required this.totalGroups,
    required this.visibleGroups,
    required this.dataUnavailable,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.shield_outlined,
                  size: 20, color: Color(0xFF00B27A)),
              const SizedBox(width: 8),
              Text(
                '群组监管概览',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _groupListPrimaryText(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _AdminGroupMetric(label: '群组', value: totalGroups)),
              Expanded(
                  child:
                      _AdminGroupMetric(label: '当前筛选', value: visibleGroups)),
              const Expanded(
                  child: _AdminGroupMetric(label: '冻结', value: null)),
              const Expanded(
                  child: _AdminGroupMetric(label: '风险', value: null)),
            ],
          ),
          if (dataUnavailable) ...[
            const SizedBox(height: 12),
            Text(
              '监管统计接口待接入，当前先展示群组监管界面结构。',
              style: TextStyle(
                fontSize: 12,
                color: _groupListSecondaryText(context),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AdminGroupMetric extends StatelessWidget {
  final String label;
  final int? value;

  const _AdminGroupMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value?.toString() ?? '--',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: _groupListPrimaryText(context),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: _groupListSecondaryText(context),
          ),
        ),
      ],
    );
  }
}

class _AdminGroupSectionHeader extends StatelessWidget {
  final int count;

  const _AdminGroupSectionHeader({required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '群组列表',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: _groupListPrimaryText(context),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '$count 个',
          style: TextStyle(
            fontSize: 13,
            color: _groupListSecondaryText(context),
          ),
        ),
      ],
    );
  }
}

class _AdminGroupEmptyState extends StatelessWidget {
  final String query;
  final bool dataUnavailable;
  final VoidCallback onRetry;

  const _AdminGroupEmptyState({
    required this.query,
    required this.dataUnavailable,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 220),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.groups_outlined,
              size: 48, color: _groupListHintText(context)),
          const SizedBox(height: 12),
          Text(
            dataUnavailable
                ? '暂无群组数据'
                : query.isNotEmpty
                    ? '未找到相关群组'
                    : '暂无群组数据',
            style: TextStyle(
              fontSize: 15,
              color: _groupListSecondaryText(context),
            ),
          ),
          if (dataUnavailable) ...[
            const SizedBox(height: 8),
            Text(
              '接口接入后会在这里展示群组。',
              style: TextStyle(
                fontSize: 13,
                color: _groupListHintText(context),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: onRetry,
              child: const Text(
                '重试',
                style: TextStyle(color: Color(0xFF00B27A)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AdminGroupTile extends ConsumerStatefulWidget {
  final AdminGroup group;
  final bool showDivider;

  const _AdminGroupTile({
    required this.group,
    required this.showDivider,
  });

  @override
  ConsumerState<_AdminGroupTile> createState() => _AdminGroupTileState();
}

class _AdminGroupTileState extends ConsumerState<_AdminGroupTile> {
  bool _saving = false;

  void _showDetailSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AdminGroupSupervisionSheet(
        group: widget.group,
        saving: _saving,
        onFreeze: _freeze,
      ),
    );
  }

  Future<void> _freeze(bool frozen) async {
    if (_saving) return;
    final reason = await _showFreezeReasonDialog(context, frozen: frozen);
    if (reason == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(adminCustomerServiceRepositoryProvider).freezeConversation(
            conversationId: widget.group.conversationId,
            frozen: frozen,
            reason: reason,
          );
      ref.invalidate(adminGroupsProvider);
      if (mounted) {
        AppToast.success(context, frozen ? '已冻结会话' : '已解冻会话');
      }
    } catch (_) {
      if (mounted) AppToast.error(context, '操作失败，请重试');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tzOffset = ref.watch(timezoneOffsetProvider);
    final timeStr = widget.group.updatedAt == null
        ? null
        : formatChatTime(widget.group.updatedAt!, tzOffset);
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      color: colorScheme.surface,
      child: Column(
        children: [
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: GroupConversationAvatar(
              groupId: widget.group.conversationId,
              fallbackAvatarUrls: const <String?>[],
              fallbackNames: const <String>[],
              size: 48,
              borderRadius: 12,
            ),
            title: Text(
              widget.group.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: _groupListPrimaryText(context),
              ),
            ),
            subtitle: Text(
              [
                '${widget.group.memberCount} 人',
                if (widget.group.lastMessagePreview?.isNotEmpty == true)
                  widget.group.lastMessagePreview!,
                if (timeStr != null) timeStr,
              ].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: _groupListSecondaryText(context),
              ),
            ),
            trailing: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF00B27A),
                    ),
                  )
                : Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: colorScheme.onSurface.withValues(alpha: 0.26),
                  ),
            onTap: _showDetailSheet,
          ),
          if (widget.showDivider)
            Divider(
              height: 0.5,
              thickness: 0.5,
              indent: 76,
              color: Theme.of(context).dividerColor,
            ),
        ],
      ),
    );
  }
}

class _AdminGroupSupervisionSheet extends StatelessWidget {
  final AdminGroup group;
  final bool saving;
  final ValueChanged<bool> onFreeze;

  const _AdminGroupSupervisionSheet({
    required this.group,
    required this.saving,
    required this.onFreeze,
  });

  @override
  Widget build(BuildContext context) {
    final tzOffset =
        ProviderScope.containerOf(context).read(timezoneOffsetProvider);
    final lastActive = group.updatedAt == null
        ? '--'
        : formatChatTime(group.updatedAt!, tzOffset);
    final frozenLabel = switch (group.isFrozen) {
      true => '已冻结',
      false => '正常',
      null => '--',
    };
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                GroupConversationAvatar(
                  groupId: group.conversationId,
                  fallbackAvatarUrls: const <String?>[],
                  fallbackNames: const <String>[],
                  size: 44,
                  borderRadius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: _groupListPrimaryText(context),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '群组监管详情',
                        style: TextStyle(
                          fontSize: 13,
                          color: _groupListSecondaryText(context),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(
                    Icons.close,
                    color: _groupListSecondaryText(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _AdminGroupDetailGrid(
              items: [
                _AdminGroupDetailItem('成员数', '${group.memberCount}'),
                _AdminGroupDetailItem(
                    '群主',
                    group.ownerDisplayName?.trim().isNotEmpty == true
                        ? group.ownerDisplayName!
                        : '--'),
                _AdminGroupDetailItem('最后活跃', lastActive),
                _AdminGroupDetailItem('冻结状态', frozenLabel),
                _AdminGroupDetailItem(
                    '风险状态',
                    group.riskLevel?.trim().isNotEmpty == true
                        ? group.riskLevel!
                        : '--'),
                _AdminGroupDetailItem('群组 ID', group.conversationId),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: saving
                        ? null
                        : () {
                            Navigator.of(context).pop();
                            onFreeze(true);
                          },
                    icon: const Icon(Icons.lock_outline, size: 18),
                    label: const Text('冻结'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: saving
                        ? null
                        : () {
                            Navigator.of(context).pop();
                            onFreeze(false);
                          },
                    icon: const Icon(Icons.lock_open_outlined, size: 18),
                    label: const Text('解冻'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF00B27A),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _DisabledAdminGroupAction(
                  icon: Icons.volume_off_outlined,
                  label: '全员禁言',
                  onTap: () => AppToast.missingApi(context, '管理端全员禁言'),
                ),
                _DisabledAdminGroupAction(
                  icon: Icons.people_outline,
                  label: '成员管理',
                  onTap: () => AppToast.missingApi(context, '管理端成员管理'),
                ),
                _DisabledAdminGroupAction(
                  icon: Icons.delete_outline,
                  label: '强制解散',
                  onTap: () => AppToast.missingApi(context, '管理端强制解散群'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminGroupDetailItem {
  final String label;
  final String value;

  const _AdminGroupDetailItem(this.label, this.value);
}

class _AdminGroupDetailGrid extends StatelessWidget {
  final List<_AdminGroupDetailItem> items;

  const _AdminGroupDetailGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: items.map((item) {
          final isLast = item == items.last;
          return Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 10),
            child: Row(
              children: [
                SizedBox(
                  width: 76,
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 13,
                      color: _groupListSecondaryText(context),
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    item.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _groupListPrimaryText(context),
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _DisabledAdminGroupAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _DisabledAdminGroupAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: _groupListSecondaryText(context)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _groupListSecondaryText(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupTile extends ConsumerWidget {
  final Conversation group;
  final bool showDivider;

  const _GroupTile({required this.group, required this.showDivider});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tzOffset = ref.watch(timezoneOffsetProvider);
    final lastMsg = _lastMessagePreview(group);
    final timeStr = _formatTime(group.lastActivityAt, tzOffset);

    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          InkWell(
            onTap: () => context.push(
              '/chat/${group.conversationId}',
              extra: {
                'isGroup': true,
                'title': group.title,
                'avatarUrl': group.avatarUrl,
                'memberCount': group.memberCount,
              },
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GroupConversationAvatar(
                    groupId: group.conversationId,
                    fallbackAvatarUrls:
                        group.memberAvatarUrls ?? const <String?>[],
                    fallbackNames: group.memberNames ?? const <String>[],
                    size: 48,
                    borderRadius: 12,
                  ),
                  const SizedBox(width: 12),
                  // 内容
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                group.title,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                  color: _groupListPrimaryText(context),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (timeStr != null)
                              Text(
                                timeStr,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: _groupListSecondaryText(context)),
                              ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          lastMsg,
                          style: TextStyle(
                              fontSize: 13,
                              color: _groupListSecondaryText(context)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // 未读角标
                  if (group.unreadCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: group.isMuted
                            ? const Color(0xFF9CA3AF)
                            : Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        group.unreadCount > 99 ? '99+' : '${group.unreadCount}',
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.surface,
                            fontSize: 11,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (showDivider)
            Divider(
                height: 0.5,
                thickness: 0.5,
                indent: 76,
                color: Theme.of(context).dividerColor),
        ],
      ),
    );
  }

  String _lastMessagePreview(Conversation c) {
    final msg = c.lastMessage;
    if (msg == null) return '暂无消息';
    if (msg.text != null && msg.text!.isNotEmpty) return msg.text!;
    switch (msg.messageType) {
      case 'image':
        return '[图片]';
      case 'video':
        return '[视频]';
      case 'voice':
        return '[语音]';
      case 'file':
        return '[文件]';
      default:
        return '[消息]';
    }
  }

  String? _formatTime(DateTime? dt, double tzOffset) {
    if (dt == null) return null;
    return formatChatTime(dt, tzOffset);
  }
}

Future<String?> _showFreezeReasonDialog(
  BuildContext context, {
  required bool frozen,
}) async {
  final controller = TextEditingController();
  final result = await showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(frozen ? '冻结会话' : '解冻会话'),
      content: TextField(
        controller: controller,
        minLines: 2,
        maxLines: 3,
        textInputAction: TextInputAction.newline,
        decoration: InputDecoration(
          hintText: frozen ? '填写冻结原因（可选）' : '填写解冻原因（可选）',
          border: const OutlineInputBorder(),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('取消'),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
          child: Text(
            frozen ? '确认冻结' : '确认解冻',
            style:
                TextStyle(color: frozen ? Colors.red : const Color(0xFF00B27A)),
          ),
        ),
      ],
    ),
  );
  controller.dispose();
  return result;
}
