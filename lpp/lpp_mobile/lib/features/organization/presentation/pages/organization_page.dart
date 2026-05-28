import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/profile_page.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

bool _orgIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _orgPrimaryText(BuildContext context) => _orgIsDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1C1C1E);

Color _orgSecondaryText(BuildContext context) => _orgIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _orgHintText(BuildContext context) => _orgIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.42)
    : const Color(0xFFAEAEB2);

Color _orgInputBorder(BuildContext context) => _orgIsDark(context)
    ? Theme.of(context).dividerColor
    : const Color(0xFFE5E5EA);

// ---------------------------------------------------------------------------
// OrganizationPage — 组织架构（部门树 + 全员列表）
// ---------------------------------------------------------------------------

class OrganizationPage extends ConsumerStatefulWidget {
  final String? title;

  const OrganizationPage({super.key, this.title});

  @override
  ConsumerState<OrganizationPage> createState() => _OrganizationPageState();
}

class _OrganizationPageState extends ConsumerState<OrganizationPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Contact? _selectedContact; // 右侧面板选中的联系人

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final space = ref.watch(currentSpaceProvider);
    final isAdminOrganization = AppPermissions.canSeeAllCustomers(space);

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new,
              size: 18, color: _orgPrimaryText(context)),
          onPressed: () {
            if (_selectedContact != null) {
              setState(() => _selectedContact = null);
            } else {
              context.pop();
            }
          },
        ),
        title: Text(
          _selectedContact != null
              ? _selectedContact!.displayName
              : widget.title ?? l10n.organizationTitle,
          style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: _orgPrimaryText(context)),
        ),
        centerTitle: true,
        bottom: _selectedContact == null && !isAdminOrganization
            ? TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF00B27A),
                unselectedLabelColor: _orgSecondaryText(context),
                indicatorColor: const Color(0xFF00B27A),
                indicatorWeight: 2,
                labelStyle:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                tabs: const [Tab(text: '全员'), Tab(text: '部门')],
              )
            : null,
      ),
      body: _selectedContact != null
          ? _ProfilePanel(
              userId: _selectedContact!.userId,
              onBack: () => setState(() => _selectedContact = null),
            )
          : isAdminOrganization
              ? const _AdminOrganizationView()
              : TabBarView(
                  controller: _tabController,
                  children: const [
                    _AllMembersTab(),
                    _DepartmentTab(),
                  ],
                ),
    );
  }
}

// ---------------------------------------------------------------------------
// Admin organization view
// ---------------------------------------------------------------------------

class _AdminOrganizationView extends ConsumerStatefulWidget {
  const _AdminOrganizationView();

  @override
  ConsumerState<_AdminOrganizationView> createState() =>
      _AdminOrganizationViewState();
}

class _AdminOrganizationViewState
    extends ConsumerState<_AdminOrganizationView> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  static const _roleOrder = {
    '所有者': 0,
    '管理员': 1,
    '客服': 2,
    '技术支持': 3,
    '员工': 4,
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(tenantMembersProvider);
    final myUserId = ref.watch(currentSpaceProvider)?.userId ?? '';

    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: () => ref.read(tenantMembersProvider.notifier).refresh(),
      child: membersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child:
              Text('加载失败', style: TextStyle(color: _orgSecondaryText(context))),
        ),
        data: (members) {
          final staff = members
              .where((m) => !m.isCustomer && m.customerTag != '客户')
              .toList();
          final filteredStaff = staff
              .where((m) =>
                  _query.isEmpty ||
                  m.displayName.toLowerCase().contains(_query.toLowerCase()) ||
                  (m.customerTag ?? '').contains(_query))
              .toList();
          final groups = _groupByRole(filteredStaff);

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                  child: _OrganizationSearchField(
                    controller: _searchCtrl,
                    hintText: '搜索员工 / 角色 / 职位',
                    onChanged: (v) => setState(() => _query = v.trim()),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _EnterpriseOverviewCard(
                  totalStaff: staff.length,
                  adminCount: staff
                      .where((m) =>
                          m.customerTag == '所有者' || m.customerTag == '管理员')
                      .length,
                  serviceCount:
                      staff.where((m) => m.customerTag == '客服').length,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverToBoxAdapter(child: _AdminQuickActions()),
              const SliverToBoxAdapter(child: SizedBox(height: 18)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Text(
                        '企业成员',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: _orgPrimaryText(context),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${filteredStaff.length}人',
                        style: TextStyle(
                          fontSize: 13,
                          color: _orgSecondaryText(context),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              if (filteredStaff.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Text(
                      '暂无匹配成员',
                      style: TextStyle(color: _orgSecondaryText(context)),
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return _buildGroupedRow(
                        context: context,
                        groups: groups,
                        index: index,
                        myUserId: myUserId,
                      );
                    },
                    childCount: groups.fold<int>(
                      0,
                      (sum, group) => sum + 1 + group.value.length,
                    ),
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          );
        },
      ),
    );
  }

  List<MapEntry<String, List<Contact>>> _groupByRole(List<Contact> staff) {
    final groups = <String, List<Contact>>{};
    for (final member in staff) {
      final role = member.customerTag ?? '员工';
      groups.putIfAbsent(role, () => []).add(member);
    }
    final sorted = groups.entries.toList()
      ..sort((a, b) =>
          (_roleOrder[a.key] ?? 99).compareTo(_roleOrder[b.key] ?? 99));
    for (final group in sorted) {
      group.value.sort((a, b) => a.displayName.compareTo(b.displayName));
    }
    return sorted;
  }

  Widget _buildGroupedRow({
    required BuildContext context,
    required List<MapEntry<String, List<Contact>>> groups,
    required int index,
    required String myUserId,
  }) {
    var offset = 0;
    for (final group in groups) {
      if (index == offset) {
        return _RoleSectionHeader(role: group.key, count: group.value.length);
      }
      offset++;
      for (final member in group.value) {
        if (index == offset) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _StaffTile(
              contact: member,
              isMe: member.userId == myUserId,
            ),
          );
        }
        offset++;
      }
    }
    return const SizedBox.shrink();
  }
}

