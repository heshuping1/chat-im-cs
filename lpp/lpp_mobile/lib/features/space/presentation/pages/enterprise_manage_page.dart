import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/space/presentation/providers/tenant_features_provider.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';
// ---------------------------------------------------------------------------
// 企业管理页面（所有者完整，管理员部分）
// ---------------------------------------------------------------------------

class EnterpriseManagePage extends ConsumerWidget {
  const EnterpriseManagePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(currentSpaceProvider);
    final l10n = AppLocalizations.of(context);
    final isOwner = (space?.membershipRole ?? 0) == 4;
    final role = space?.membershipRole;
    final isAdminOrAbove = role == 3 || role == 4;

    if (!isAdminOrAbove) {
      return const Scaffold(
        body: Center(child: Text('无权限')),
      );
    }

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: Text(l10n.myEnterpriseManage,
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1C1C1E))),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios,
              size: 18, color: Color(0xFF1C1C1E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── 企业信息（仅所有者）──────────────────────────────────────────
          if (isOwner) ...[
            const _SectionTitle(title: '企业信息'),
            _MenuGroup(items: [
              _MenuItem(
                icon: Icons.business_outlined,
                label: '企业信息设置',
                onTap: () => context.push('/enterprise/info'),
              ),
              _MenuItem(
                icon: Icons.account_circle_outlined,
                label: '官方账号管理',
                onTap: () => context.push('/enterprise/official-account'),
              ),
            ]),
            const SizedBox(height: 16),
            const _SectionTitle(title: '企业配置'),
            _EnterpriseConfigSection(),
            const SizedBox(height: 16),
          ],

          // ── 成员管理 ────────────────────────────────────────────────────
          const _SectionTitle(title: '成员管理'),
          _MenuGroup(items: [
            _MenuItem(
              icon: Icons.person_add_outlined,
              label: '邀请员工',
              onTap: () => context.push('/enterprise/invite'),
            ),
            _MenuItem(
              icon: Icons.people_outline,
              label: '成员列表',
              onTap: () => context.push('/enterprise/members'),
            ),
          ]),
          const SizedBox(height: 16),

          // ── 公告管理 ────────────────────────────────────────────────────
          const _SectionTitle(title: '公告管理'),
          _MenuGroup(items: [
            _MenuItem(
              icon: Icons.campaign_outlined,
              label: '企业群发',
              onTap: () => context.push('/enterprise-broadcast'),
            ),
            _MenuItem(
              icon: Icons.campaign_outlined,
              label: '企业公告',
              onTap: () => context.push('/notices'),
            ),
          ]),
          const SizedBox(height: 16),

          // ── 审批 ────────────────────────────────────────────────────────
          const _SectionTitle(title: '审批'),
          _MenuGroup(items: [
            _MenuItem(
              icon: Icons.approval_outlined,
              label: '加入申请审批',
              onTap: () => context.push('/new-applications'),
            ),
          ]),
          const SizedBox(height: 16),

          // ── 转让所有者（仅所有者）──────────────────────────────────────
          if (isOwner) ...[
            _MenuGroup(items: [
              _MenuItem(
                icon: Icons.swap_horiz_outlined,
                label: '转让所有者',
                onTap: () => _showTransferOwnerDialog(context, ref),
                danger: true,
              ),
            ]),
          ],
        ],
      ),
    );
  }

  void _showTransferOwnerDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('转让所有者',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: const Text(
          '转让后您将降为管理员，无法撤销。请前往成员列表选择新的所有者。',
          style: TextStyle(fontSize: 14, color: Color(0xFF86909C)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('取消', style: TextStyle(color: Color(0xFF86909C))),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.push('/enterprise/members?selectOwner=true');
            },
            child: const Text('选择新所有者',
                style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 企业配置区块（所有者专属）
// ---------------------------------------------------------------------------

class _EnterpriseConfigSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(currentSpaceProvider);
    final spaceId = space?.spaceId ?? '';
    final featuresAsync = ref.watch(tenantFeaturesProvider(spaceId));

    return featuresAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const SizedBox.shrink(),
      data: (features) => _MenuGroup(items: [
        _MenuItem(
          icon: Icons.support_agent_outlined,
          label: '客服分配模式',
          value: features.customerServiceMode == 'auto' ? '自动分配' : '指定客服',
          onTap: () => _showCustomerServiceModeDialog(
              context, ref, features.customerServiceMode),
        ),
        _MenuItem(
          icon: Icons.how_to_reg_outlined,
          label: '加入审批模式',
          value: features.joinApprovalMode == 'manual' ? '人工审批' : '自动通过',
          onTap: () => _showJoinApprovalModeDialog(
              context, ref, features.joinApprovalMode),
        ),
        _MenuItem(
          icon: Icons.people_alt_outlined,
          label: '好友模式',
          value: features.friendMode == 'social' ? '社交模式' : '隔离模式',
          onTap: () => _showFriendModeDialog(context, ref, features.friendMode),
        ),
        _MenuItem(
          icon: Icons.chat_bubble_outline,
          label: 'Widget 访客功能',
          value: features.tempSessionEnabled ? '已开启' : '已关闭',
          onTap: () =>
              _toggleTempSession(context, ref, features.tempSessionEnabled),
        ),
      ]),
    );
  }

  void _showCustomerServiceModeDialog(
      BuildContext context, WidgetRef ref, String current) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('客服分配模式',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            ListTile(
              title: const Text('自动分配'),
              subtitle: const Text('按轮询自动分配空闲客服'),
              trailing: current == 'auto'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(ref, {'customerServiceMode': 'auto'});
              },
            ),
            ListTile(
              title: const Text('指定客服'),
              subtitle: const Text('所有客户分配给指定客服'),
              trailing: current == 'designated'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(
                    ref, {'customerServiceMode': 'designated'});
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showJoinApprovalModeDialog(
      BuildContext context, WidgetRef ref, String current) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('加入审批模式',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            ListTile(
              title: const Text('人工审批'),
              subtitle: const Text('客户申请需管理员审批'),
              trailing: current == 'manual'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(ref, {'joinApprovalMode': 'manual'});
              },
            ),
            ListTile(
              title: const Text('自动通过'),
              subtitle: const Text('客户申请自动通过'),
              trailing: current == 'auto'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(ref, {'joinApprovalMode': 'auto'});
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showFriendModeDialog(
      BuildContext context, WidgetRef ref, String current) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('好友模式',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            ListTile(
              title: const Text('社交模式'),
              subtitle: const Text('客户之间可互加好友'),
              trailing: current == 'social'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(ref, {'friendMode': 'social'});
              },
            ),
            ListTile(
              title: const Text('隔离模式'),
              subtitle: const Text('客户之间禁止互加好友'),
              trailing: current == 'isolation'
                  ? const Icon(Icons.check, color: Color(0xFF00B27A))
                  : null,
              onTap: () async {
                Navigator.of(ctx).pop();
                await _updateFeature(ref, {'friendMode': 'isolation'});
              },
            ),
          ],
        ),
      ),
    );
  }

  void _toggleTempSession(
      BuildContext context, WidgetRef ref, bool current) async {
    await _updateFeature(ref, {'tempSessionEnabled': !current});
  }

  Future<void> _updateFeature(WidgetRef ref, Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.put<Map<String, dynamic>>('/api/client/v1/tenant/features',
          data: data);
      final spaceId = ref.read(currentSpaceProvider)?.spaceId ?? '';
      ref.invalidate(tenantFeaturesProvider(spaceId));
    } catch (_) {}
  }
}

