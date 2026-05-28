import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/identity/user_identity_summary.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

bool _isDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _primaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1C1C1E);

Color _secondaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _bodyText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.78)
    : const Color(0xFF4B5563);

// ---------------------------------------------------------------------------
// 加入申请审批页（管理员/所有者）
// GET  /api/client/v1/tenant/join-requests
// POST /api/client/v1/tenant/join-requests/{requestId}/approve
// POST /api/client/v1/tenant/join-requests/{requestId}/reject
// ---------------------------------------------------------------------------

class _JoinRequest {
  final String requestId;
  final UserIdentitySummary applicant;
  final String? message;
  final int status; // 0=pending, 1=approved, 2=rejected
  final String? createdAt;

  const _JoinRequest({
    required this.requestId,
    required this.applicant,
    this.message,
    required this.status,
    this.createdAt,
  });

  factory _JoinRequest.fromJson(Map<String, dynamic> json) => _JoinRequest(
        requestId: json['requestId'] as String? ?? '',
        applicant: UserIdentitySummary.fromJson(json),
        message: json['message'] as String?,
        status: _parseStatus(json['status']),
        createdAt: json['createdAt'] as String?,
      );

  bool get isPending => status == 0;

  static int _parseStatus(Object? value) {
    if (value is int) return value;
    final text = value?.toString().toLowerCase();
    return switch (text) {
      'pending' => 0,
      'approved' => 1,
      'rejected' => 2,
      'cancelled' => 3,
      _ => 0,
    };
  }
}

final _joinRequestsProvider =
    FutureProvider.autoDispose<List<_JoinRequest>>((ref) async {
  final dio = ref.read(dioProvider);
  final resp = await dio
      .get<Map<String, dynamic>>('/api/client/v1/tenant/join-requests')
      .onError((error, stackTrace) {
    if (error is DioException) {
      throw ErrorHandler.fromDioException(error);
    }
    throw error!;
  });
  final list = resp.data?['data'] as List<dynamic>? ?? [];
  return list
      .map((e) => _JoinRequest.fromJson(e as Map<String, dynamic>))
      .toList();
});

String _joinRequestErrorTitle(Object error) {
  if (error is AuthError) return '登录已失效，请重新登录';
  if (error is NetworkError) return error.message;
  if (error is ServerError) {
    if (error.statusCode == 403 || error.code.contains('FORBIDDEN')) {
      return '仅企业管理员或所有者可查看新的申请';
    }
    return '加入申请接口不可用';
  }
  return '加载失败，请下拉刷新重试';
}

String? _joinRequestErrorDetail(Object error) {
  if (error is ServerError) {
    return 'GET /api/client/v1/tenant/join-requests 返回 ${error.statusCode ?? ''} ${error.code}，requestId=${error.requestId ?? '-'}';
  }
  return null;
}