class _OrganizationSearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final ValueChanged<String> onChanged;

  const _OrganizationSearchField({
    required this.controller,
    required this.hintText,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: TextStyle(color: _orgPrimaryText(context), fontSize: 15),
      cursorColor: const Color(0xFF00B27A),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(color: _orgHintText(context), fontSize: 15),
        prefixIcon: Icon(Icons.search, color: _orgHintText(context), size: 20),
        filled: true,
        fillColor: Theme.of(context).colorScheme.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _orgInputBorder(context)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _orgInputBorder(context)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF00B27A)),
        ),
      ),
    );
  }
}

class _EnterpriseOverviewCard extends StatelessWidget {
  final int totalStaff;
  final int adminCount;
  final int serviceCount;

  const _EnterpriseOverviewCard({
    required this.totalStaff,
    required this.adminCount,
    required this.serviceCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.apartment_outlined,
                  size: 20, color: Color(0xFF00B27A)),
              const SizedBox(width: 8),
              Text(
                '企业概览',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _orgPrimaryText(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _OverviewMetric(label: '成员', value: totalStaff)),
              Expanded(child: _OverviewMetric(label: '管理', value: adminCount)),
              Expanded(
                  child: _OverviewMetric(label: '客服', value: serviceCount)),
            ],
          ),
        ],
      ),
    );
  }
}

class _OverviewMetric extends StatelessWidget {
  final String label;
  final int value;

  const _OverviewMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$value',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: _orgPrimaryText(context),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: _orgSecondaryText(context)),
        ),
      ],
    );
  }
}

