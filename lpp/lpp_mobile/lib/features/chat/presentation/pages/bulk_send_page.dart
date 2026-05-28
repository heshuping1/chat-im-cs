import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/group_avatar.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

const _kPrimary = Color(0xFF07C160);

enum _BulkTargetType { friend, group }

enum _BulkSendStatus { sending, success, failed }

class _BulkSendTarget {
  final String id;
  final String title;
  final String? subtitle;
  final String? avatarUrl;
  final _BulkTargetType type;
  final List<String?>? memberAvatarUrls;
  final List<String>? memberNames;

  const _BulkSendTarget({
    required this.id,
    required this.title,
    this.subtitle,
    this.avatarUrl,
    required this.type,
    this.memberAvatarUrls,
    this.memberNames,
  });

  bool get isGroup => type == _BulkTargetType.group;
}

class _BulkSendResult {
  final _BulkSendStatus status;
  final String? message;

  const _BulkSendResult(this.status, [this.message]);
}

class BulkSendPage extends ConsumerStatefulWidget {
  const BulkSendPage({super.key});

  @override
  ConsumerState<BulkSendPage> createState() => _BulkSendPageState();
}

class _BulkSendPageState extends ConsumerState<BulkSendPage> {
  final _searchCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  final _searchDebouncer = Debouncer();
  final Set<String> _selectedIds = <String>{};
  final Map<String, _BulkSendResult> _results = <String, _BulkSendResult>{};
  String _query = '';
  bool _sending = false;

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _searchCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim().toLowerCase());
    });
  }

  void _toggleTarget(_BulkSendTarget target) {
    if (_sending) return;
    setState(() {
      if (!_selectedIds.add(target.id)) {
        _selectedIds.remove(target.id);
      }
      _results.remove(target.id);
    });
  }

  Future<void> _sendSelected(List<_BulkSendTarget> allTargets) async {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty) {
      AppToast.info(context, '请输入群发内容');
      return;
    }
    if (_selectedIds.isEmpty) {
      AppToast.info(context, '请选择群发对象');
      return;
    }

    final selectedTargets =
        allTargets.where((target) => _selectedIds.contains(target.id)).toList();
    if (selectedTargets.isEmpty) {
      AppToast.info(context, '请选择有效的群发对象');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      for (final target in selectedTargets) {
        _results[target.id] = const _BulkSendResult(_BulkSendStatus.sending);
      }
    });

    var successCount = 0;
    for (final target in selectedTargets) {
      try {
        await _sendToTarget(target, text);
        successCount += 1;
        if (!mounted) return;
        setState(() {
          _results[target.id] =
              const _BulkSendResult(_BulkSendStatus.success, '已发送');
        });
      } catch (error) {
        if (!mounted) return;
        setState(() {
          _results[target.id] =
              _BulkSendResult(_BulkSendStatus.failed, _errorText(error));
        });
      }
    }

    if (!mounted) return;
    setState(() => _sending = false);
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId != null && spaceId.isNotEmpty) {
      ref.invalidate(conversationsProvider(spaceId));
    }

    final failedCount = selectedTargets.length - successCount;
    if (failedCount == 0) {
      AppToast.success(context, '已发送给 $successCount 个对象');
    } else {
      AppToast.show(
        context,
        '已发送 $successCount 个，失败 $failedCount 个',
        type: AppToastType.warning,
        duration: const Duration(seconds: 3),
      );
    }
  }

  Future<void> _sendToTarget(_BulkSendTarget target, String text) async {
    final dio = ref.read(dioProvider);
    final targetId = target.id.substring(target.id.indexOf(':') + 1);
    final clientMsgId =
        'bulk_${DateTime.now().microsecondsSinceEpoch}_$targetId';
    final conversationId = target.isGroup
        ? targetId
        : await _createOrReuseDirectChat(dio, targetId);
    final path = target.isGroup
        ? '/api/client/v1/groups/$conversationId/messages'
        : '/api/client/v1/direct-chats/$conversationId/messages';
    await dio.post<Map<String, dynamic>>(
      path,
      data: {
        'clientMsgId': clientMsgId,
        'messageType': 'text',
        'body': {'text': text},
        'mentions': <Map<String, dynamic>>[],
      },
    );
  }

  Future<String> _createOrReuseDirectChat(Dio dio, String peerUserId) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/direct-chats',
      data: {'peerUserId': peerUserId},
    );
    final data = response.data?['data'];
    if (data is Map<String, dynamic>) {
      final conversationId =
          data['conversationId'] as String? ?? data['chatId'] as String?;
      if (conversationId != null && conversationId.isNotEmpty) {
        return conversationId;
      }
    }
    throw const ServerError(code: 'DIRECT_CHAT_MISSING', message: '无法创建会话');
  }

  String _errorText(Object error) {
    if (error is AppError) {
      return switch (error) {
        NetworkError(:final message) => message,
        ServerError(:final message) => message,
        AuthError() => '登录状态已失效',
      };
    }
    if (error is DioException) {
      final appError = ErrorHandler.fromDioException(error);
      return _errorText(appError);
    }
    return '发送失败';
  }

  @override
  Widget build(BuildContext context) {
    final spaceId = ref.watch(currentSpaceProvider)?.spaceId ?? '';
    final friendsAsync = ref.watch(friendsProvider);
    final conversationsAsync = ref.watch(conversationsProvider(spaceId));
    final targets = _buildTargets(
      friendsAsync.valueOrNull ?? const <Contact>[],
      conversationsAsync.valueOrNull ?? const <Conversation>[],
    );
    final visibleTargets = _filterTargets(targets);

    return Scaffold(
      appBar: AppBar(
        title: const Text('群发'),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _sending ? null : () => _sendSelected(targets),
            child: Text(
              _sending ? '发送中' : '发送',
              style: TextStyle(
                color: _sending || _selectedIds.isEmpty
                    ? Theme.of(context).disabledColor
                    : _kPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _SearchBox(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
          ),
          _MessageComposer(
            controller: _messageCtrl,
            enabled: !_sending,
            selectedCount: _selectedIds.length,
          ),
          Expanded(
            child: _buildTargetList(
              friendsAsync: friendsAsync,
              conversationsAsync: conversationsAsync,
              targets: visibleTargets,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              top: BorderSide(color: Theme.of(context).dividerColor),
            ),
          ),
          child: FilledButton(
            onPressed: _sending ? null : () => _sendSelected(targets),
            style: FilledButton.styleFrom(
              backgroundColor: _kPrimary,
              foregroundColor: Colors.white,
              disabledBackgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerHighest,
              minimumSize: const Size.fromHeight(44),
            ),
            child: Text(_sending
                ? '发送中...'
                : _selectedIds.isEmpty
                    ? '选择对象后发送'
                    : '发送给 ${_selectedIds.length} 个对象'),
          ),
        ),
      ),
    );
  }

  List<_BulkSendTarget> _buildTargets(
    List<Contact> friends,
    List<Conversation> conversations,
  ) {
    final friendTargets = friends
        .where((friend) => friend.userId.isNotEmpty)
        .map(
          (friend) => _BulkSendTarget(
            id: 'friend:${friend.userId}',
            title: friend.displayName,
            subtitle: friend.customerTag,
            avatarUrl: friend.avatarUrl,
            type: _BulkTargetType.friend,
          ),
        )
        .toList();

    final groupTargets = conversations
        .where((conversation) => conversation.type == ConversationType.group)
        .where((conversation) => conversation.conversationId.isNotEmpty)
        .map(
          (conversation) => _BulkSendTarget(
            id: 'group:${conversation.conversationId}',
            title: conversation.title,
            subtitle: conversation.memberCount == null
                ? '群聊'
                : '${conversation.memberCount} 人',
            avatarUrl: conversation.avatarUrl,
            type: _BulkTargetType.group,
            memberAvatarUrls: conversation.memberAvatarUrls,
            memberNames: conversation.memberNames,
          ),
        )
        .toList();

    return [...friendTargets, ...groupTargets];
  }

  List<_BulkSendTarget> _filterTargets(List<_BulkSendTarget> targets) {
    if (_query.isEmpty) return targets;
    return targets
        .where((target) =>
            target.title.toLowerCase().contains(_query) ||
            (target.subtitle?.toLowerCase().contains(_query) ?? false))
        .toList();
  }

  Widget _buildTargetList({
    required AsyncValue<List<Contact>> friendsAsync,
    required AsyncValue<List<Conversation>> conversationsAsync,
    required List<_BulkSendTarget> targets,
  }) {
    final isLoading = friendsAsync.isLoading || conversationsAsync.isLoading;
    final hasError = friendsAsync.hasError || conversationsAsync.hasError;
    if (isLoading && targets.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: _kPrimary));
    }
    if (hasError && targets.isEmpty) {
      return _EmptyState(
        icon: Icons.error_outline,
        title: '加载失败',
        subtitle: '无法读取好友或群聊，请稍后重试',
        actionText: '重试',
        onAction: () {
          ref.invalidate(friendsProvider);
          final spaceId = ref.read(currentSpaceProvider)?.spaceId;
          if (spaceId != null && spaceId.isNotEmpty) {
            ref.invalidate(conversationsProvider(spaceId));
          }
        },
      );
    }
    if (targets.isEmpty) {
      return _EmptyState(
        icon: Icons.groups_outlined,
        title: _query.isEmpty ? '暂无可群发对象' : '未找到相关对象',
        subtitle: _query.isEmpty ? '添加好友或加入群聊后可使用群发' : '换个关键词再试',
      );
    }

    final friendTargets =
        targets.where((target) => !target.isGroup).toList(growable: false);
    final groupTargets =
        targets.where((target) => target.isGroup).toList(growable: false);

    return ListView(
      padding: const EdgeInsets.only(bottom: 12),
      children: [
        if (friendTargets.isNotEmpty) ...[
          _SectionHeader(title: '好友', count: friendTargets.length),
          for (final target in friendTargets)
            _TargetTile(
              target: target,
              selected: _selectedIds.contains(target.id),
              result: _results[target.id],
              onTap: () => _toggleTarget(target),
            ),
        ],
        if (groupTargets.isNotEmpty) ...[
          _SectionHeader(title: '群聊', count: groupTargets.length),
          for (final target in groupTargets)
            _TargetTile(
              target: target,
              selected: _selectedIds.contains(target.id),
              result: _results[target.id],
              onTap: () => _toggleTarget(target),
            ),
        ],
      ],
    );
  }
}