class NewApplicationsPage extends ConsumerWidget {
  const NewApplicationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(currentSpaceProvider);

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 18, color: _primaryText(context)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('加入企业申请',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: _primaryText(context))),
        centerTitle: true,
      ),
      body: space?.isAdminOrAbove != true
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  '仅企业管理员或所有者可查看新的申请',
                  style:
                      TextStyle(fontSize: 15, color: _secondaryText(context)),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : ref.watch(_joinRequestsProvider).when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) {
                  final detail = _joinRequestErrorDetail(e);
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            e is ServerError
                                ? Icons.cloud_off_outlined
                                : Icons.error_outline,
                            size: 48,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.4),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _joinRequestErrorTitle(e),
                            style: TextStyle(
                                fontSize: 15, color: _secondaryText(context)),
                            textAlign: TextAlign.center,
                          ),
                          if (detail != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              detail,
                              style: TextStyle(
                                  fontSize: 12, color: _bodyText(context)),
                              textAlign: TextAlign.center,
                            ),
                          ],
                          const SizedBox(height: 20),
                          TextButton(
                            onPressed: () =>
                                ref.invalidate(_joinRequestsProvider),
                            child: const Text('重试',
                                style: TextStyle(color: Color(0xFF00B27A))),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                data: (requests) {
                  final pending = requests.where((r) => r.isPending).toList();
                  final processed =
                      requests.where((r) => !r.isPending).toList();

                  if (requests.isEmpty) {
                    return Center(
                      child: Text('暂无申请',
                          style: TextStyle(color: _secondaryText(context))),
                    );
                  }

                  return RefreshIndicator(
                    color: const Color(0xFF00B27A),
                    onRefresh: () async {
                      final _ = await ref.refresh(_joinRequestsProvider.future);
                    },
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 20),
                      children: [
                        if (pending.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 6, 4, 6),
                            child: Text('待处理 (${pending.length})',
                                style: TextStyle(
                                    fontSize: 13,
                                    color: _secondaryText(context))),
                          ),
                          ...pending.map((r) => _RequestCard(
                                request: r,
                                onApprove: () =>
                                    _approve(context, ref, r.requestId),
                                onReject: () =>
                                    _reject(context, ref, r.requestId),
                              )),
                          const SizedBox(height: 16),
                        ],
                        if (processed.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 6, 4, 6),
                            child: Text('已处理 (${processed.length})',
                                style: TextStyle(
                                    fontSize: 13,
                                    color: _secondaryText(context))),
                          ),
                          ...processed.map((r) => _RequestCard(request: r)),
                        ],
                      ],
                    ),
                  );
                },
              ),
    );
  }

  Future<void> _approve(
      BuildContext context, WidgetRef ref, String requestId) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/api/client/v1/tenant/join-requests/$requestId/approve');
      final _ = await ref.refresh(_joinRequestsProvider.future);
      ref.invalidate(pendingJoinRequestsCountProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已通过申请')));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    }
  }

  Future<void> _reject(
      BuildContext context, WidgetRef ref, String requestId) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/api/client/v1/tenant/join-requests/$requestId/reject');
      final _ = await ref.refresh(_joinRequestsProvider.future);
      ref.invalidate(pendingJoinRequestsCountProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已拒绝申请')));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('操作失败，请重试')));
      }
    }
  }
}

class _RequestCard extends StatelessWidget {
  final _JoinRequest request;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const _RequestCard({required this.request, this.onApprove, this.onReject});

  String _formatTime(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
      if (diff.inHours < 24) return '${diff.inHours}小时前';
      return '${diff.inDays}天前';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = request.applicant.displayNameOrId;
    final timeStr = _formatTime(request.createdAt);
    final userId = request.applicant.userId;
    final canOpenProfile = userId?.isNotEmpty == true;

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: canOpenProfile
            ? () => context.push('/profile/$userId')
            : () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('服务端未返回申请人的用户ID，暂时无法查看资料'),
                  ),
                ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  UserAvatar(
                    avatarUrl: request.applicant.avatarUrl,
                    name: name,
                    size: 42,
                    borderRadius: 21,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: _primaryText(context))),
                        if (request.message?.trim().isNotEmpty == true)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              request.message!.trim(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: _bodyText(context),
                              ),
                            ),
                          ),
                        if (timeStr.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(timeStr,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: _secondaryText(context))),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (request.isPending)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _CompactActionButton(
                          label: '拒绝',
                          onPressed: onReject,
                        ),
                        const SizedBox(width: 6),
                        _CompactActionButton(
                          label: '通过',
                          onPressed: onApprove,
                          filled: true,
                        ),
                      ],
                    )
                  else
                    // 已处理状态
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: request.status == 1
                            ? const Color(0xFFE8F8EF)
                            : const Color(0xFFFFF0F0),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        request.status == 1 ? '已通过' : '已拒绝',
                        style: TextStyle(
                          fontSize: 12,
                          color: request.status == 1
                              ? const Color(0xFF00B27A)
                              : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompactActionButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool filled;

  const _CompactActionButton({
    required this.label,
    required this.onPressed,
    this.filled = false,
  });

  @override
  Widget build(BuildContext context) {
    final foreground =
        filled ? Colors.white : Theme.of(context).colorScheme.onSurface;
    return SizedBox(
      height: 30,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          minimumSize: const Size(50, 30),
          padding: const EdgeInsets.symmetric(horizontal: 11),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          foregroundColor: foreground,
          backgroundColor: filled ? const Color(0xFF00B27A) : null,
          side: filled
              ? BorderSide.none
              : const BorderSide(color: Color(0xFFE5E5EA)),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        ),
        child: Text(label),
      ),
    );
  }
}
