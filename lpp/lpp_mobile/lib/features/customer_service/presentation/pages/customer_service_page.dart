import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/conversations_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';
import 'package:lpp_mobile/features/settings/presentation/providers/timezone_provider.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);

String broadcastFriendlyError(Object error) {
  final code = _extractBroadcastErrorCode(error);
  final status = error is DioException ? error.response?.statusCode : null;
  final raw = error.toString();

  if (code == 'CS_BROADCAST_GROUP_FORBIDDEN') {
    return '不是该群成员，无法群内群发';
  }
  if (code == 'CS_BROADCAST_GROUP_REQUIRED') return '请选择群聊';
  if (code == 'CS_BROADCAST_GROUP_NOT_ALLOWED') return '全租户群发不能携带群聊';
  if (code == 'CS_BROADCAST_GROUP_NOT_FOUND') return '目标群或任务不存在';
  if (code == 'CS_BROADCAST_NOT_A_GROUP') return '目标不是群聊';
  if (code == 'CS_BROADCAST_GROUP_UNAVAILABLE') return '目标群不可用';
  if (code == 'CS_BROADCAST_BODY_INVALID' ||
      code == 'CS_BROADCAST_INVALID_TYPE') {
    return '消息内容格式不支持';
  }
  if (code == 'CS_BROADCAST_NO_RECIPIENTS') return '目标范围内没有可投递成员';
  if (code == 'CS_BROADCAST_TOO_MANY_RECIPIENTS') return '目标人数超过单次群发上限';
  if (code == 'CS_BROADCAST_BLOCKED_BY_MODERATION') return '内容命中敏感词，已被拦截';
  if (code == 'CS_BROADCAST_RATE_LIMITED' || status == 429) {
    return '群发提交过于频繁，请稍后再试';
  }
  if (code == 'CS_BROADCAST_RETRY_UNSUPPORTED') return '群内群发不支持逐人重试';

  final adminTokenFailed = raw.contains('管理后台接口权限') ||
      raw.contains('缺少平台登录凭证') ||
      raw.contains('admin-token') ||
      raw.contains('admin-tenants') ||
      raw.contains('admin');
  final adminPermissionFailed = status == 401 ||
      status == 403 ||
      code == 'FORBIDDEN' ||
      code == 'UNAUTHORIZED' ||
      code == 'PERMISSION_DENIED' ||
      code == 'AUTH_ADMIN_FORBIDDEN' ||
      code == 'AUTH_NO_TENANT_USER';
  if (adminTokenFailed || adminPermissionFailed) {
    return '缺少群发所需的管理端权限';
  }

  if (code == 'CS_BROADCAST_NOT_FOUND' ||
      code == 'NOT_FOUND' ||
      status == 404) {
    return '目标群或任务不存在';
  }
  if (status == 500) return '服务端错误';
  return '群发失败';
}

String _extractBroadcastErrorCode(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final direct = data['code'] ?? data['errorCode'];
      if (direct is String && direct.isNotEmpty) return direct;
      final nested = data['data'];
      if (nested is Map) {
        final nestedCode = nested['code'] ?? nested['errorCode'];
        if (nestedCode is String && nestedCode.isNotEmpty) return nestedCode;
      }
    }
  }
  final raw = error.toString();
  final match = RegExp(r'\b[A-Z][A-Z0-9_]{2,}\b').firstMatch(raw);
  return match?.group(0) ?? '';
}

String formatWorkbenchDateRange(DateTimeRange range) {
  String format(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}.$month.$day';
  }

  return '${format(range.start)}-${format(range.end)}';
}

// ---------------------------------------------------------------------------
// CustomerServicePage
// ---------------------------------------------------------------------------

class CustomerServicePage extends ConsumerStatefulWidget {
  const CustomerServicePage({super.key});

  @override
  ConsumerState<CustomerServicePage> createState() =>
      _CustomerServicePageState();
}

class _CustomerServicePageState extends ConsumerState<CustomerServicePage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(effectiveCurrentSpaceProvider);
    final hasAdminConsoleAccess =
        ref.watch(currentSpaceHasAdminConsoleAccessProvider);
    if (!AppPermissions.canSeeWorkbench(space) && !hasAdminConsoleAccess) {
      return _NoWorkbenchPermissionPage(space: space);
    }
    if ((space?.isAdminOrAbove ?? false) || hasAdminConsoleAccess) {
      return _ManagementWorkbenchPage(space: space);
    }
    if (!AppPermissions.canUseCustomerWorkbench(space)) {
      return _EmployeeWorkbenchPage(space: space);
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 20, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () => context.pop(),
        ),
        title: Text('客服工作台',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          labelColor: _primary,
          unselectedLabelColor: _secondary,
          indicatorColor: _primary,
          indicatorWeight: 2,
          labelStyle:
              const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          tabs: const [
            Tab(text: '在线客服'),
            Tab(text: '客户服务'),
            Tab(text: '效能'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _OnlineServiceTab(),
          _CustomerServiceTasksTab(),
          _DashboardTab(),
        ],
      ),
    );
  }
}

class _EmployeeWorkbenchPage extends StatelessWidget {
  final SpaceContext? space;

  const _EmployeeWorkbenchPage({required this.space});