class _SearchBox extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchBox({
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: '搜索好友或群聊',
          prefixIcon: const Icon(Icons.search, size: 20),
          filled: true,
          fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}

class _MessageComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool enabled;
  final int selectedCount;

  const _MessageComposer({
    required this.controller,
    required this.enabled,
    required this.selectedCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            enabled: enabled,
            minLines: 3,
            maxLines: 5,
            maxLength: 1000,
            decoration: InputDecoration(
              hintText: '输入要群发的消息',
              alignLabelWithHint: true,
              filled: true,
              fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              counterText: '',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            selectedCount == 0 ? '请选择好友或群聊' : '已选择 $selectedCount 个对象',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;

  const _SectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
      child: Text(
        '$title $count',
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _TargetTile extends StatelessWidget {
  final _BulkSendTarget target;
  final bool selected;
  final _BulkSendResult? result;
  final VoidCallback onTap;

  const _TargetTile({
    required this.target,
    required this.selected,
    required this.result,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = result?.status;
    final isFailed = status == _BulkSendStatus.failed;
    final isSuccess = status == _BulkSendStatus.success;
    final isSending = status == _BulkSendStatus.sending;
    return ListTile(
      onTap: onTap,
      leading: target.isGroup
          ? GroupAvatar(
              memberAvatarUrls: target.memberAvatarUrls ?? const <String?>[],
              memberNames: target.memberNames ?? const <String>[],
              size: 42,
            )
          : UserAvatar(
              avatarUrl: target.avatarUrl,
              name: target.title,
              size: 42,
            ),
      title: Text(
        target.title.isEmpty
            ? (target.isGroup ? '未命名群聊' : '未命名好友')
            : target.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        result?.message ?? target.subtitle ?? (target.isGroup ? '群聊' : '好友'),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: isFailed
              ? Theme.of(context).colorScheme.error
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
      trailing: isSending
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(
              isSuccess
                  ? Icons.check_circle
                  : isFailed
                      ? Icons.error
                      : selected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
              color: isSuccess || selected
                  ? _kPrimary
                  : isFailed
                      ? Theme.of(context).colorScheme.error
                      : Theme.of(context).colorScheme.outline,
            ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionText;
  final VoidCallback? onAction;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 48,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 13,
              ),
            ),
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: 16),
              TextButton(onPressed: onAction, child: Text(actionText!)),
            ],
          ],
        ),
      ),
    );
  }
}