// ---------------------------------------------------------------------------
// 共用 UI 组件
// ---------------------------------------------------------------------------

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(title,
          style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF8E8E93),
              fontWeight: FontWeight.w500)),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  final List<_MenuItem> items;

  const _MenuGroup({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: items.asMap().entries.map((e) {
          final i = e.key;
          final item = e.value;
          return Column(
            children: [
              InkWell(
                onTap: item.onTap,
                borderRadius: BorderRadius.vertical(
                  top: i == 0 ? const Radius.circular(12) : Radius.zero,
                  bottom: i == items.length - 1
                      ? const Radius.circular(12)
                      : Radius.zero,
                ),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  child: Row(
                    children: [
                      Icon(item.icon,
                          size: 22,
                          color: item.danger
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF00B27A)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(item.label,
                            style: TextStyle(
                                fontSize: 15,
                                color: item.danger
                                    ? const Color(0xFFEF4444)
                                    : const Color(0xFF2C2C2C))),
                      ),
                      if (item.value != null)
                        Text(item.value!,
                            style: const TextStyle(
                                fontSize: 14, color: Color(0xFF8E8E93))),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right,
                          color: Color(0xFFC7C7CC), size: 18),
                    ],
                  ),
                ),
              ),
              if (i < items.length - 1)
                const Divider(height: 1, indent: 50, color: Color(0xFFF2F2F7)),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback onTap;
  final bool danger;

  const _MenuItem({
    required this.icon,
    required this.label,
    this.value,
    required this.onTap,
    this.danger = false,
  });
}
