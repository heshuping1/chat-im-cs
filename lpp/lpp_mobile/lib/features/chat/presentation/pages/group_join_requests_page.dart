import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/group_join_requests_provider.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';

const _bg = Color(0xFFF2F2F7);
const _card = Colors.white;
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);
const _red = Color(0xFFFF3B30);

class GroupJoinRequestsPage extends ConsumerWidget {
  final String groupId;

  const GroupJoinRequestsPage({super.key, required this.groupId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(groupDetailProvider(groupId));
    final requestsAsync = ref.watch(groupJoinRequestsProvider(groupId));

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('入群申请',
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
          final canReview = permissions.canManage;
          if (!canReview) {
            return const Center(
              child: Text('仅群主/管理员/企业管理员可查看入群申请',
                  style: TextStyle(color: _secondary)),
            );
          }

          return requestsAsync.when(
            loading: () =>
                const Center(child: CircularProgressIndicator(color: _primary)),
            error: (_, __) => _ErrorView(
              onRetry: () => ref.invalidate(groupJoinRequestsProvider(groupId)),
            ),
            data: (requests) {
              if (requests.isEmpty) {
                return const _EmptyView();
              }
              return RefreshIndicator(
                color: _primary,
                onRefresh: () async {
                  final _ = await ref
                      .refresh(groupJoinRequestsProvider(groupId).future);
                },
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: requests.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1, indent: 72, color: _divider),
                  itemBuilder: (context, index) => _RequestTile(
                    groupId: groupId,
                    request: requests[index],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _RequestTile extends ConsumerStatefulWidget {
  final String groupId;
  final GroupJoinRequest request;

  const _RequestTile({required this.groupId, required this.request});

  @override
  ConsumerState<_RequestTile> createState() => _RequestTileState();
}

class _RequestTileState extends ConsumerState<_RequestTile> {
  bool _saving = false;

  Future<void> _approve() async {
    await _review(() {
      final dio = ref.read(dioProvider);
      return dio.post<void>(
        '/api/client/v1/groups/${widget.groupId}/join-requests/${widget.request.requestId}/approve',
      );
    }, '已同意入群申请');
  }

  Future<void> _reject() async {
    final reason = await _showRejectReason();
    if (reason == null) return;
    await _review(() {
      final dio = ref.read(dioProvider);
      return dio.post<void>(
        '/api/client/v1/groups/${widget.groupId}/join-requests/${widget.request.requestId}/reject',
        data: {'rejectReason': reason},
      );
    }, '已拒绝入群申请');
  }

  Future<void> _review(
      Future<Response<void>> Function() action, String successText) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await action();
      await _refreshAfterReview();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(successText)));
      }
    } on DioException catch (e) {
      if (_isAlreadyHandled(e)) {
        await _refreshAfterReview();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('该申请已处理，已刷新最新状态')),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _refreshAfterReview() async {
    final _ =
        await ref.refresh(groupJoinRequestsProvider(widget.groupId).future);
    ref.read(groupDetailProvider(widget.groupId).notifier).refresh();
    ref.invalidate(groupMembersProvider(widget.groupId));
    final spaceId = ref.read(currentSpaceProvider)?.spaceId;
    if (spaceId != null && spaceId.isNotEmpty) {
      ref.invalidate(conversationsProvider(spaceId));
    }
  }

  bool _isAlreadyHandled(DioException e) {
    final data = e.response?.data;
    if (e.response?.statusCode != 409 || data is! Map) return false;
    final code = data['code']?.toString().toUpperCase() ?? '';
    final message = data['message']?.toString().toLowerCase() ?? '';
    return code == 'GROUP_JOIN_REQUEST_HANDLED' ||
        code == 'JOIN_REQUEST_HANDLED' ||
        message.contains('already handled') ||
        message.contains('已处理');
  }

  Future<String?> _showRejectReason() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('拒绝入群申请'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: '填写拒绝原因（可选）',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
            child: const Text('拒绝', style: TextStyle(color: _red)),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final request = widget.request;
    return Container(
      color: _card,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UserAvatar(
            avatarUrl: request.avatarUrl,
            name: request.displayName,
            size: 44,
            borderRadius: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        request.displayName,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: _text),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    _StatusPill(status: request.status),
                  ],
                ),
                if (request.message?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 4),
                  Text(
                    request.message!.trim(),
                    style: const TextStyle(fontSize: 13, color: _secondary),
                  ),
                ],
                if (request.isPending) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: _saving ? null : _reject,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _red,
                          side: const BorderSide(color: _red),
                          minimumSize: const Size(72, 34),
                        ),
                        child: const Text('拒绝'),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton(
                        onPressed: _saving ? null : _approve,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primary,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(72, 34),
                        ),
                        child: _saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('同意'),
                      ),
                    ],
                  ),
                ] else if (request.rejectReason?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 6),
                  Text(
                    '拒绝原因：${request.rejectReason!.trim()}',
                    style: const TextStyle(fontSize: 12, color: _secondary),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String status;

  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    final (text, color) = switch (status) {
      'approved' => ('已通过', _primary),
      'rejected' => ('已拒绝', _red),
      _ => ('待审核', _secondary),
    };
    return Text(
      text,
      style: TextStyle(fontSize: 12, color: color),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('暂无入群申请', style: TextStyle(color: _secondary)),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final VoidCallback onRetry;

  const _ErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TextButton(
        onPressed: onRetry,
        child: const Text('加载失败，点击重试'),
      ),
    );
  }
}