class _AdminQuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          _AdminQuickAction(
            icon: Icons.manage_accounts_outlined,
            label: '成员管理',
            onTap: () => context.push('/enterprise/members'),
          ),
          _AdminQuickAction(
            icon: Icons.admin_panel_settings_outlined,
            label: '角色权限',
            onTap: () => context.push('/enterprise/members'),
          ),
          _AdminQuickAction(
            icon: Icons.person_add_alt_1_outlined,
            label: '邀请员工',
            onTap: () => context.push('/enterprise/invite'),
          ),
          _AdminQuickAction(
            icon: Icons.swap_horiz_outlined,
            label: '离职交接',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('功能即将上线')),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminQuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AdminQuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            children: [
              Icon(icon, size: 24, color: const Color(0xFF00B27A)),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: _orgPrimaryText(context),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleSectionHeader extends StatelessWidget {
  final String role;
  final int count;

  const _RoleSectionHeader({required this.role, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Text(
        '$role  $count人',
        style: TextStyle(
          fontSize: 13,
          color: _orgSecondaryText(context),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tab 1: 部门树
// ---------------------------------------------------------------------------

class _DepartmentTab extends ConsumerWidget {
  const _DepartmentTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deptTreeAsync = ref.watch(departmentTreeProvider);
    return deptTreeAsync.when(
      data: (departments) => departments.isEmpty
          ? Center(
              child: Text(AppLocalizations.of(context).organizationEmpty,
                  style: TextStyle(color: _orgSecondaryText(context))))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: departments.length,
              itemBuilder: (context, index) => _DepartmentSection(
                department: departments[index],
              ),
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
          child: Text('加载失败: $e',
              style: TextStyle(color: _orgSecondaryText(context)))),
    );
  }
}

// ---------------------------------------------------------------------------
// Tab 2: 全员列表（带搜索）
// ---------------------------------------------------------------------------

class _AllMembersTab extends ConsumerStatefulWidget {
  const _AllMembersTab();

  @override
  ConsumerState<_AllMembersTab> createState() => _AllMembersTabState();
}

class _AllMembersTabState extends ConsumerState<_AllMembersTab> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  // 角色排序权重
  static const _roleOrder = {
    '所有者': 0,
    '管理员': 1,
    '客服': 2,
    '技术支持': 3,
    '员工': 4,
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(tenantMembersProvider);
    final myUserId = ref.watch(currentSpaceProvider)?.userId ?? '';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: TextField(
            controller: _searchCtrl,
            onChanged: (v) => setState(() => _query = v),
            style: TextStyle(color: _orgPrimaryText(context), fontSize: 15),
            cursorColor: const Color(0xFF00B27A),
            decoration: InputDecoration(
              hintText: '搜索员工',
              hintStyle: TextStyle(color: _orgHintText(context), fontSize: 15),
              prefixIcon:
                  Icon(Icons.search, color: _orgHintText(context), size: 20),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _orgInputBorder(context)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _orgInputBorder(context)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF00B27A)),
              ),
            ),
          ),
        ),
        Expanded(
          child: membersAsync.when(
            data: (members) {
              final filtered = members
                  .where((m) => !m.isCustomer && m.customerTag != '客户')
                  .where(
                      (m) => _query.isEmpty || m.displayName.contains(_query))
                  .toList();
              if (filtered.isEmpty) {
                return Center(
                  child: Text('暂无成员',
                      style: TextStyle(color: _orgSecondaryText(context))),
                );
              }

              // 按角色分组
              final groups = <String, List<Contact>>{};
              for (final m in filtered) {
                final role = m.customerTag ?? '员工';
                groups.putIfAbsent(role, () => []).add(m);
              }
              // 按角色权重排序
              final sortedGroups = groups.entries.toList()
                ..sort((a, b) => (_roleOrder[a.key] ?? 99)
                    .compareTo(_roleOrder[b.key] ?? 99));

              return ListView.builder(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                itemCount: sortedGroups.fold<int>(
                    0, (sum, g) => sum + 1 + g.value.length),
                itemBuilder: (context, index) {
                  int offset = 0;
                  for (final group in sortedGroups) {
                    if (index == offset) {
                      // 分组标题
                      return Container(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        padding: const EdgeInsets.fromLTRB(0, 12, 0, 4),
                        child: Text(
                          '${group.key}  ${group.value.length}人',
                          style: TextStyle(
                              fontSize: 13,
                              color: _orgSecondaryText(context),
                              fontWeight: FontWeight.w500),
                        ),
                      );
                    }
                    offset++;
                    for (int i = 0; i < group.value.length; i++) {
                      if (index == offset) {
                        return _StaffTile(
                          contact: group.value[i],
                          isMe: group.value[i].userId == myUserId,
                        );
                      }
                      offset++;
                    }
                  }
                  return null;
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => Center(
              child: Text('加载失败',
                  style: TextStyle(color: _orgSecondaryText(context))),
            ),
          ),
        ),
      ],
    );
  }
}

class _StaffTile extends StatelessWidget {
  final Contact contact;
  final bool isMe;
  const _StaffTile({required this.contact, this.isMe = false});