  @override
  Widget build(BuildContext context) {
    const section = _WorkbenchSection(
      title: '企业',
      actions: [
        _WorkbenchAction(
          icon: Icons.campaign_outlined,
          title: '企业公告',
          route: '/notices',
        ),
      ],
    );
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          '工作台',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            _WorkbenchSectionCard(
              section: section,
              onActionTap: (action) {
                if (action.route != null) {
                  context.push(action.route!);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ReceptionStatusCard extends ConsumerWidget {
  const _ReceptionStatusCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusAsync = ref.watch(customerServiceReceptionStatusProvider);
    final status = statusAsync.valueOrNull;
    final isLoading = statusAsync.isLoading;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        children: [
          _ReceptionControlRow(
            label: '接待',
            child: _ReceptionStatusSegmentedControl(
              status: status,
              isLoading: isLoading,
            ),
          ),
          const SizedBox(height: 8),
          _ReceptionControlRow(
            label: '模式',
            child: _ReceptionModeSegmentedControl(
              status: status,
              isLoading: isLoading,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceptionControlRow extends StatelessWidget {
  final String label;
  final Widget child;

  const _ReceptionControlRow({
    required this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 32,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 46,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _ReceptionModeSegmentedControl extends StatelessWidget {
  final CsReceptionStatus? status;
  final bool isLoading;

  const _ReceptionModeSegmentedControl({
    required this.status,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final disabled = isLoading || status?.serviceStatus != 'online';
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.onSurface.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(
              child: _ReceptionModeButton(
                label: '手动接入',
                enabledValue: false,
                selected: !(status?.queueAcceptEnabled ?? false),
                disabled: isLoading,
              ),
            ),
            const _SegmentDivider(),
            Expanded(
              child: _ReceptionModeButton(
                label: '自动分配',
                enabledValue: true,
                selected: status?.queueAcceptEnabled ?? false,
                disabled: disabled,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReceptionStatusSegmentedControl extends StatelessWidget {
  final CsReceptionStatus? status;
  final bool isLoading;

  const _ReceptionStatusSegmentedControl({
    required this.status,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.onSurface.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(
              child: _ReceptionStatusButton(
                label: '在线',
                value: 'online',
                selected: status?.isOnline ?? false,
                disabled: isLoading,
              ),
            ),
            const _SegmentDivider(),
            Expanded(
              child: _ReceptionStatusButton(
                label: '忙碌',
                value: 'busy',
                selected: status?.serviceStatus == 'busy',
                disabled: isLoading,
              ),
            ),
            const _SegmentDivider(),
            Expanded(
              child: _ReceptionStatusButton(
                label: '离开',
                value: 'break',
                selected: status?.serviceStatus == 'break',
                disabled: isLoading,
              ),
            ),
            const _SegmentDivider(),
            Expanded(
              child: _ReceptionStatusButton(
                label: '离线',
                value: 'offline',
                selected: status?.isOffline ?? false,
                disabled: isLoading,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReceptionModeButton extends ConsumerWidget {
  final String label;
  final bool enabledValue;
  final bool selected;
  final bool disabled;

  const _ReceptionModeButton({
    required this.label,
    required this.enabledValue,
    required this.selected,
    required this.disabled,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground =
        selected ? Colors.white : colorScheme.onSurface.withValues(alpha: 0.82);
    return Material(
      color: selected ? _primary : Colors.transparent,
      child: InkWell(
        onTap: disabled || selected
            ? null
            : () async {
                try {
                  await ref
                      .read(customerServiceReceptionStatusProvider.notifier)
                      .setQueueAcceptEnabled(enabledValue);
                  if (context.mounted) {
                    AppToast.success(context, '已切换为$label');
                  }
                } catch (_) {
                  if (context.mounted) {
                    AppToast.error(context, '接入模式切换失败，请重试');
                  }
                }
              },
        child: SizedBox(
          height: 32,
          child: Center(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: disabled && !selected
                    ? foreground.withValues(alpha: 0.45)
                    : foreground,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SegmentDivider extends StatelessWidget {
  const _SegmentDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 18,
      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.08),
    );
  }
}

class _ReceptionStatusButton extends ConsumerWidget {
  final String label;
  final String value;
  final bool selected;
  final bool disabled;

  const _ReceptionStatusButton({
    required this.label,
    required this.value,
    required this.selected,
    required this.disabled,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground =
        selected ? Colors.white : colorScheme.onSurface.withValues(alpha: 0.82);
    return Material(
      color: selected ? _primary : Colors.transparent,
      child: InkWell(
        onTap: disabled || selected
            ? null
            : () async {
                try {
                  await ref
                      .read(customerServiceReceptionStatusProvider.notifier)
                      .setStatus(value);
                  if (context.mounted) {
                    AppToast.success(context, '已切换为$label');
                  }
                } catch (_) {
                  if (context.mounted) {
                    AppToast.error(context, '状态切换失败，请重试');
                  }
                }
              },
        child: SizedBox(
          height: 32,
          child: Center(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: disabled && !selected
                    ? foreground.withValues(alpha: 0.45)
                    : foreground,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NoWorkbenchPermissionPage extends StatelessWidget {
  final SpaceContext? space;

  const _NoWorkbenchPermissionPage({required this.space});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          '工作台',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: Center(
        child: Text(
          space == null ? '请先进入企业空间' : '当前身份暂无工作台权限',
          style: TextStyle(
            fontSize: 15,
            color: Theme.of(context).colorScheme.onSurface.withValues(
                  alpha: 0.58,
                ),
          ),
        ),
      ),
    );
  }
}

class _ManagementWorkbenchPage extends ConsumerWidget {
  final SpaceContext? space;

  const _ManagementWorkbenchPage({required this.space});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final adminTenant = ref.watch(currentSpaceAdminAccessibleTenantProvider);
    final isOwner =
        (space?.isOwner ?? false) || (adminTenant?.hasOwnerRole ?? false);
    final pendingJoinCount =
        ref.watch(pendingJoinRequestsCountProvider).valueOrNull ?? 0;
    final title = isOwner ? '所有者工作台' : '管理工作台';
    final sections = isOwner
        ? [
            _WorkbenchSection(
              title: '客户运营',
              actions: [
                const _WorkbenchAction(
                  icon: Icons.insights_outlined,
                  title: '客户管理',
                  route: '/customer-overview',
                ),
                _WorkbenchAction(
                  icon: Icons.task_alt_outlined,
                  title: '加入企业申请',
                  route: '/new-applications',
                  badge: pendingJoinCount > 0 ? '$pendingJoinCount' : null,
                ),
                const _WorkbenchAction(
                  icon: Icons.trending_up_outlined,
                  title: '客户增长',
                  featureKey: 'owner_customer_growth',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '服务运营',
              actions: [
                _WorkbenchAction(
                  icon: Icons.support_agent_outlined,
                  title: '客服中心',
                  featureKey: 'admin_service_center',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '风控治理',
              actions: [
                _WorkbenchAction(
                  icon: Icons.warning_amber_outlined,
                  title: '风险会话',
                  featureKey: 'owner_risk_threads',
                ),
                _WorkbenchAction(
                  icon: Icons.manage_search_outlined,
                  title: '会话审计',
                  featureKey: 'owner_thread_audit',
                ),
                _WorkbenchAction(
                  icon: Icons.fact_check_outlined,
                  title: '操作审计',
                  featureKey: 'owner_operation_audit',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '群组运营',
              actions: [
                _WorkbenchAction(
                  icon: Icons.groups_outlined,
                  title: '群组监管',
                  route: '/admin/groups',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '企业管理',
              actions: [
                _WorkbenchAction(
                  icon: Icons.campaign_outlined,
                  title: '企业群发',
                  route: '/enterprise-broadcast',
                ),
                _WorkbenchAction(
                  icon: Icons.campaign_outlined,
                  title: '企业公告',
                  route: '/notices',
                ),
                _WorkbenchAction(
                  icon: Icons.business_outlined,
                  title: '企业管理',
                  route: '/enterprise-manage',
                ),
              ],
            ),
          ]
        : [
            _WorkbenchSection(
              title: '客户运营',
              actions: [
                const _WorkbenchAction(
                  icon: Icons.insights_outlined,
                  title: '客户管理',
                  route: '/customer-overview',
                ),
                _WorkbenchAction(
                  icon: Icons.task_alt_outlined,
                  title: '加入企业申请',
                  route: '/new-applications',
                  badge: pendingJoinCount > 0 ? '$pendingJoinCount' : null,
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '服务运营',
              actions: [
                _WorkbenchAction(
                  icon: Icons.support_agent_outlined,
                  title: '客服中心',
                  featureKey: 'admin_service_center',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '风控治理',
              actions: [
                _WorkbenchAction(
                  icon: Icons.timer_outlined,
                  title: '超时未响应',
                  featureKey: 'admin_timeout_threads',
                ),
                _WorkbenchAction(
                  icon: Icons.warning_amber_outlined,
                  title: '风险会话',
                  featureKey: 'admin_risk_threads',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '群组运营',
              actions: [
                _WorkbenchAction(
                  icon: Icons.groups_outlined,
                  title: '群组监管',
                  route: '/admin/groups',
                ),
              ],
            ),
            const _WorkbenchSection(
              title: '企业管理',
              actions: [
                _WorkbenchAction(
                  icon: Icons.campaign_outlined,
                  title: '企业群发',
                  route: '/enterprise-broadcast',
                ),
                _WorkbenchAction(
                  icon: Icons.campaign_outlined,
                  title: '企业公告',
                  route: '/notices',
                ),
                _WorkbenchAction(
                  icon: Icons.business_outlined,
                  title: '企业管理',
                  route: '/enterprise-manage',
                ),
              ],
            ),
          ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            ...sections.map(
              (section) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(2, 0, 2, 8),
                      child: Text(
                        section.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.72),
                        ),
                      ),
                    ),
                    _WorkbenchSectionCard(
                      section: section,
                      onActionTap: (action) {
                        if (action.route != null) {
                          context.push(action.route!);
                          return;
                        }
                        context.push(
                          Uri(
                            path: '/workbench/feature',
                            queryParameters: {
                              'title': action.title,
                              'feature': action.featureKey,
                            },
                          ).toString(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkbenchSection {
  final String title;
  final List<_WorkbenchAction> actions;

  const _WorkbenchSection({
    required this.title,
    required this.actions,
  });
}

class _WorkbenchSectionCard extends StatelessWidget {
  final _WorkbenchSection section;
  final ValueChanged<_WorkbenchAction> onActionTap;

  const _WorkbenchSectionCard({
    required this.section,
    required this.onActionTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: section.actions.asMap().entries.map((entry) {
          final index = entry.key;
          final action = entry.value;
          final isLast = index == section.actions.length - 1;
          return Column(
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onActionTap(action),
                  borderRadius: BorderRadius.vertical(
                    top: index == 0 ? const Radius.circular(16) : Radius.zero,
                    bottom: isLast ? const Radius.circular(16) : Radius.zero,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 13.5,
                    ),
                    child: Row(
                      children: [
                        Icon(action.icon, color: _primary, size: 22),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            action.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (action.badge != null) ...[
                          Container(
                            constraints: const BoxConstraints(minWidth: 18),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: const BoxDecoration(
                              color: Color(0xFFFF3B30),
                              borderRadius:
                                  BorderRadius.all(Radius.circular(9)),
                            ),
                            child: Text(
                              action.badge!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Icon(
                          Icons.chevron_right,
                          size: 18,
                          color: colorScheme.onSurface.withValues(alpha: 0.3),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 50,
                  color: Theme.of(context).dividerColor,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _WorkbenchAction {
  final IconData icon;
  final String title;
  final String featureKey;
  final String? route;
  final String? badge;
  final VoidCallback? onTap;

  const _WorkbenchAction({
    required this.icon,
    required this.title,
    this.featureKey = '',
    this.route,
    this.badge,
    this.onTap,
  });
}

class OwnerWorkbenchFeaturePage extends StatelessWidget {
  final String title;
  final String featureKey;

  const OwnerWorkbenchFeaturePage({
    super.key,
    required this.title,
    required this.featureKey,
  });

  @override
  Widget build(BuildContext context) {
    final config = _WorkbenchFeatureConfig.from(featureKey, title);
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          config.title,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            if (config.searchHint != null) ...[
              _WorkbenchSearchBox(hint: config.searchHint!),
              const SizedBox(height: 12),
            ],
            if (config.timeRanges.isNotEmpty) ...[
              _WorkbenchTimeRangeSelector(ranges: config.timeRanges),
              const SizedBox(height: 12),
            ],
            if (config.stats.isNotEmpty) ...[
              _WorkbenchStatsStrip(stats: config.stats),
              const SizedBox(height: 12),
            ],
            _AdminWorkbenchFeatureContent(
              featureKey: featureKey,
              config: config,
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkbenchFeatureConfig {
  final String title;
  final IconData icon;
  final String emptyText;
  final String? searchHint;
  final List<_WorkbenchStat> stats;
  final List<String> timeRanges;
  final bool assignableList;

  const _WorkbenchFeatureConfig({
    required this.title,
    required this.icon,
    required this.emptyText,
    this.searchHint,
    this.stats = const [],
    this.timeRanges = const [],
    this.assignableList = false,
  });

  factory _WorkbenchFeatureConfig.from(String key, String fallbackTitle) {
    return switch (key) {
      'owner_customer_overview' => const _WorkbenchFeatureConfig(
          title: '客户管理',
          icon: Icons.insights_outlined,
          emptyText: '暂无客户数据',
          searchHint: '搜索客户',
          stats: [
            _WorkbenchStat('客户总数', '--'),
            _WorkbenchStat('待分配', '--'),
          ],
        ),
      'owner_unassigned_customers' => const _WorkbenchFeatureConfig(
          title: '待分配客户',
          icon: Icons.assignment_ind_outlined,
          emptyText: '暂无待分配客户',
          searchHint: '搜索客户',
          assignableList: true,
          stats: [
            _WorkbenchStat('待分配', '--'),
            _WorkbenchStat('今日新增', '--'),
            _WorkbenchStat('超时未分配', '--'),
          ],
        ),
      'owner_customer_growth' => const _WorkbenchFeatureConfig(
          title: '客户增长',
          icon: Icons.trending_up_outlined,
          emptyText: '暂无增长数据',
          timeRanges: ['当日', '最近7天', '本月', '本季度', '半年', '自定义'],
          stats: [
            _WorkbenchStat('新增客户', '--'),
            _WorkbenchStat('活跃客户', '--'),
            _WorkbenchStat('沉默客户', '--'),
            _WorkbenchStat('流失风险', '--'),
          ],
        ),
      'owner_customer_groups' => const _WorkbenchFeatureConfig(
          title: '客户群组',
          icon: Icons.groups_outlined,
          emptyText: '暂无客户群组数据',
          searchHint: '搜索客户群组',
        ),
      'owner_service_efficiency' => const _WorkbenchFeatureConfig(
          title: '团队服务效率',
          icon: Icons.support_agent_outlined,
          emptyText: '暂无服务效率数据',
          stats: [
            _WorkbenchStat('平均响应', '--'),
            _WorkbenchStat('处理会话', '--'),
          ],
        ),
      'owner_service_groups' => const _WorkbenchFeatureConfig(
          title: '服务群监控',
          icon: Icons.forum_outlined,
          emptyText: '暂无服务群数据',
          searchHint: '搜索客户或服务群',
        ),
      'owner_thread_management' => const _WorkbenchFeatureConfig(
          title: '客服会话管理',
          icon: Icons.forum_outlined,
          emptyText: '暂无会话',
          searchHint: '搜索客户、访客或会话',
        ),
      'owner_risk_threads' => const _WorkbenchFeatureConfig(
          title: '风险会话',
          icon: Icons.warning_amber_outlined,
          emptyText: '暂无风险会话',
          searchHint: '搜索客户、客服或会话',
        ),
      'owner_thread_audit' => const _WorkbenchFeatureConfig(
          title: '会话审计',
          icon: Icons.manage_search_outlined,
          emptyText: '暂无会话记录',
          searchHint: '搜索客户、客服或会话',
        ),
      'owner_operation_audit' => const _WorkbenchFeatureConfig(
          title: '操作审计',
          icon: Icons.fact_check_outlined,
          emptyText: '暂无审计记录',
          searchHint: '搜索操作人或客户',
        ),
      'admin_unassigned_customers' => const _WorkbenchFeatureConfig(
          title: '待分配客户',
          icon: Icons.assignment_ind_outlined,
          emptyText: '暂无待分配客户',
          searchHint: '搜索客户',
          assignableList: true,
          stats: [
            _WorkbenchStat('待分配', '--'),
            _WorkbenchStat('今日新增', '--'),
            _WorkbenchStat('超时未分配', '--'),
          ],
        ),
      'admin_by_staff' => const _WorkbenchFeatureConfig(
          title: '按客服查看',
          icon: Icons.support_agent_outlined,
          emptyText: '暂无客服服务数据',
          searchHint: '搜索客服',
        ),
      'admin_customer_groups' => const _WorkbenchFeatureConfig(
          title: '客户群组',
          icon: Icons.groups_outlined,
          emptyText: '暂无客户群组数据',
          searchHint: '搜索客户群组',
        ),
      'admin_timeout_threads' => const _WorkbenchFeatureConfig(
          title: '超时未响应',
          icon: Icons.timer_outlined,
          emptyText: '暂无超时会话',
          searchHint: '搜索客户或会话',
        ),
      'admin_staff_status' => const _WorkbenchFeatureConfig(
          title: '客服状态',
          icon: Icons.radio_button_checked_outlined,
          emptyText: '暂无客服状态数据',
          stats: [
            _WorkbenchStat('在线', '--'),
            _WorkbenchStat('忙碌', '--'),
            _WorkbenchStat('离线', '--'),
          ],
        ),
      'admin_service_center' => const _WorkbenchFeatureConfig(
          title: '客服中心',
          icon: Icons.support_agent_outlined,
          emptyText: '暂无客服数据',
        ),
      'admin_risk_threads' => const _WorkbenchFeatureConfig(
          title: '风险会话',
          icon: Icons.warning_amber_outlined,
          emptyText: '暂无风险会话',
          searchHint: '搜索客户、客服或会话',
        ),
      _ => _WorkbenchFeatureConfig(
          title: fallbackTitle.isEmpty ? '工作台' : fallbackTitle,
          icon: Icons.widgets_outlined,
          emptyText: '暂无数据',
        ),
    };
  }
}

class _WorkbenchStat {
  final String label;
  final String value;

  const _WorkbenchStat(this.label, this.value);
}

class _WorkbenchSearchBox extends StatelessWidget {
  final String hint;

  const _WorkbenchSearchBox({required this.hint});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: [
          Icon(
            Icons.search,
            size: 20,
            color: colorScheme.onSurface.withValues(alpha: 0.38),
          ),
          const SizedBox(width: 8),
          Text(
            hint,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkbenchTimeRangeSelector extends StatefulWidget {
  final List<String> ranges;

  const _WorkbenchTimeRangeSelector({required this.ranges});

  @override
  State<_WorkbenchTimeRangeSelector> createState() =>
      _WorkbenchTimeRangeSelectorState();
}

class _WorkbenchTimeRangeSelectorState
    extends State<_WorkbenchTimeRangeSelector> {
  late String _selected = widget.ranges.first;
  DateTimeRange? _customRange;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: widget.ranges.map((range) {
          final selected = range == _selected;
          final label = range == '自定义' && _customRange != null
              ? '自定义 ${formatWorkbenchDateRange(_customRange!)}'
              : range;
          return InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () async {
              if (range == '自定义') {
                final now = DateTime.now();
                final picked = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(now.year - 3),
                  lastDate: DateTime(now.year + 1),
                  initialDateRange: _customRange ??
                      DateTimeRange(
                        start: now.subtract(const Duration(days: 6)),
                        end: now,
                      ),
                );
                if (picked == null) return;
                if (!mounted) return;
                setState(() {
                  _selected = range;
                  _customRange = picked;
                });
                return;
              }
              if (!mounted) return;
              setState(() => _selected = range);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: selected
                    ? _primary.withValues(alpha: 0.12)
                    : colorScheme.onSurface.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? _primary : colorScheme.onSurface,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _WorkbenchStatsStrip extends StatelessWidget {
  final List<_WorkbenchStat> stats;

  const _WorkbenchStatsStrip({required this.stats});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final useGrid = stats.length > 3 || constraints.maxWidth < 330;
          if (!useGrid) {
            return Row(
              children: stats
                  .map((stat) => Expanded(child: _WorkbenchStatItem(stat)))
                  .toList(),
            );
          }
          return Wrap(
            runSpacing: 14,
            children: stats
                .map(
                  (stat) => SizedBox(
                    width: constraints.maxWidth / 2,
                    child: _WorkbenchStatItem(stat),
                  ),
                )
                .toList(),
          );
        },
      ),
    );
  }
}

class _WorkbenchStatItem extends StatelessWidget {
  final _WorkbenchStat stat;

  const _WorkbenchStatItem(this.stat);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          stat.value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          stat.label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            color: colorScheme.onSurface.withValues(alpha: 0.55),
          ),
        ),
      ],
    );
  }
}

class _UnassignedCustomerQueue extends ConsumerWidget {
  final _WorkbenchFeatureConfig config;

  const _UnassignedCustomerQueue({required this.config});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(adminDirectCustomerThreadsProvider(true)).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _AdminErrorCard(
            message: '待分配客户接口暂不可用',
          ),
          data: (items) {
            if (items.isEmpty) {
              return _WorkbenchEmptyState(
                icon: config.icon,
                message: config.emptyText,
              );
            }
            return _UnassignedCustomerThreadList(items: items);
          },
        );
  }
}

class _UnassignedCustomerThreadList extends ConsumerWidget {
  final List<CsThread> items;

  const _UnassignedCustomerThreadList({required this.items});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final thread = entry.value;
          final isLast = entry.key == items.length - 1;
          return Column(
            children: [
              ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: PersonAvatarWithBadge(
                  avatarUrl: thread.avatarUrl,
                  name: thread.title,
                  size: 42,
                  userType: 1,
                  customerTag: '客户',
                ),
                title: Text(
                  thread.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                subtitle: Text(
                  thread.lastMessagePreview?.isNotEmpty == true
                      ? thread.lastMessagePreview!
                      : '待分配客服',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withValues(alpha: 0.52),
                  ),
                ),
                trailing: TextButton(
                  onPressed: () => _showAssignCustomerSheet(
                    context,
                    ref,
                    thread,
                  ),
                  child: const Text('分配'),
                ),
                onTap: () {
                  final customerUserId = thread.customerUserId;
                  if (customerUserId == null || customerUserId.isEmpty) {
                    AppToast.missingApi(context, '客户详情');
                    return;
                  }
                  context.push(
                    '/profile/$customerUserId',
                    extra: {'adminCustomerView': true},
                  );
                },
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: Theme.of(context).dividerColor,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Future<void> _showAssignCustomerSheet(
    BuildContext context,
    WidgetRef ref,
    CsThread thread,
  ) async {
    final customerUserId = thread.customerUserId;
    if (customerUserId == null || customerUserId.isEmpty) {
      AppToast.missingApi(context, '客户详情');
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AdminAssignCustomerLoadingSheet(),
    );

    AdminCustomerDetail detail;
    try {
      detail = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .getCustomerDetail(customerUserId);
    } catch (_) {
      if (!context.mounted) return;
      Navigator.of(context).pop();
      AppToast.error(context, '加载可分配客服失败');
      return;
    }

    if (!context.mounted) return;
    Navigator.of(context).pop();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _AdminAssignCustomerSheet(
        customer: detail,
        onAssign: (staffUserId) async {
          Navigator.of(sheetContext).pop();
          await _assignCustomer(context, ref, customerUserId, staffUserId);
        },
      ),
    );
  }

  Future<void> _assignCustomer(
    BuildContext context,
    WidgetRef ref,
    String customerUserId,
    String? staffUserId,
  ) async {
    try {
      await ref
          .read(adminCustomerServiceRepositoryProvider)
          .assignCustomerService(
            customerUserId: customerUserId,
            staffUserId: staffUserId,
          );
      ref.invalidate(adminCustomersProvider);
      ref.invalidate(adminCustomerServiceDashboardProvider);
      ref.invalidate(
        adminCustomerServiceThreadsProvider(
          const AdminCustomerServiceThreadQuery(),
        ),
      );
      ref.invalidate(adminDirectCustomerThreadsProvider(false));
      ref.invalidate(adminDirectCustomerThreadsProvider(true));
      if (!context.mounted) return;
      AppToast.success(context, staffUserId == null ? '已按规则自动分配' : '已分配客服');
    } catch (_) {
      if (!context.mounted) return;
      AppToast.error(context, '分配客服失败');
    }
  }
}

class _AdminAssignCustomerLoadingSheet extends StatelessWidget {
  const _AdminAssignCustomerLoadingSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.symmetric(vertical: 28),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: _primary),
        ),
      ),
    );
  }
}

class _AdminAssignCustomerSheet extends StatelessWidget {
  final AdminCustomerDetail customer;
  final ValueChanged<String?> onAssign;

  const _AdminAssignCustomerSheet({
    required this.customer,
    required this.onAssign,
  });

  @override
  Widget build(BuildContext context) {
    final staffList = customer.customerService.assignableStaff;
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '分配客服',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close,
                      color: colorScheme.onSurface.withValues(alpha: 0.5),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            _AdminAssignCustomerRow(
              title: '按规则自动分配',
              subtitle: '由服务端选择合适客服',
              selected: customer.isUnassigned,
              onTap: () => onAssign(null),
            ),
            if (staffList.isEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
                child: Text(
                  '暂无可分配客服',
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.56),
                  ),
                ),
              )
            else
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  itemCount: staffList.length,
                  separatorBuilder: (_, __) => Divider(
                    height: 1,
                    indent: 18,
                    color:
                        Theme.of(context).dividerColor.withValues(alpha: 0.5),
                  ),
                  itemBuilder: (context, index) {
                    final staff = staffList[index];
                    return _AdminAssignCustomerRow(
                      title: staff.displayName,
                      subtitle: staff.lppId?.isNotEmpty == true
                          ? '绿泡泡号：${staff.lppId}'
                          : staff.loginName,
                      selected: customer.assignedStaffUserId == staff.userId,
                      onTap: () => onAssign(staff.userId),
                    );
                  },
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _AdminAssignCustomerRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _AdminAssignCustomerRow({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.56),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (selected) const Icon(Icons.check, color: _primary, size: 20),
          ],
        ),
      ),
    );
  }
}

class _WorkbenchEmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final double minHeight;

  const _WorkbenchEmptyState({
    required this.icon,
    required this.message,
    this.minHeight = 260,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      constraints: BoxConstraints(minHeight: minHeight),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 42,
            color: colorScheme.onSurface.withValues(alpha: 0.18),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.48),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminWorkbenchFeatureContent extends ConsumerWidget {
  final String featureKey;
  final _WorkbenchFeatureConfig config;

  const _AdminWorkbenchFeatureContent({
    required this.featureKey,
    required this.config,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    switch (featureKey) {
      case 'admin_service_center':
        return _AdminServiceCenterContent(config: config);
      case 'owner_service_efficiency':
        return ref.watch(adminCustomerServiceDashboardProvider).when(
              loading: () => const _AdminLoadingCard(),
              error: (error, _) => const _AdminDashboardContent.empty(),
              data: (data) => _AdminDashboardContent(data: data),
            );
      case 'owner_thread_management':
        return _AdminThreadManagementContent(config: config);
      case 'admin_staff_status':
        return ref.watch(adminCustomerServiceStaffStatusesProvider).when(
              loading: () => const _AdminLoadingCard(),
              error: (error, _) => const _AdminErrorCard(
                message: '客服状态接口暂不可用',
              ),
              data: (items) => _AdminStaffStatusList(
                items: items,
                emptyMessage: config.emptyText,
              ),
            );
      case 'owner_thread_audit':
        return _WorkbenchEmptyState(
          icon: config.icon,
          message: '会话审计接口待接入',
        );
      case 'owner_risk_threads':
      case 'admin_risk_threads':
        return _WorkbenchEmptyState(
          icon: config.icon,
          message: '风险会话接口待接入',
        );
      case 'admin_timeout_threads':
        return _WorkbenchEmptyState(
          icon: config.icon,
          message: '超时未响应接口待接入',
        );
      case 'admin_unassigned_customers':
      case 'owner_unassigned_customers':
        return _UnassignedCustomerQueue(config: config);
      case 'owner_operation_audit':
        return ref.watch(adminAuditLogsProvider).when(
              loading: () => const _AdminLoadingCard(),
              error: (error, _) => const _AdminErrorCard(
                message: '操作审计接口暂不可用',
              ),
              data: (items) => _AdminAuditLogList(
                items: items,
                emptyMessage: config.emptyText,
              ),
            );
      default:
        return _WorkbenchEmptyState(
          icon: config.icon,
          message: config.emptyText,
        );
    }
  }
}

class _AdminAuditLogList extends ConsumerWidget {
  final List<AdminAuditLog> items;
  final String emptyMessage;

  const _AdminAuditLogList({
    required this.items,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (items.isEmpty) {
      return _WorkbenchEmptyState(
        icon: Icons.fact_check_outlined,
        message: emptyMessage,
      );
    }
    final colorScheme = Theme.of(context).colorScheme;
    final tzOffset = ref.watch(timezoneOffsetProvider);
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final item = entry.value;
          final isLast = entry.key == items.length - 1;
          final title = item.actionName.isNotEmpty ? item.actionName : '操作记录';
          final target = item.targetDisplayName.isNotEmpty
              ? item.targetDisplayName
              : item.targetType;
          return Column(
            children: [
              ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.fact_check_outlined,
                    color: _primary,
                    size: 22,
                  ),
                ),
                title: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                subtitle: Text(
                  [
                    item.actorDisplayName,
                    if (target.isNotEmpty) target,
                    if (item.createdAt != null)
                      _formatShortTime(item.createdAt!, tzOffset),
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withValues(alpha: 0.52),
                  ),
                ),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: Theme.of(context).dividerColor,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

enum _AdminServiceCenterTab {
  customer,
  online,
  staff,
}

class _AdminServiceCenterContent extends ConsumerStatefulWidget {
  final _WorkbenchFeatureConfig config;

  const _AdminServiceCenterContent({required this.config});

  @override
  ConsumerState<_AdminServiceCenterContent> createState() =>
      _AdminServiceCenterContentState();
}

class _AdminServiceCenterContentState
    extends ConsumerState<_AdminServiceCenterContent> {
  _AdminServiceCenterTab _selectedTab = _AdminServiceCenterTab.customer;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AdminServiceCenterSummary(),
        const SizedBox(height: 12),
        _AdminServiceCenterTabBar(
          selectedTab: _selectedTab,
          onChanged: (tab) => setState(() => _selectedTab = tab),
        ),
        const SizedBox(height: 12),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: switch (_selectedTab) {
            _AdminServiceCenterTab.customer =>
              const _AdminCustomerConversationList(
                key: ValueKey('customer'),
              ),
            _AdminServiceCenterTab.online =>
              const _AdminOnlineServiceThreadList(
                key: ValueKey('online'),
              ),
            _AdminServiceCenterTab.staff =>
              const _AdminServiceCenterStaffStatusList(
                key: ValueKey('staff'),
              ),
          },
        ),
      ],
    );
  }
}

class _AdminServiceCenterSummary extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(adminCustomerServiceDashboardProvider).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _AdminServiceCenterSummaryCard.unavailable(),
          data: (data) => _AdminServiceCenterSummaryCard(data: data),
        );
  }
}

class _AdminServiceCenterSummaryCard extends StatelessWidget {
  final AdminCustomerServiceDashboard? data;

  const _AdminServiceCenterSummaryCard({required this.data});

  const _AdminServiceCenterSummaryCard.unavailable() : data = null;

  @override
  Widget build(BuildContext context) {
    final stats = data == null
        ? const [
            _WorkbenchStat('客户会话', '--'),
            _WorkbenchStat('在线客服', '--'),
            _WorkbenchStat('排队', '--'),
            _WorkbenchStat('接待人员', '--'),
          ]
        : [
            _WorkbenchStat(
                '客户会话', '${data!.activeDirectCount + data!.queuedDirectCount}'),
            _WorkbenchStat(
                '在线客服', '${data!.activeTempCount + data!.queuedTempCount}'),
            _WorkbenchStat('排队', '${data!.queuedTotalCount}'),
            _WorkbenchStat('接待人员', '${data!.onlineStaffCount}'),
          ];
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '客服中心概览',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          _WorkbenchStatsStrip(stats: stats),
        ],
      ),
    );
  }
}

class _AdminServiceCenterTabBar extends StatelessWidget {
  final _AdminServiceCenterTab selectedTab;
  final ValueChanged<_AdminServiceCenterTab> onChanged;

  const _AdminServiceCenterTabBar({
    required this.selectedTab,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    const options = [
      MapEntry(_AdminServiceCenterTab.customer, '客户会话'),
      MapEntry(_AdminServiceCenterTab.online, '在线客服'),
      MapEntry(_AdminServiceCenterTab.staff, '客服状态'),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: options.map((option) {
          final selected = option.key == selectedTab;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Material(
                color: selected ? colorScheme.surface : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => onChanged(option.key),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: selected
                            ? _primary.withValues(alpha: 0.35)
                            : Colors.transparent,
                      ),
                      boxShadow: selected
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Text(
                      option.value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: selected ? _primary : colorScheme.onSurface,
                        fontSize: 13,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _AdminServiceCenterStaffStatusList extends ConsumerWidget {
  const _AdminServiceCenterStaffStatusList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(adminCustomerServiceStaffStatusesProvider).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _AdminErrorCard(
            message: '客服状态接口暂不可用',
          ),
          data: (items) => _AdminStaffStatusList(
            items: items,
            emptyMessage: '暂无客服状态数据',
          ),
        );
  }
}

class _AdminCustomerConversationList extends ConsumerWidget {
  const _AdminCustomerConversationList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(adminDirectCustomerThreadsProvider(false)).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _AdminThreadList(
            items: [],
            emptyIcon: Icons.forum_outlined,
            emptyMessage: '暂无客户会话',
            showGovernanceActions: false,
            emptyMinHeight: 120,
          ),
          data: (items) => _AdminThreadList(
            items: items,
            emptyIcon: Icons.forum_outlined,
            emptyMessage: '暂无客户会话',
            showGovernanceActions: false,
            emptyMinHeight: 120,
          ),
        );
  }
}

class _AdminOnlineServiceThreadList extends ConsumerWidget {
  const _AdminOnlineServiceThreadList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = AdminCustomerServiceThreadQuery(threadType: 'temp_session');
    return ref.watch(adminCustomerServiceThreadsProvider(query)).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _AdminThreadList(
            items: [],
            emptyIcon: Icons.support_agent_outlined,
            emptyMessage: '暂无在线客服会话',
            refreshQuery: query,
            showGovernanceActions: false,
            emptyMinHeight: 120,
          ),
          data: (items) => _AdminThreadList(
            items: items,
            emptyIcon: Icons.support_agent_outlined,
            emptyMessage: '暂无在线客服会话',
            refreshQuery: query,
            showGovernanceActions: false,
            emptyMinHeight: 120,
          ),
        );
  }
}

class _AdminThreadManagementContent extends ConsumerStatefulWidget {
  final _WorkbenchFeatureConfig config;

  const _AdminThreadManagementContent({required this.config});

  @override
  ConsumerState<_AdminThreadManagementContent> createState() =>
      _AdminThreadManagementContentState();
}

class _AdminThreadManagementContentState
    extends ConsumerState<_AdminThreadManagementContent> {
  String? _selectedThreadType;

  @override
  Widget build(BuildContext context) {
    final query = AdminCustomerServiceThreadQuery(
      threadType: _selectedThreadType,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AdminOnlineServiceSummary(),
        const SizedBox(height: 12),
        _ThreadManagementTypeBar(
          selectedThreadType: _selectedThreadType,
          onChanged: (threadType) {
            setState(() => _selectedThreadType = threadType);
          },
        ),
        const SizedBox(height: 12),
        ref.watch(adminCustomerServiceThreadsProvider(query)).when(
              loading: () => const _AdminLoadingCard(),
              error: (error, _) => _AdminThreadList(
                items: const [],
                emptyIcon: widget.config.icon,
                emptyMessage: widget.config.emptyText,
                refreshQuery: query,
              ),
              data: (items) => _AdminThreadList(
                items: items,
                emptyIcon: widget.config.icon,
                emptyMessage: widget.config.emptyText,
                refreshQuery: query,
              ),
            ),
      ],
    );
  }
}

class _AdminOnlineServiceSummary extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref.watch(adminCustomerServiceDashboardProvider).when(
          loading: () => const _AdminLoadingCard(),
          error: (_, __) => const _OnlineServiceSummaryCard.unavailable(),
          data: (data) => _OnlineServiceSummaryCard(data: data),
        );
  }
}

class _OnlineServiceSummaryCard extends StatelessWidget {
  final AdminCustomerServiceDashboard? data;

  const _OnlineServiceSummaryCard({required this.data});

  const _OnlineServiceSummaryCard.unavailable() : data = null;

  @override
  Widget build(BuildContext context) {
    final stats = data == null
        ? const [
            _WorkbenchStat('当前会话', '--'),
            _WorkbenchStat('排队人数', '--'),
            _WorkbenchStat('在线客服', '--'),
            _WorkbenchStat('忙碌客服', '--'),
            _WorkbenchStat('空闲客服', '--'),
          ]
        : [
            _WorkbenchStat('当前会话', '${data!.activeTempCount}'),
            _WorkbenchStat('排队人数', '${data!.queuedTempCount}'),
            _WorkbenchStat('在线客服', '${data!.onlineStaffCount}'),
            _WorkbenchStat('忙碌客服', '${data!.busyStaffCount}'),
            _WorkbenchStat('空闲客服', '${data!.idleStaffCount}'),
          ];
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '在线客服概览',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          _WorkbenchStatsStrip(stats: stats),
        ],
      ),
    );
  }
}

class _ThreadManagementTypeBar extends StatelessWidget {
  final String? selectedThreadType;
  final ValueChanged<String?> onChanged;

  const _ThreadManagementTypeBar({
    required this.selectedThreadType,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const options = [
      _ScopeOption(null, '全部'),
      _ScopeOption('temp_session', '访客咨询'),
      _ScopeOption('direct_customer', '客户会话'),
    ];
    final colorScheme = Theme.of(context).colorScheme;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((option) {
        final selected = option.scope == selectedThreadType;
        return ChoiceChip(
          label: Text(option.label),
          selected: selected,
          onSelected: (_) => onChanged(option.scope),
          selectedColor: const Color(0xFFE8F8EF),
          labelStyle: TextStyle(
            color: selected ? _primary : colorScheme.onSurface,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
          side: BorderSide(
            color: selected ? _primary : Theme.of(context).dividerColor,
          ),
          backgroundColor: colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        );
      }).toList(),
    );
  }
}

String _formatShortTime(DateTime time, double tzOffset) {
  return formatMonthDayMinuteWithTimezone(time, tzOffset);
}

class _AdminDashboardContent extends StatefulWidget {
  final AdminCustomerServiceDashboard data;

  const _AdminDashboardContent({required this.data});

  const _AdminDashboardContent.empty()
      : data = const AdminCustomerServiceDashboard();

  @override
  State<_AdminDashboardContent> createState() => _AdminDashboardContentState();
}

class _AdminDashboardContentState extends State<_AdminDashboardContent> {
  String? _selectedScope;

  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ServiceEfficiencyScopeBar(
          selectedScope: _selectedScope,
          onChanged: (scope) => setState(() => _selectedScope = scope),
        ),
        const SizedBox(height: 12),
        _WorkbenchStatsStrip(
          stats: _primaryStats(data),
        ),
        const SizedBox(height: 12),
        _WorkbenchStatsStrip(
          stats: _secondaryStats(data),
        ),
      ],
    );
  }

  List<_WorkbenchStat> _primaryStats(AdminCustomerServiceDashboard data) {
    switch (_selectedScope) {
      case 'temp_session':
        return [
          _WorkbenchStat('访客排队', '${data.queuedTempCount}'),
          _WorkbenchStat('访客处理中', '${data.activeTempCount}'),
          _WorkbenchStat('在线客服', '${data.onlineStaffCount}'),
          _WorkbenchStat('忙碌客服', '${data.busyStaffCount}'),
        ];
      case 'direct_customer':
        return [
          _WorkbenchStat('客户会话待处理', '${data.queuedDirectCount}'),
          _WorkbenchStat('客户会话处理中', '${data.activeDirectCount}'),
          _WorkbenchStat('在线客服', '${data.onlineStaffCount}'),
          _WorkbenchStat('忙碌客服', '${data.busyStaffCount}'),
        ];
      default:
        return [
          _WorkbenchStat('排队总数', '${data.queuedTotalCount}'),
          _WorkbenchStat('服务中', '${data.totalActiveCount}'),
          _WorkbenchStat('在线客服', '${data.onlineStaffCount}'),
          _WorkbenchStat('忙碌客服', '${data.busyStaffCount}'),
        ];
    }
  }

  List<_WorkbenchStat> _secondaryStats(AdminCustomerServiceDashboard data) {
    switch (_selectedScope) {
      case 'temp_session':
        return [
          _WorkbenchStat('总排队占比',
              _formatRatio(data.queuedTempCount, data.queuedTotalCount)),
          _WorkbenchStat('总服务占比',
              _formatRatio(data.activeTempCount, data.totalActiveCount)),
          _WorkbenchStat('平均等待', _formatOptionalDuration(data.avgWaitSeconds)),
        ];
      case 'direct_customer':
        return [
          _WorkbenchStat('总排队占比',
              _formatRatio(data.queuedDirectCount, data.queuedTotalCount)),
          _WorkbenchStat('总服务占比',
              _formatRatio(data.activeDirectCount, data.totalActiveCount)),
          _WorkbenchStat('平均等待', _formatOptionalDuration(data.avgWaitSeconds)),
        ];
      default:
        return [
          _WorkbenchStat('在线客服排队', '${data.queuedTempCount}'),
          _WorkbenchStat('客户会话待处理', '${data.queuedDirectCount}'),
          _WorkbenchStat('在线客服处理中', '${data.activeTempCount}'),
          _WorkbenchStat('客户会话处理中', '${data.activeDirectCount}'),
        ];
    }
  }
}

class _ServiceEfficiencyScopeBar extends StatelessWidget {
  final String? selectedScope;
  final ValueChanged<String?> onChanged;

  const _ServiceEfficiencyScopeBar({
    required this.selectedScope,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const scopes = <_ScopeOption>[
      _ScopeOption(null, '全部'),
      _ScopeOption('temp_session', '在线客服'),
      _ScopeOption('direct_customer', '客户会话'),
    ];
    final colorScheme = Theme.of(context).colorScheme;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: scopes.map((option) {
        final selected = option.scope == selectedScope;
        return ChoiceChip(
          label: Text(option.label),
          selected: selected,
          onSelected: (_) => onChanged(option.scope),
          selectedColor: const Color(0xFFE8F8EF),
          labelStyle: TextStyle(
            color: selected ? _primary : colorScheme.onSurface,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
          side: BorderSide(
            color: selected ? _primary : Theme.of(context).dividerColor,
          ),
          backgroundColor: colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        );
      }).toList(),
    );
  }
}

String _formatRatio(int part, int total) {
  if (total <= 0) return '--';
  return '${(part / total * 100).round()}%';
}

String _formatOptionalDuration(int? seconds) {
  if (seconds == null) return '--';
  return _formatDuration(seconds);
}

class _AdminStaffStatusList extends StatelessWidget {
  final List<AdminStaffStatus> items;
  final String emptyMessage;

  const _AdminStaffStatusList({
    required this.items,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return _WorkbenchEmptyState(
        icon: Icons.radio_button_checked_outlined,
        message: emptyMessage,
      );
    }
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final item = entry.value;
          final isLast = entry.key == items.length - 1;
          return Column(
            children: [
              ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: PersonAvatarWithBadge(
                  avatarUrl: null,
                  name: item.displayName,
                  size: 42,
                ),
                title: Text(
                  item.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                subtitle: Text(
                  '服务中 ${item.activeSessionCount}/${item.maxConcurrentSessions} · '
                  '${item.queueAcceptEnabled ? '自动分配' : '手动接入'}',
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withValues(alpha: 0.52),
                  ),
                ),
                trailing: _AdminStatusPill(label: item.label),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: Theme.of(context).dividerColor,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _AdminThreadList extends ConsumerWidget {
  final List<CsThread> items;
  final IconData emptyIcon;
  final String emptyMessage;
  final AdminCustomerServiceThreadQuery refreshQuery;
  final bool showGovernanceActions;
  final double emptyMinHeight;

  const _AdminThreadList({
    required this.items,
    required this.emptyIcon,
    required this.emptyMessage,
    this.refreshQuery = const AdminCustomerServiceThreadQuery(),
    this.showGovernanceActions = true,
    this.emptyMinHeight = 260,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (items.isEmpty) {
      return _WorkbenchEmptyState(
        icon: emptyIcon,
        message: emptyMessage,
        minHeight: emptyMinHeight,
      );
    }
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final thread = entry.value;
          final isLast = entry.key == items.length - 1;
          return Column(
            children: [
              Material(
                type: MaterialType.transparency,
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  leading: PersonAvatarWithBadge(
                    avatarUrl: thread.avatarUrl,
                    name: thread.title,
                    size: 42,
                    userType: thread.isTempSession ? 1 : null,
                  ),
                  title: Text(
                    thread.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  subtitle: Text(
                    thread.lastMessagePreview?.isNotEmpty == true
                        ? thread.lastMessagePreview!
                        : '暂无消息',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurface.withValues(alpha: 0.52),
                    ),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (showGovernanceActions)
                        PopupMenuButton<bool>(
                          tooltip: '会话治理',
                          onSelected: (frozen) =>
                              _freezeThread(context, ref, thread, frozen),
                          itemBuilder: (context) => const [
                            PopupMenuItem(
                              value: true,
                              child: Text('冻结会话'),
                            ),
                            PopupMenuItem(
                              value: false,
                              child: Text('解冻会话'),
                            ),
                          ],
                        ),
                      Icon(
                        Icons.chevron_right,
                        size: 20,
                        color: colorScheme.onSurface.withValues(alpha: 0.26),
                      ),
                    ],
                  ),
                  onTap: () {
                    if (thread.conversationId.isEmpty) {
                      AppToast.missingApi(context, '会话详情');
                      return;
                    }
                    context.push(
                      '/chat/${thread.conversationId}',
                      extra: {
                        'isGroup': false,
                        'title': thread.title,
                        'avatarUrl': thread.avatarUrl,
                        'customerServiceReadOnly': true,
                        'customerServiceSource': thread.source,
                      },
                    );
                  },
                ),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 74,
                  color: Theme.of(context).dividerColor,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Future<void> _freezeThread(
    BuildContext context,
    WidgetRef ref,
    CsThread thread,
    bool frozen,
  ) async {
    if (thread.threadId.isEmpty || thread.conversationId.isEmpty) {
      AppToast.missingApi(context, '会话 ID');
      return;
    }
    final reason = await _showFreezeReasonDialog(context, frozen: frozen);
    if (reason == null) return;
    try {
      await ref.read(adminCustomerServiceRepositoryProvider).freezeConversation(
            conversationId: thread.conversationId,
            frozen: frozen,
            reason: reason,
            threadType: thread.serverThreadType,
            threadId: thread.threadId,
          );
      ref.invalidate(adminCustomerServiceThreadsProvider(refreshQuery));
      if (context.mounted) {
        AppToast.success(context, frozen ? '已冻结会话' : '已解冻会话');
      }
    } catch (_) {
      if (context.mounted) AppToast.error(context, '操作失败，请重试');
    }
  }
}

class _AdminStatusPill extends StatelessWidget {
  final String label;

  const _AdminStatusPill({required this.label});

  @override
  Widget build(BuildContext context) {
    final color = switch (label) {
      '在线' => _primary,
      '忙碌' => const Color(0xFFFF9500),
      _ => Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.38),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
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

class _AdminLoadingCard extends StatelessWidget {
  const _AdminLoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }
}

class _AdminErrorCard extends StatelessWidget {
  final String message;

  const _AdminErrorCard({required this.message});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            size: 20,
            color: colorScheme.onSurface.withValues(alpha: 0.42),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.58),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatDuration(int seconds) {
  if (seconds <= 0) return '0秒';
  if (seconds < 60) return '$seconds秒';
  return '${seconds ~/ 60}分';
}

class _WorkbenchActionTile extends StatelessWidget {
  final _WorkbenchAction action;
  final VoidCallback onTap;

  const _WorkbenchActionTile({
    required this.action,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: _primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(action.icon, color: _primary, size: 21),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      action.title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurface.withValues(alpha: 0.28),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Customer Service Tab — 客服日常服务任务
// ---------------------------------------------------------------------------

class _CustomerServiceTasksTab extends StatelessWidget {
  const _CustomerServiceTasksTab();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _WorkbenchAction(
        icon: Icons.campaign_outlined,
        title: '企业公告',
        onTap: () => context.push('/notices'),
      ),
      _WorkbenchAction(
        icon: Icons.quickreply_outlined,
        title: '常用话术',
        onTap: () => context.push('/customer-service/quick-replies'),
      ),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        ...actions.map(
          (action) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _WorkbenchActionTile(
              action: action,
              onTap: action.onTap ??
                  () => AppToast.missingApi(context, action.title),
            ),
          ),
        ),
      ],
    );
  }
}

class CustomerServiceQuickRepliesPage extends ConsumerStatefulWidget {
  const CustomerServiceQuickRepliesPage({super.key});

  @override
  ConsumerState<CustomerServiceQuickRepliesPage> createState() =>
      _CustomerServiceQuickRepliesPageState();
}

class _CustomerServiceQuickRepliesPageState
    extends ConsumerState<CustomerServiceQuickRepliesPage> {
  final _searchController = TextEditingController();
  final _searchDebouncer = Debouncer();
  String? _scope;
  String _query = '';

  @override
  void dispose() {
    _searchDebouncer.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final repliesAsync = ref.watch(customerServiceQuickRepliesProvider(_scope));
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            size: 20,
            color: colorScheme.onSurface,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          '常用话术',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        color: _primary,
        onRefresh: () => ref
            .read(customerServiceQuickRepliesProvider(_scope).notifier)
            .refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text(
              '回复模板',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            _QuickReplyScopeBar(
              selectedScope: _scope,
              onChanged: (scope) => setState(() => _scope = scope),
            ),
            const SizedBox(height: 10),
            _QuickReplySearchField(
              controller: _searchController,
              query: _query,
              onChanged: _onSearchChanged,
              onClear: () => setState(() {
                _searchDebouncer.cancel();
                _searchController.clear();
                _query = '';
              }),
            ),
            const SizedBox(height: 10),
            ...repliesAsync.when(
              loading: () => [
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(
                    child: CircularProgressIndicator(color: _primary),
                  ),
                ),
              ],
              error: (e, __) => [
                const _TaskSectionMessage(
                  icon: Icons.cloud_off_outlined,
                  title: '话术加载失败',
                  subtitle: '请下拉刷新重试',
                ),
              ],
              data: (replies) {
                final filtered = _filterQuickReplies(replies, _query);
                if (replies.isEmpty) {
                  return [
                    const _TaskSectionMessage(
                      icon: Icons.quickreply_outlined,
                      title: '暂无快捷回复',
                      subtitle: '服务端话术库启用后会显示在这里',
                    ),
                  ];
                }
                if (filtered.isEmpty) {
                  return [
                    const _TaskSectionMessage(
                      icon: Icons.search_off_outlined,
                      title: '没有匹配的话术',
                      subtitle: '换个关键词试试',
                    ),
                  ];
                }
                return filtered
                    .map(
                      (reply) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _QuickReplyCard(reply: reply),
                      ),
                    )
                    .toList();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickReplyScopeBar extends StatelessWidget {
  final String? selectedScope;
  final ValueChanged<String?> onChanged;

  const _QuickReplyScopeBar({
    required this.selectedScope,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const scopes = <_ScopeOption>[
      _ScopeOption(null, '全部'),
      _ScopeOption('temp_session', '在线客服'),
      _ScopeOption('direct_customer', '聊天'),
    ];
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(vertical: 8),
      alignment: Alignment.centerLeft,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: scopes.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final option = scopes[i];
          final selected = option.scope == selectedScope;
          return ChoiceChip(
            label: Text(option.label),
            selected: selected,
            onSelected: (_) => onChanged(option.scope),
            selectedColor: const Color(0xFFE8F8EF),
            labelStyle: TextStyle(
              color:
                  selected ? _primary : Theme.of(context).colorScheme.onSurface,
              fontSize: 13,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            ),
            side: BorderSide(
              color: selected ? _primary : Theme.of(context).dividerColor,
            ),
            backgroundColor: Theme.of(context).colorScheme.surface,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          );
        },
      ),
    );
  }
}

class _QuickReplySearchField extends StatelessWidget {
  final TextEditingController controller;
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _QuickReplySearchField({
    required this.controller,
    required this.query,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: '搜索话术',
        prefixIcon: Icon(
          Icons.search,
          color: colorScheme.onSurface.withValues(alpha: 0.42),
        ),
        suffixIcon: query.trim().isEmpty
            ? null
            : IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: onClear,
                icon: Icon(
                  Icons.cancel,
                  size: 18,
                  color: colorScheme.onSurface.withValues(alpha: 0.38),
                ),
              ),
        filled: true,
        fillColor: colorScheme.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

List<CsQuickReply> _filterQuickReplies(
  List<CsQuickReply> replies,
  String query,
) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return replies;
  return replies.where((reply) {
    final searchable = [
      reply.title,
      reply.content,
      reply.category,
      reply.scopeLabel,
      ...reply.tags,
    ].join(' ').toLowerCase();
    return searchable.contains(q);
  }).toList(growable: false);
}

class _TaskSectionMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _TaskSectionMessage({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 26),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 32,
            color: colorScheme.onSurface.withValues(alpha: 0.28),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurface.withValues(alpha: 0.48),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScopeOption {
  final String? scope;
  final String label;
  const _ScopeOption(this.scope, this.label);
}

class _QuickReplyCard extends StatelessWidget {
  final CsQuickReply reply;

  const _QuickReplyCard({required this.reply});

  @override
  Widget build(BuildContext context) {
    final muted =
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => _copy(context),
      child: Ink(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    reply.title.isNotEmpty ? reply.title : '未命名话术',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                _MiniLabel(text: reply.scopeLabel),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              reply.content,
              style: TextStyle(
                fontSize: 14,
                height: 1.35,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(
                  reply.category,
                  style: TextStyle(fontSize: 12, color: muted),
                ),
                if (reply.tags.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      reply.tags.map((tag) => '#$tag').join(' '),
                      style: TextStyle(fontSize: 12, color: muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                Icon(Icons.copy_rounded, size: 16, color: muted),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: reply.content));
    if (context.mounted) {
      AppToast.success(context, '已复制快捷回复');
    }
  }
}

class _MiniLabel extends StatelessWidget {
  final String text;
  const _MiniLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F8EF),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          color: _primary,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Broadcast Page — 客服群发消息
// ---------------------------------------------------------------------------

class CustomerServiceBroadcastPage extends ConsumerStatefulWidget {
  const CustomerServiceBroadcastPage({super.key});

  @override
  ConsumerState<CustomerServiceBroadcastPage> createState() =>
      _CustomerServiceBroadcastPageState();
}

class _CustomerServiceBroadcastPageState
    extends ConsumerState<CustomerServiceBroadcastPage> {
  final _messageController = TextEditingController();
  final _searchController = TextEditingController();
  final _searchDebouncer = Debouncer();

  _BroadcastTargetMode _mode = _BroadcastTargetMode.allTenantMembers;
  String _query = '';
  String? _selectedGroupId;
  CsBroadcastPreview? _preview;
  CsBroadcastTask? _task;
  Timer? _pollTimer;
  bool _sending = false;
  bool _previewing = false;
  bool _retrying = false;

  @override
  void dispose() {
    _pollTimer?.cancel();
    _searchDebouncer.cancel();
    _messageController.dispose();
    _searchController.dispose();
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
    if (!AppPermissions.canUseCustomerWorkbench(space)) {
      return Scaffold(
        appBar: _broadcastAppBar(context),
        body: const _BroadcastStateView(
          icon: Icons.lock_outline,
          title: '当前角色不能使用群发',
          subtitle: '群发消息仅对客服角色开放。',
        ),
      );
    }

    final spaceId = space?.spaceId ?? 'personal';
    final conversationsAsync = ref.watch(conversationsProvider(spaceId));
    return Scaffold(
      appBar: _broadcastAppBar(context),
      body: _buildBroadcastBody(conversationsAsync, spaceId),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: _primary,
              minimumSize: const Size.fromHeight(46),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: _sending || _previewing
                ? null
                : () => _previewAndSubmit(space, spaceId),
            child: Text(
              _sending
                  ? '任务提交中...'
                  : _previewing
                      ? '正在预览...'
                      : '预览并提交',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _broadcastAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Theme.of(context).colorScheme.surface,
      elevation: 0,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back_ios,
          size: 20,
          color: Theme.of(context).colorScheme.onSurface,
        ),
        onPressed: () => context.pop(),
      ),
      title: Text(
        '群发消息',
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurface,
        ),
      ),
      centerTitle: true,
    );
  }

  Widget _buildBroadcastBody(
    AsyncValue<List<Conversation>> conversationsAsync,
    String spaceId,
  ) {
    final conversations = conversationsAsync.valueOrNull;
    if (conversations == null && conversationsAsync.hasError) {
      return _BroadcastStateView(
        icon: Icons.cloud_off_outlined,
        title: '群聊列表加载失败',
        subtitle: '请稍后重试，或检查当前空间会话列表是否正常。',
        actionLabel: '重试',
        onAction: () => ref.invalidate(conversationsProvider(spaceId)),
      );
    }
    if (conversations == null) {
      return const Center(child: CircularProgressIndicator(color: _primary));
    }

    final groups = _filterGroups(conversations);
    final visibleGroups = _filterGroupsByQuery(groups);
    final needsGroup = _mode.needsGroup;

    return Column(
      children: [
        _BroadcastComposer(
          controller: _messageController,
          searchController: _searchController,
          mode: _mode,
          sending: _sending,
          previewing: _previewing,
          onSearchChanged: _onSearchChanged,
          onModeChanged: _sending || _previewing
              ? null
              : (mode) => setState(() {
                    _mode = mode;
                    _selectedGroupId = null;
                    _preview = null;
                    _task = null;
                    _pollTimer?.cancel();
                  }),
          onClearSelected: _selectedGroupId == null || _sending || _previewing
              ? null
              : () => setState(() {
                    _selectedGroupId = null;
                    _preview = null;
                    _task = null;
                  }),
        ),
        if (_preview != null || _task != null)
          _BroadcastTaskSummary(
            preview: _preview,
            task: _task,
            retrying: _retrying,
            onRetryFailed: _canRetryFailed(_task)
                ? () => _retryFailedRecipients(spaceId)
                : null,
          ),
        Expanded(
          child: needsGroup
              ? _buildGroupTargetList(groups, visibleGroups)
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                  children: const [
                    _BroadcastSectionHeader(
                      icon: Icons.apartment_outlined,
                      title: '目标范围',
                      count: 1,
                    ),
                    SizedBox(height: 6),
                    _BroadcastScopeTile(
                      title: '全租户成员',
                      subtitle: '将逐人私聊发送给当前企业内可投递成员',
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildGroupTargetList(
    List<Conversation> groups,
    List<Conversation> visibleGroups,
  ) {
    if (visibleGroups.isEmpty) {
      return _BroadcastStateView(
        icon: Icons.campaign_outlined,
        title: groups.isEmpty ? '暂无可选择群聊' : '没有匹配群聊',
        subtitle: groups.isEmpty ? '群成员私聊和群内群发只支持当前账号已加入的群。' : '换个关键词再试试。',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      children: [
        _BroadcastSectionHeader(
          icon: Icons.groups_outlined,
          title: '选择群聊',
          count: visibleGroups.length,
        ),
        const SizedBox(height: 6),
        ...visibleGroups.map((group) {
          return _BroadcastGroupTile(
            group: group,
            selected: _selectedGroupId == group.conversationId,
            enabled: !_sending && !_previewing,
            onChanged: (selected) {
              setState(() {
                _selectedGroupId = selected ? group.conversationId : null;
                _preview = null;
                _task = null;
                _pollTimer?.cancel();
              });
            },
          );
        }),
      ],
    );
  }

  List<Conversation> _filterGroups(List<Conversation> conversations) {
    return conversations
        .where((item) => item.type == ConversationType.group)
        .toList()
      ..sort((a, b) => a.title.compareTo(b.title));
  }

  List<Conversation> _filterGroupsByQuery(List<Conversation> groups) {
    if (_query.isEmpty) return groups;
    final lower = _query.toLowerCase();
    return groups
        .where((item) => item.title.toLowerCase().contains(lower))
        .toList();
  }

  Future<void> _previewAndSubmit(SpaceContext? space, String spaceId) async {
    final text = _messageController.text.trim();
    if (text.isEmpty) {
      AppToast.info(context, '请输入群发内容');
      return;
    }
    if (_mode.needsGroup && (_selectedGroupId?.isEmpty ?? true)) {
      AppToast.info(context, '请选择群聊');
      return;
    }
    if (space == null) {
      AppToast.error(context, '登录状态已失效，请重新登录');
      return;
    }

    final repo = ref.read(adminCustomerServiceRepositoryProvider);
    setState(() {
      _previewing = true;
      _preview = null;
      _task = null;
    });
    try {
      final preview = await repo.previewBroadcast(
        targetType: _mode.targetType,
        groupId: _mode.needsGroup ? _selectedGroupId : null,
      );
      if (!mounted) return;
      setState(() {
        _preview = preview;
        _previewing = false;
      });

      final confirmed = await _confirmBroadcast(preview: preview);
      if (!confirmed || !mounted) return;

      setState(() => _sending = true);
      final task = await repo.createBroadcast(
        targetType: _mode.targetType,
        groupId: _mode.needsGroup ? _selectedGroupId : null,
        messageType: 'text',
        body: {'text': text},
      );
      if (!mounted) return;
      setState(() {
        _task = task;
        _sending = false;
      });
      _messageController.clear();
      AppToast.success(context, '群发任务已提交，目标 ${task.totalCount} 人');
      _startTaskPolling(task.taskId, spaceId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _previewing = false;
        _sending = false;
      });
      AppToast.error(context, _friendlyError(e));
    }
  }

  void _startTaskPolling(String taskId, String spaceId) {
    _pollTimer?.cancel();
    if (taskId.isEmpty) return;
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      try {
        final task = await ref
            .read(adminCustomerServiceRepositoryProvider)
            .getBroadcastTask(taskId);
        if (!mounted) {
          timer.cancel();
          return;
        }
        setState(() => _task = task);
        if (task.isFinished) {
          timer.cancel();
          ref.invalidate(conversationsProvider(spaceId));
        }
      } catch (_) {
        timer.cancel();
      }
    });
  }

  bool _canRetryFailed(CsBroadcastTask? task) {
    if (task == null || task.failedCount == 0 || _retrying) return false;
    return _mode != _BroadcastTargetMode.groupMessage;
  }

  Future<void> _retryFailedRecipients(String spaceId) async {
    final taskId = _task?.taskId;
    if (taskId == null || taskId.isEmpty) return;
    setState(() => _retrying = true);
    try {
      final retry = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .retryBroadcastFailed(taskId);
      final task = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .getBroadcastTask(taskId);
      if (!mounted) return;
      setState(() {
        _retrying = false;
        _task = task;
      });
      AppToast.success(context, '已重新排队 ${retry.requeuedCount} 个失败收件人');
      _startTaskPolling(taskId, spaceId);
    } catch (e) {
      if (!mounted) return;
      setState(() => _retrying = false);
      AppToast.error(context, _friendlyError(e));
    }
  }

  Future<bool> _confirmBroadcast({required CsBroadcastPreview preview}) async {
    final sample = preview.sampleDisplayNames.take(3).join('、');
    return await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('确认群发'),
            content: Text(
              [
                '方式：${_mode.label}',
                if (preview.groupTitle?.isNotEmpty == true)
                  '群聊：${preview.groupTitle}',
                '预计影响：${preview.recipientCount} 人',
                if (sample.isNotEmpty) '样本：$sample',
                '',
                '群发会以当前客服本人身份发出，提交后进入服务端异步投递，已发出的消息不可撤回。',
              ].join('\n'),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('取消'),
              ),
              TextButton(
                onPressed: preview.recipientCount <= 0
                    ? null
                    : () => Navigator.pop(dialogContext, true),
                child: const Text('提交任务'),
              ),
            ],
          ),
        ) ??
        false;
  }

  String _friendlyError(Object error) {
    return broadcastFriendlyError(error);
  }
}

enum _BroadcastTargetMode {
  allTenantMembers(1, '全租户成员', '逐人私聊发送给企业成员'),
  groupMembersPrivate(2, '群成员私聊', '把某个群成员展开后逐人私聊'),
  groupMessage(3, '群内群发', '直接在某个群聊里发送一条消息');

  final int targetType;
  final String label;
  final String description;

  const _BroadcastTargetMode(
    this.targetType,
    this.label,
    this.description,
  );

  bool get needsGroup => this != _BroadcastTargetMode.allTenantMembers;
}

class _BroadcastComposer extends StatelessWidget {
  final TextEditingController controller;
  final TextEditingController searchController;
  final _BroadcastTargetMode mode;
  final bool sending;
  final bool previewing;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<_BroadcastTargetMode>? onModeChanged;
  final VoidCallback? onClearSelected;

  const _BroadcastComposer({
    required this.controller,
    required this.searchController,
    required this.mode,
    required this.sending,
    required this.previewing,
    required this.onSearchChanged,
    required this.onModeChanged,
    required this.onClearSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.campaign_outlined, color: _primary, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '客户和群聊群发',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              Text(
                mode.label,
                style: TextStyle(
                  fontSize: 13,
                  color: colorScheme.onSurface.withValues(alpha: 0.54),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SegmentedButton<_BroadcastTargetMode>(
            segments: _BroadcastTargetMode.values
                .map(
                  (item) => ButtonSegment<_BroadcastTargetMode>(
                    value: item,
                    label: Text(item.label),
                  ),
                )
                .toList(growable: false),
            selected: {mode},
            onSelectionChanged: onModeChanged == null
                ? null
                : (selected) => onModeChanged!(selected.first),
          ),
          const SizedBox(height: 6),
          Text(
            mode.description,
            style: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurface.withValues(alpha: 0.54),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            enabled: !sending && !previewing,
            minLines: 3,
            maxLines: 5,
            maxLength: 500,
            style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
            decoration: InputDecoration(
              hintText: '请输入群发文本内容',
              hintStyle: TextStyle(
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
              filled: true,
              fillColor: Theme.of(context).scaffoldBackgroundColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Theme.of(context).dividerColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Theme.of(context).dividerColor),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: _primary),
              ),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: searchController,
            enabled: !sending && !previewing && mode.needsGroup,
            onChanged: onSearchChanged,
            style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
            decoration: InputDecoration(
              hintText: mode.needsGroup ? '搜索群聊' : '全租户成员不需要选择群聊',
              prefixIcon: Icon(
                Icons.search_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
              filled: true,
              fillColor: Theme.of(context).scaffoldBackgroundColor,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: onClearSelected,
                child: const Text('清空群聊'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BroadcastScopeTile extends StatelessWidget {
  final String title;
  final String subtitle;

  const _BroadcastScopeTile({
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.radio_button_checked, color: _primary, size: 24),
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.apartment_rounded,
                color: _primary,
                size: 23,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BroadcastTaskSummary extends StatelessWidget {
  final CsBroadcastPreview? preview;
  final CsBroadcastTask? task;
  final bool retrying;
  final VoidCallback? onRetryFailed;

  const _BroadcastTaskSummary({
    required this.preview,
    required this.task,
    required this.retrying,
    required this.onRetryFailed,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final currentTask = task;
    final currentPreview = preview;
    final title =
        currentTask == null ? '预览结果' : '任务 ${currentTask.statusLabel}';
    final subtitle = currentTask == null
        ? '预计影响 ${currentPreview?.recipientCount ?? 0} 人'
        : '已投递 ${currentTask.sentCount}/${currentTask.totalCount}，失败 ${currentTask.failedCount}，跳过 ${currentTask.skippedCount}';
    final progress = currentTask == null || currentTask.totalCount <= 0
        ? null
        : (currentTask.sentCount +
                currentTask.failedCount +
                currentTask.skippedCount) /
            currentTask.totalCount;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.task_alt_rounded, color: _primary, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              if (onRetryFailed != null)
                TextButton(
                  onPressed: retrying ? null : onRetryFailed,
                  child: Text(retrying ? '重试中' : '重试失败项'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurface.withValues(alpha: 0.58),
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: progress.clamp(0, 1),
              color: _primary,
              backgroundColor: _primary.withValues(alpha: 0.12),
            ),
          ],
          if (currentTask?.failureReason?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Text(
              currentTask!.failureReason!,
              style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444)),
            ),
          ],
          if (currentTask?.failedRecipients.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Text(
              currentTask!.failedRecipients
                  .take(3)
                  .map((item) =>
                      '${item.displayName}${item.errorCode == null ? '' : '(${item.errorCode})'}')
                  .join('、'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurface.withValues(alpha: 0.58),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BroadcastSectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final int count;

  const _BroadcastSectionHeader({
    required this.icon,
    required this.title,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 2),
      child: Row(
        children: [
          Icon(
            icon,
            size: 17,
            color: colorScheme.onSurface.withValues(alpha: 0.55),
          ),
          const SizedBox(width: 6),
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$count',
            style: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
            ),
          ),
        ],
      ),
    );
  }
}

class _BroadcastGroupTile extends StatelessWidget {
  final Conversation group;
  final bool selected;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  const _BroadcastGroupTile({
    required this.group,
    required this.selected,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final memberText = group.memberCount == null || group.memberCount == 0
        ? '群聊'
        : '${group.memberCount} 人';
    return Material(
      color: colorScheme.surface,
      child: InkWell(
        onTap: enabled ? () => onChanged(!selected) : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Checkbox(
                value: selected,
                onChanged:
                    enabled ? (value) => onChanged(value ?? false) : null,
                activeColor: _primary,
              ),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.groups_rounded,
                  color: _primary,
                  size: 23,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      group.title.isNotEmpty ? group.title : '未命名群聊',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      memberText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BroadcastStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _BroadcastStateView({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 54,
              color: colorScheme.onSurface.withValues(alpha: 0.28),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: colorScheme.onSurface.withValues(alpha: 0.56),
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 14),
              TextButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Online Service Tab — 在线客服工作台
// ---------------------------------------------------------------------------

class _OnlineServiceTab extends ConsumerStatefulWidget {
  const _OnlineServiceTab();

  @override
  ConsumerState<_OnlineServiceTab> createState() => _OnlineServiceTabState();
}

enum _OnlineThreadFilter { all, queued, active, vip }

enum _OnlineThreadMode { current, history }

class _OnlineServiceTabState extends ConsumerState<_OnlineServiceTab> {
  final _searchController = TextEditingController();
  final _searchDebouncer = Debouncer();
  Timer? _refreshTimer;
  String _query = '';
  _OnlineThreadMode _selectedMode = _OnlineThreadMode.current;
  _OnlineThreadFilter _selectedFilter = _OnlineThreadFilter.all;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!mounted) return;
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceStaffHistoryProvider);
      ref.invalidate(customerServiceDashboardProvider);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchDebouncer.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final threadsAsync = ref.watch(customerServiceThreadsProvider);
    final historyAsync = ref.watch(customerServiceStaffHistoryProvider);
    final staffHistoryThreads = historyAsync.valueOrNull ?? const <CsThread>[];
    return threadsAsync.when(
      loading: () => _buildContent(
        context,
        ref,
        const CsThreadsData([], []),
        staffHistoryThreads: staffHistoryThreads,
      ),
      error: (e, __) => _buildContent(
        context,
        ref,
        const CsThreadsData([], []),
        staffHistoryThreads: staffHistoryThreads,
      ),
      data: (data) => _buildContent(
        context,
        ref,
        data,
        staffHistoryThreads: staffHistoryThreads,
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    CsThreadsData data, {
    List<CsThread> staffHistoryThreads = const [],
    Widget? notice,
  }) {
    final onlineData = data.tempSessionOnly;
    final allTempThreads = <CsThread>[
      ...onlineData.queueItems,
      ...onlineData.activeItems,
    ];
    final currentThreads = allTempThreads
        .where((thread) => !thread.isTerminal)
        .toList(growable: false);
    final historyThreads = staffHistoryThreads;
    final sourceThreads = _selectedMode == _OnlineThreadMode.history
        ? historyThreads
        : currentThreads;
    final counts = _OnlineThreadFilterCounts.fromThreads(currentThreads);
    final visibleThreads = sourceThreads
        .where(_matchesSearch)
        .where((thread) => _selectedMode == _OnlineThreadMode.history
            ? true
            : _matchesThreadFilter(thread, _selectedFilter))
        .toList(growable: false);

    return RefreshIndicator(
      color: _primary,
      onRefresh: () async {
        ref.invalidate(customerServiceThreadsProvider);
        ref.invalidate(customerServiceStaffHistoryProvider);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              16,
              12,
              16,
              visibleThreads.isEmpty ? 24 : 0,
            ),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const _ReceptionStatusCard(),
                if (notice != null) ...[
                  const SizedBox(height: 12),
                  notice,
                ],
                const SizedBox(height: 12),
                _OnlineServiceSearchBar(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                ),
                const SizedBox(height: 12),
                _OnlineThreadModeBar(
                  selected: _selectedMode,
                  currentCount: currentThreads.length,
                  historyCount: historyThreads.length,
                  onSelected: (mode) {
                    if (mode == _selectedMode) return;
                    setState(() => _selectedMode = mode);
                  },
                ),
                const SizedBox(height: 12),
                if (_selectedMode == _OnlineThreadMode.current) ...[
                  _OnlineThreadFilterBar(
                    selected: _selectedFilter,
                    counts: counts,
                    onSelected: (filter) {
                      if (filter == _selectedFilter) return;
                      setState(() => _selectedFilter = filter);
                    },
                  ),
                  const SizedBox(height: 12),
                ],
                if (visibleThreads.isEmpty)
                  _OnlineThreadEmptyState(message: _emptyTextForFilter()),
              ]),
            ),
          ),
          if (visibleThreads.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverList.builder(
                itemCount: visibleThreads.length,
                itemBuilder: (context, index) {
                  final thread = visibleThreads[index];
                  final secondaryLabel = _secondaryLabelFor(thread);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _ThreadCard(
                      thread: thread,
                      primaryLabel: _primaryLabelFor(thread),
                      onPrimary: () => _runPrimaryAction(context, ref, thread),
                      secondaryLabel: secondaryLabel,
                      onSecondary: secondaryLabel == null
                          ? null
                          : () => _closeThread(context, ref, thread),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  bool _matchesSearch(CsThread item) {
    if (_query.isEmpty) return true;
    return item.title.contains(_query) ||
        (item.lastMessagePreview?.contains(_query) ?? false) ||
        (item.assignedStaffDisplayName?.contains(_query) ?? false);
  }

  bool _matchesThreadFilter(
    CsThread thread,
    _OnlineThreadFilter filter,
  ) {
    switch (filter) {
      case _OnlineThreadFilter.all:
        return true;
      case _OnlineThreadFilter.queued:
        return thread.isQueued && !thread.isTerminal;
      case _OnlineThreadFilter.active:
        return !thread.isQueued && !thread.isTerminal;
      case _OnlineThreadFilter.vip:
        return thread.isVip;
    }
  }

  String _emptyTextForFilter() {
    if (_query.isNotEmpty) return '没有匹配的会话';
    if (_selectedMode == _OnlineThreadMode.history) {
      return '暂无历史会话';
    }
    switch (_selectedFilter) {
      case _OnlineThreadFilter.all:
        return '暂无会话';
      case _OnlineThreadFilter.queued:
        return '暂无排队会话';
      case _OnlineThreadFilter.active:
        return '暂无进行中的会话';
      case _OnlineThreadFilter.vip:
        return '暂无 VIP 会话';
    }
  }

  String _primaryLabelFor(CsThread thread) {
    if (thread.isTerminal) return '查看';
    if (thread.isQueued) return '接入';
    if (thread.isAiHandled) return '人工接管';
    return '继续沟通';
  }

  String? _secondaryLabelFor(CsThread thread) {
    if (thread.isTerminal) return null;
    if (thread.isQueued) return null;
    return '关闭';
  }

  void _runPrimaryAction(
    BuildContext context,
    WidgetRef ref,
    CsThread thread,
  ) {
    if (thread.isTerminal) {
      _openThread(context, thread);
      return;
    }
    if (thread.isQueued) {
      _claimThread(context, ref, thread);
    } else if (thread.isAiHandled) {
      _takeoverThread(context, ref, thread);
    } else {
      _openThread(context, thread);
    }
  }

  void _openThread(BuildContext context, CsThread thread) {
    context.push(
      '/chat/${thread.conversationId}',
      extra: {
        'isGroup': false,
        'title': thread.title,
        'avatarUrl': thread.avatarUrl,
        'customerServiceThreadType': thread.threadType,
        'customerServiceThreadId': thread.threadId,
        'customerServiceCustomerUserId': thread.customerUserId,
        'customerServiceVisitorId': thread.visitorId,
        'customerServiceSource': thread.source,
        'customerServiceReadOnly': thread.isTerminal,
      },
    );
  }

  Future<void> _claimThread(
      BuildContext context, WidgetRef ref, CsThread thread) async {
    try {
      final detail =
          await ref.read(customerServiceRepositoryProvider).claimThread(thread);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
      if (context.mounted) {
        AppToast.success(context, '已认领会话');
        _openThread(context, thread.fromDetail(detail));
      }
    } catch (_) {
      if (context.mounted) {
        AppToast.error(context, '认领失败，请重试');
      }
    }
  }

  Future<void> _takeoverThread(
      BuildContext context, WidgetRef ref, CsThread thread) async {
    try {
      final detail = await ref
          .read(customerServiceRepositoryProvider)
          .takeoverThread(thread);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
      if (context.mounted) {
        AppToast.success(context, '已接管会话');
        _openThread(context, thread.fromDetail(detail));
      }
    } catch (_) {
      if (context.mounted) {
        AppToast.error(context, '接管失败，请重试');
      }
    }
  }

  Future<void> _closeThread(
      BuildContext context, WidgetRef ref, CsThread thread) async {
    if (thread.isTerminal) {
      AppToast.info(context, '会话已结束');
      return;
    }
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('关闭会话'),
            content: const Text('关闭后不会删除底层聊天记录，可由服务端策略重新排队或分配。'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('取消'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('关闭'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !context.mounted) return;
    try {
      await ref.read(customerServiceRepositoryProvider).closeThread(thread);
      ref.invalidate(customerServiceThreadsProvider);
      ref.invalidate(customerServiceDashboardProvider);
      if (context.mounted) {
        AppToast.success(context, '已关闭会话');
      }
    } catch (_) {
      if (context.mounted) {
        AppToast.error(context, '关闭失败，请重试');
      }
    }
  }
}

class _OnlineServiceSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _OnlineServiceSearchBar({
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
      cursorColor: _primary,
      decoration: InputDecoration(
        hintText: '搜索会话',
        hintStyle: TextStyle(
          fontSize: 14,
          color: colorScheme.onSurface.withValues(alpha: 0.38),
        ),
        prefixIcon: Icon(
          Icons.search_rounded,
          size: 20,
          color: colorScheme.onSurface.withValues(alpha: 0.38),
        ),
        filled: true,
        fillColor: colorScheme.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Theme.of(context).dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Theme.of(context).dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _primary),
        ),
      ),
    );
  }
}

class _OnlineThreadModeBar extends StatelessWidget {
  final _OnlineThreadMode selected;
  final int currentCount;
  final int historyCount;
  final ValueChanged<_OnlineThreadMode> onSelected;

  const _OnlineThreadModeBar({
    required this.selected,
    required this.currentCount,
    required this.historyCount,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: _OnlineThreadModeButton(
              label: '当前接待',
              count: currentCount,
              selected: selected == _OnlineThreadMode.current,
              onTap: () => onSelected(_OnlineThreadMode.current),
            ),
          ),
          Expanded(
            child: _OnlineThreadModeButton(
              label: '历史会话',
              count: historyCount,
              selected: selected == _OnlineThreadMode.history,
              onTap: () => onSelected(_OnlineThreadMode.history),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnlineThreadModeButton extends StatelessWidget {
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _OnlineThreadModeButton({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? _primary.withValues(alpha: 0.10) : Colors.transparent,
      borderRadius: BorderRadius.circular(9),
      child: InkWell(
        borderRadius: BorderRadius.circular(9),
        onTap: onTap,
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected
                      ? _primary
                      : colorScheme.onSurface.withValues(alpha: 0.62),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                constraints: const BoxConstraints(minWidth: 22),
                height: 20,
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(horizontal: 7),
                decoration: BoxDecoration(
                  color: selected
                      ? _primary
                      : colorScheme.onSurface.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 12,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    color: selected
                        ? Colors.white
                        : colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnlineThreadFilterCounts {
  final int all;
  final int queued;
  final int active;
  final int vip;

  const _OnlineThreadFilterCounts({
    required this.all,
    required this.queued,
    required this.active,
    required this.vip,
  });

  factory _OnlineThreadFilterCounts.fromThreads(List<CsThread> threads) {
    return _OnlineThreadFilterCounts(
      all: threads.length,
      queued: threads.where((thread) => thread.isQueued).length,
      active: threads.where((thread) => !thread.isQueued).length,
      vip: threads.where((thread) => thread.isVip).length,
    );
  }

  int valueFor(_OnlineThreadFilter filter) {
    switch (filter) {
      case _OnlineThreadFilter.all:
        return all;
      case _OnlineThreadFilter.queued:
        return queued;
      case _OnlineThreadFilter.active:
        return active;
      case _OnlineThreadFilter.vip:
        return vip;
    }
  }
}

class _OnlineThreadFilterBar extends StatelessWidget {
  final _OnlineThreadFilter selected;
  final _OnlineThreadFilterCounts counts;
  final ValueChanged<_OnlineThreadFilter> onSelected;

  const _OnlineThreadFilterBar({
    required this.selected,
    required this.counts,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    const items = [
      (_OnlineThreadFilter.all, '全部'),
      (_OnlineThreadFilter.queued, '排队'),
      (_OnlineThreadFilter.active, '进行中'),
      (_OnlineThreadFilter.vip, 'VIP'),
    ];

    return Container(
      height: 74,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: items
            .map(
              (item) => Expanded(
                child: _OnlineThreadFilterTile(
                  label: item.$2,
                  count: counts.valueFor(item.$1),
                  selected: selected == item.$1,
                  onTap: () => onSelected(item.$1),
                ),
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class _OnlineThreadFilterTile extends StatelessWidget {
  static const _accent = Color(0xFF6D35D8);

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _OnlineThreadFilterTile({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final labelColor =
        selected ? _accent : colorScheme.onSurface.withValues(alpha: 0.68);
    return Container(
      color: selected ? const Color(0xFFF2EFFB) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: labelColor,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(minWidth: 34),
              height: 22,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 9),
              decoration: BoxDecoration(
                color: selected
                    ? _accent
                    : colorScheme.onSurface.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Text(
                '$count',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  height: 1,
                  fontWeight: FontWeight.w700,
                  color: selected
                      ? Colors.white
                      : colorScheme.onSurface.withValues(alpha: 0.68),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnlineThreadEmptyState extends StatelessWidget {
  final String message;

  const _OnlineThreadEmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: TextStyle(
          fontSize: 13,
          color: colorScheme.onSurface.withValues(alpha: 0.48),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Dashboard Tab — 服务效能
// ---------------------------------------------------------------------------

class _DashboardTab extends ConsumerWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _buildDashboard(context);
  }

  Widget _buildDashboard(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
      children: const [
        _StatGrid(stats: [
          _Stat(label: '今日接待', value: '--'),
          _Stat(label: '平均首响', value: '--'),
          _Stat(label: '平均处理', value: '--'),
          _Stat(label: '满意度', value: '--'),
          _Stat(label: '超时会话', value: '--'),
          _Stat(label: '待分配', value: '--'),
        ]),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Shared Widgets
// ---------------------------------------------------------------------------

class _ThreadCard extends StatelessWidget {
  final CsThread thread;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  const _ThreadCard({
    required this.thread,
    required this.primaryLabel,
    required this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // 头像
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.outline,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Center(
              child: Text(
                thread.title.isNotEmpty ? thread.title[0] : '?',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // 信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(thread.title,
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.onSurface)),
                    ),
                    _ChannelBadge(source: thread.source),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: thread.isTempSession
                            ? const Color(0xFFE8F8EF)
                            : const Color(0xFFEFF3FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        thread.isTempSession ? '访客' : '客户',
                        style: TextStyle(
                          fontSize: 10,
                          color: thread.isTempSession
                              ? _primary
                              : const Color(0xFF3B82F6),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _threadSubtitle,
                  style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.5)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // 操作按钮区
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ActionBtn(label: primaryLabel, onTap: onPrimary, primary: true),
              if (secondaryLabel != null && onSecondary != null) ...[
                const SizedBox(height: 6),
                _ActionBtn(
                  label: secondaryLabel!,
                  onTap: onSecondary!,
                  primary: false,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String get _threadSubtitle {
    if (thread.lastMessagePreview?.isNotEmpty == true) {
      return thread.lastMessagePreview!;
    }
    final parts = <String>[];
    if (thread.queuePosition != null) {
      parts.add('排队第 ${thread.queuePosition} 位');
    }
    if (thread.estimatedWaitSeconds != null) {
      final seconds = thread.estimatedWaitSeconds!;
      if (seconds >= 60) {
        parts.add('预计等待 ${seconds ~/ 60} 分钟');
      } else {
        parts.add('预计等待 $seconds 秒');
      }
    }
    if (thread.assignedStaffDisplayName?.isNotEmpty == true) {
      parts.add('客服 ${thread.assignedStaffDisplayName}');
    }
    if (thread.source?.trim().isNotEmpty == true) {
      parts.add('来源 ${_channelLabel(thread.source)}');
    }
    return parts.isEmpty ? '暂无消息' : parts.join(' · ');
  }
}

class _ChannelBadge extends StatelessWidget {
  final String? source;

  const _ChannelBadge({required this.source});

  @override
  Widget build(BuildContext context) {
    final label = _channelLabel(source);
    final color = _channelColor(source);
    final icon = _channelIcon(source);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

String _channelLabel(String? source) {
  final value = source?.trim();
  if (value == null || value.isEmpty) return '未知';
  if (value.contains('抖音')) return '抖音';
  if (value.contains('微信')) return '微信';
  if (value.contains('网页') || value.contains('网站')) return '网页';
  if (value.contains('自有') || value.contains('APP') || value.contains('App')) {
    return '自有 App';
  }
  final normalized = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  if (normalized.contains('douyin') || normalized.contains('tiktok')) {
    return '抖音';
  }
  if (normalized.contains('whatsapp') || normalized.contains('wathsup')) {
    return 'WhatsApp';
  }
  if (normalized.contains('telegram') || normalized == 'tg') {
    return 'Telegram';
  }
  if (normalized.contains('app') || normalized.contains('native')) {
    return '自有 App';
  }
  if (normalized.contains('widget') ||
      normalized.contains('web') ||
      normalized.contains('site')) {
    return '网页';
  }
  if (value.length <= 12) return value;
  return '${value.substring(0, 12)}…';
}

Color _channelColor(String? source) {
  final value = source?.trim() ?? '';
  if (value.contains('抖音')) return const Color(0xFF111827);
  if (value.contains('网页') || value.contains('网站') || value.contains('微信')) {
    return const Color(0xFF2563EB);
  }
  if (value.contains('自有')) return const Color(0xFF7C3AED);
  final normalized =
      source?.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_') ?? '';
  if (normalized.contains('douyin') || normalized.contains('tiktok')) {
    return const Color(0xFF111827);
  }
  if (normalized.contains('whatsapp') || normalized.contains('wathsup')) {
    return const Color(0xFF16A34A);
  }
  if (normalized.contains('telegram') || normalized == 'tg') {
    return const Color(0xFF0284C7);
  }
  if (normalized.contains('app') || normalized.contains('native')) {
    return const Color(0xFF7C3AED);
  }
  return const Color(0xFF2563EB);
}

IconData _channelIcon(String? source) {
  final value = source?.trim() ?? '';
  if (value.contains('自有')) return Icons.phone_iphone_rounded;
  if (value.contains('抖音') ||
      value.contains('微信') ||
      value.contains('网页') ||
      value.contains('网站')) {
    return Icons.chat_bubble_outline_rounded;
  }
  final normalized =
      source?.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_') ?? '';
  if (normalized.contains('app') || normalized.contains('native')) {
    return Icons.phone_iphone_rounded;
  }
  if (normalized.contains('telegram') ||
      normalized.contains('whatsapp') ||
      normalized.contains('wathsup') ||
      normalized.contains('douyin') ||
      normalized.contains('tiktok')) {
    return Icons.chat_bubble_outline_rounded;
  }
  return Icons.public_rounded;
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool primary;

  const _ActionBtn(
      {required this.label, required this.onTap, required this.primary});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: primary ? _primary : Colors.transparent,
          border: primary ? null : Border.all(color: const Color(0xFFEF4444)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: primary ? Colors.white : const Color(0xFFEF4444),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _StatGrid extends StatelessWidget {
  final List<_Stat> stats;
  const _StatGrid({required this.stats});

  @override
  Widget build(BuildContext context) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.6,
        children: stats.map((s) => _StatCard(stat: s)).toList(),
      );
}

class _Stat {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});
}

class _StatCard extends StatelessWidget {
  final _Stat stat;
  const _StatCard({required this.stat});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(stat.value,
                style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: _primary)),
            const SizedBox(height: 4),
            Text(stat.label,
                style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5))),
          ],
        ),
      );
}