  @override
  Widget build(BuildContext context) {
    final identity = identityBadgeFor(
      userType: contact.userType,
      customerTag: contact.customerTag,
    );
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: () => context.push('/profile/${contact.userId}'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              PersonAvatarWithBadge(
                avatarUrl: contact.avatarUrl,
                name: contact.displayName,
                userType: contact.userType,
                customerTag: contact.customerTag,
                size: 48,
                borderRadius: 12,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  children: [
                    Text(contact.displayName,
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: _orgPrimaryText(context))),
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.3)),
                        ),
                        child: Text('我',
                            style: TextStyle(
                                fontSize: 10,
                                color: _orgSecondaryText(context),
                                fontWeight: FontWeight.w600)),
                      ),
                    ],
                    if (identity != null) ...[
                      const SizedBox(width: 6),
                      IdentityBadge(
                        label: identity.label,
                        tone: identity.tone,
                        compact: true,
                      ),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: _orgSecondaryText(context).withValues(alpha: 0.55),
                  size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _DepartmentSection extends ConsumerStatefulWidget {
  final Department department;
  final ValueChanged<Contact>? onSelectContact;

  const _DepartmentSection({required this.department, this.onSelectContact});

  @override
  ConsumerState<_DepartmentSection> createState() => _DepartmentSectionState();
}

class _DepartmentSectionState extends ConsumerState<_DepartmentSection> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final membersAsync =
        ref.watch(departmentMembersProvider(widget.department.departmentId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Department header
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            child: Row(
              children: [
                Icon(
                  _expanded ? Icons.expand_more : Icons.chevron_right,
                  size: 18,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                ),
                const SizedBox(width: 4),
                Text(
                  widget.department.departmentName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _orgSecondaryText(context),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${widget.department.memberCount}人',
                  style: TextStyle(fontSize: 12, color: _orgHintText(context)),
                ),
              ],
            ),
          ),
        ),
        // Members
        if (_expanded)
          membersAsync.when(
            data: (members) {
              final staffMembers =
                  members.where((member) => !member.isCustomer).toList();
              return _MemberCard(
                members: staffMembers,
                onSelectContact: widget.onSelectContact,
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),
        // Sub-departments
        if (_expanded && widget.department.children.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(left: 16),
            child: Column(
              children: widget.department.children
                  .map((child) => _DepartmentSection(
                      department: child,
                      onSelectContact: widget.onSelectContact))
                  .toList(),
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _MemberCard extends ConsumerWidget {
  final List<DepartmentMember> members;
  final ValueChanged<Contact>? onSelectContact;

  const _MemberCard({required this.members, this.onSelectContact});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (members.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: members.asMap().entries.map((entry) {
          final i = entry.key;
          final member = entry.value;
          final isLast = i == members.length - 1;
          return _MemberTile(
            member: member,
            showDivider: !isLast,
            onSelectContact: onSelectContact,
          );
        }).toList(),
      ),
    );
  }
}

class _MemberTile extends ConsumerWidget {
  final DepartmentMember member;
  final bool showDivider;
  final ValueChanged<Contact>? onSelectContact;

  const _MemberTile(
      {required this.member, this.showDivider = true, this.onSelectContact});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final identity = identityBadgeFor(
      userType: member.userType,
      customerTag: member.customerTag,
      membershipRole: member.membershipRole,
    );
    return Column(
      children: [
        InkWell(
          onTap: () {
            if (onSelectContact != null) {
              // 转换为 Contact 对象
              final contact = Contact(
                userId: member.userId,
                name: member.displayName,
                avatarUrl: member.avatarUrl,
                customerTag: '员工',
              );
              onSelectContact!(contact);
            } else {
              context.push('/profile/${member.userId}');
            }
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outline,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: member.avatarUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: AuthNetworkImage(
                            url: member.avatarUrl!,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                          ),
                        )
                      : Center(
                          child: Text(
                            member.displayName.isNotEmpty
                                ? member.displayName[0]
                                : '?',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: _orgSecondaryText(context),
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            member.displayName,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: _orgPrimaryText(context),
                            ),
                          ),
                          if (identity != null) ...[
                            const SizedBox(width: 6),
                            IdentityBadge(
                              label: identity.label,
                              tone: identity.tone,
                              compact: true,
                            ),
                          ],
                        ],
                      ),
                      if (member.position != null)
                        Text(
                          member.position!,
                          style: TextStyle(
                              fontSize: 12, color: _orgSecondaryText(context)),
                        ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right,
                    color: _orgSecondaryText(context).withValues(alpha: 0.55),
                    size: 18),
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(height: 1, indent: 76, color: Theme.of(context).dividerColor),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _ProfilePanel — 右侧详情面板（内嵌 ProfilePage 内容，不跳转新页面）
// ---------------------------------------------------------------------------

class _ProfilePanel extends ConsumerStatefulWidget {
  final String userId;
  final VoidCallback onBack;

  const _ProfilePanel({required this.userId, required this.onBack});

  @override
  ConsumerState<_ProfilePanel> createState() => _ProfilePanelState();
}

class _ProfilePanelState extends ConsumerState<_ProfilePanel> {
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
                      _OrgActionSheetItem(
                        label: '语音通话',
                        onTap: () {
                          Navigator.pop(ctx);
                          _startCall(context, profile, isVideo: false);
                        },
                      ),
                      const Divider(height: 1),
                      _OrgActionSheetItem(
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
                  child: _OrgActionSheetItem(
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

  Future<void> _openChat(BuildContext context, UserProfile profile) async {
    try {
      final dio = ref.read(dioProvider);
      final resp = await dio.post<Map<String, dynamic>>(
        '/api/client/v1/direct-chats',
        data: {'peerUserId': widget.userId},
      );
      final chatId = resp.data?['data']?['conversationId'] as String? ??
          resp.data?['data']?['chatId'] as String?;
      if (chatId != null && context.mounted) {
        context.push('/chat/$chatId', extra: {
          'title': profile.name,
          'isGroup': false,
          'avatarUrl': profile.avatarUrl,
          'peerUserId': widget.userId,
        });
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('无法打开聊天，请重试')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(userProfileProvider(widget.userId));
    final space = ref.watch(currentSpaceProvider);
    final myUserId = space?.userId ?? '';

    return profileAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('加载失败: $e')),
      data: (profile) {
        final isMe = profile.userId == myUserId;
        final canDirectMessage = AppPermissions.canDirectMessageProfile(
          space: space,
          adminCustomerView: false,
          targetIsFriend: profile.isFriend,
          targetIsEmployee: profile.isEmployee,
        );

        return SingleChildScrollView(
          child: Column(
            children: [
              // 头像 + 基本信息
              Container(
                color: Theme.of(context).colorScheme.surface,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    UserAvatar(
                      avatarUrl: profile.avatarUrl,
                      name: profile.name,
                      size: 80,
                      borderRadius: 16,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            profile.name,
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: _orgPrimaryText(context),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (_orgGenderMark(profile.gender) != null) ...[
                          const SizedBox(width: 6),
                          _OrgGenderIcon(
                            isMale: _orgGenderMark(profile.gender)!,
                          ),
                        ],
                      ],
                    ),
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
                    const SizedBox(height: 6),
                    Text(
                      '泡泡号：${profile.bubbleId}',
                      style: TextStyle(
                          fontSize: 13, color: _orgSecondaryText(context)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              _OrgProfileActionRow(
                icon: Icons.badge_outlined,
                label: '朋友资料',
                onTap: () => context.push('/profile/${widget.userId}'),
              ),
              const SizedBox(height: 8),
              if (!isMe)
                Container(
                  color: Theme.of(context).colorScheme.surface,
                  child: canDirectMessage
                      ? Column(
                          children: [
                            _OrgProfileActionRow(
                              icon: Icons.chat_bubble_outline,
                              label: AppLocalizations.of(context)
                                  .profilePageSendMessage,
                              iconColor: const Color(0xFF00B27A),
                              onTap: () => _openChat(context, profile),
                            ),
                            _OrgProfileActionRow(
                              icon: Icons.call_outlined,
                              label: '音视频通话',
                              iconColor: const Color(0xFF00B27A),
                              showDivider: false,
                              onTap: () => _showCallOptions(context, profile),
                            ),
                          ],
                        )
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              try {
                                final dio = ref.read(dioProvider);
                                await dio.post('/api/client/v1/friends/request',
                                    data: {'toUserId': widget.userId});
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('已发送好友申请')));
                                }
                              } catch (_) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                          content: Text('发送失败，请重试')));
                                }
                              }
                            },
                            icon: const Icon(Icons.person_add, size: 18),
                            label: const Text('添加好友'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00B27A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                ),
            ],
          ),
        );
      },
    );
  }
}

bool? _orgGenderMark(String? value) {
  final normalized = value?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return null;
  if (normalized == 'male' || normalized == '男' || normalized == '男性') {
    return true;
  }
  if (normalized == 'female' || normalized == '女' || normalized == '女性') {
    return false;
  }
  return null;
}

class _OrgGenderIcon extends StatelessWidget {
  final bool isMale;

  const _OrgGenderIcon({required this.isMale});

  @override
  Widget build(BuildContext context) {
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

class _OrgProfileActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color iconColor;
  final bool showDivider;

  const _OrgProfileActionRow({
    required this.icon,
    required this.label,
    this.onTap,
    this.iconColor = Colors.grey,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        color: Theme.of(context).colorScheme.surface,
        child: Row(
          children: [
            Icon(icon, size: 22, color: iconColor),
            const SizedBox(width: 14),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 15),
                decoration: BoxDecoration(
                  border: showDivider
                      ? Border(
                          bottom: BorderSide(
                            color: Theme.of(context).dividerColor,
                          ),
                        )
                      : null,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 16,
                          color: _orgPrimaryText(context),
                        ),
                      ),
                    ),
                    Icon(Icons.chevron_right,
                        color: _orgHintText(context), size: 20),
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

class _OrgActionSheetItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool isCancel;

  const _OrgActionSheetItem({
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
              color: isCancel
                  ? _orgPrimaryText(context)
                  : Theme.of(context).colorScheme.primary,
              fontWeight: isCancel ? FontWeight.w500 : FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}
