import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/app_toast.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

const _primary = Color(0xFF00B27A);

bool _isDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _primaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1C1C1E);

Color _secondaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _inputBorder(BuildContext context) =>
    _isDark(context) ? Theme.of(context).dividerColor : const Color(0xFFE5E5EA);

class CustomerOverviewPage extends ConsumerStatefulWidget {
  const CustomerOverviewPage({super.key});

  @override
  ConsumerState<CustomerOverviewPage> createState() =>
      _CustomerOverviewPageState();
}

class _CustomerOverviewPageState extends ConsumerState<CustomerOverviewPage> {
  final _searchDebouncer = Debouncer();
  String _query = '';
  _CustomerFilter _filter = _CustomerFilter.all;
  List<String> _selectedTags = const [];

  @override
  void dispose() {
    _searchDebouncer.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) {
        setState(() => _query = value);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(effectiveCurrentSpaceProvider);
    final canView = AppPermissions.canSeeCustomerOverview(space);
    final useAdminCustomerPool = space?.isAdminOrAbove ?? false;
    final adminCredentialAsync = useAdminCustomerPool && space != null
        ? ref.watch(adminManagementCredentialAvailableProvider(space.spaceId))
        : null;
    final membersAsync =
        useAdminCustomerPool ? null : ref.watch(tenantMembersProvider);
    final adminCustomerQuery = AdminCustomerQuery(
      keyword: _query.trim().isEmpty ? null : _query.trim(),
      tags: _selectedTags,
    );
    final adminCustomersAsync =
        useAdminCustomerPool && adminCredentialAsync?.valueOrNull == true
            ? ref.watch(adminCustomersProvider(adminCustomerQuery))
            : null;
    final adminTagSourceAsync =
        useAdminCustomerPool && adminCredentialAsync?.valueOrNull == true
            ? ref.watch(adminCustomersProvider(const AdminCustomerQuery()))
            : null;

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 18, color: _primaryText(context)),
          onPressed: () => context.pop(),
        ),
        title: Text(
          '客户管理',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: _primaryText(context),
          ),
        ),
      ),
      body: !canView
          ? _NoPermissionView()
          : useAdminCustomerPool
              ? adminCredentialAsync!.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: _primary),
                  ),
                  error: (_, __) => _buildAdminCustomerBody(
                    const [],
                    query: adminCustomerQuery,
                    tagSourceCustomers: const [],
                    dataUnavailable: true,
                  ),
                  data: (available) {
                    if (!available) {
                      return _buildAdminCustomerBody(
                        const [],
                        query: adminCustomerQuery,
                        tagSourceCustomers: const [],
                        dataUnavailable: true,
                      );
                    }
                    return adminCustomersAsync!.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(color: _primary),
                      ),
                      error: (e, _) => _buildAdminCustomerBody(
                        const [],
                        query: adminCustomerQuery,
                        tagSourceCustomers: const [],
                        dataUnavailable: true,
                      ),
                      data: (customers) => _buildAdminCustomerBody(
                        customers,
                        query: adminCustomerQuery,
                        tagSourceCustomers:
                            adminTagSourceAsync?.valueOrNull ?? customers,
                      ),
                    );
                  },
                )
              : membersAsync!.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: _primary),
                  ),
                  error: (e, _) => Center(
                    child: Text(
                      '加载失败：$e',
                      style: TextStyle(color: _secondaryText(context)),
                    ),
                  ),
                  data: (members) {
                    final customers = members
                        .where((m) => m.isCustomer || m.customerTag == '客户')
                        .toList();
                    final searchedCustomers = _query.trim().isEmpty
                        ? customers
                        : customers
                            .where(
                              (customer) => customer.displayName
                                  .toLowerCase()
                                  .contains(_query.trim().toLowerCase()),
                            )
                            .toList();
                    final filteredCustomers = _filter == _CustomerFilter.all
                        ? searchedCustomers
                        : const <Contact>[];
                    return RefreshIndicator(
                      color: _primary,
                      onRefresh: () async {
                        await Future.wait([
                          ref.read(tenantMembersProvider.notifier).refresh(),
                        ]);
                      },
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        itemCount: 8 +
                            (filteredCustomers.isEmpty
                                ? 1
                                : filteredCustomers.length),
                        itemBuilder: (context, index) {
                          switch (index) {
                            case 0:
                              return _CustomerSearchField(
                                onChanged: _onSearchChanged,
                              );
                            case 1:
                              return const SizedBox(height: 12);
                            case 2:
                              return _CustomerOverviewCard(
                                totalCustomers: customers.length,
                                visibleCustomers: filteredCustomers.length,
                                dataUnavailable: _filter != _CustomerFilter.all,
                              );
                            case 3:
                              return const SizedBox(height: 12);
                            case 4:
                              return _CustomerFilterActions(
                                filter: _filter,
                                onFilterChanged: (filter) {
                                  if (filter != _CustomerFilter.all) {
                                    AppToast.missingApi(
                                      context,
                                      filter == _CustomerFilter.assigned
                                          ? '已分配客户列表'
                                          : '未分配客户列表',
                                    );
                                  }
                                  setState(() => _filter = filter);
                                },
                              );
                            case 5:
                              return const SizedBox(height: 18);
                            case 6:
                              return _SectionHeader(
                                title: '客户',
                                count: filteredCustomers.length,
                              );
                            case 7:
                              return const SizedBox(height: 8);
                          }
                          if (filteredCustomers.isEmpty) {
                            return _EmptyCustomers(filter: _filter);
                          }
                          final customer = filteredCustomers[index - 8];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 1),
                            child: _CustomerTile(customer: customer),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildAdminCustomerBody(
    List<AdminCustomer> customers, {
    required AdminCustomerQuery query,
    required List<AdminCustomer> tagSourceCustomers,
    bool dataUnavailable = false,
  }) {
    final searchedCustomers = customers;
    final filteredCustomers = switch (_filter) {
      _CustomerFilter.all => searchedCustomers,
      _CustomerFilter.assigned =>
        searchedCustomers.where((customer) => !customer.isUnassigned).toList(),
      _CustomerFilter.unassigned =>
        searchedCustomers.where((customer) => customer.isUnassigned).toList(),
    };
    final tagOptions = _collectCustomerTags(tagSourceCustomers);
    final unassignedCount =
        tagSourceCustomers.where((customer) => customer.isUnassigned).length;
    final assignedCount = tagSourceCustomers.length - unassignedCount;

    return RefreshIndicator(
      color: _primary,
      onRefresh: () async {
        ref.invalidate(adminCustomersProvider);
        ref.invalidate(adminDirectCustomerThreadsProvider(true));
        ref.invalidate(adminCustomerServiceDashboardProvider);
        try {
          await ref.read(adminCustomersProvider(query).future);
        } catch (_) {}
      },
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount:
            8 + (filteredCustomers.isEmpty ? 1 : filteredCustomers.length),
        itemBuilder: (context, index) {
          switch (index) {
            case 0:
              return _CustomerSearchField(
                onChanged: _onSearchChanged,
              );
            case 1:
              return const SizedBox(height: 12);
            case 2:
              return _CustomerOverviewCard(
                totalCustomers: tagSourceCustomers.length,
                visibleCustomers: filteredCustomers.length,
                assignedCustomers: assignedCount,
                unassignedCustomers: unassignedCount,
                dataUnavailable: dataUnavailable,
              );
            case 3:
              return const SizedBox(height: 12);
            case 4:
              return _CustomerFilterActions(
                filter: _filter,
                selectedTags: _selectedTags,
                onTagTap: () => _showTagFilterSheet(tagOptions),
                onClearTags: _selectedTags.isEmpty
                    ? null
                    : () => setState(() => _selectedTags = const []),
                onFilterChanged: (filter) => setState(() => _filter = filter),
              );
            case 5:
              return const SizedBox(height: 18);
            case 6:
              return _SectionHeader(
                title: '客户',
                count: filteredCustomers.length,
              );
            case 7:
              return const SizedBox(height: 8);
          }
          if (filteredCustomers.isEmpty) {
            return _EmptyCustomers(
              filter: _filter,
              dataUnavailable: dataUnavailable,
            );
          }
          final customer = filteredCustomers[index - 8];
          return Padding(
            padding: const EdgeInsets.only(bottom: 1),
            child: _AdminCustomerTile(
              customer: customer,
              onAssign: () => _showAssignCustomerSheet(customer),
            ),
          );
        },
      ),
    );
  }

  List<String> _collectCustomerTags(List<AdminCustomer> customers) {
    final tags = <String>{};
    for (final customer in customers) {
      for (final tag in customer.tags) {
        final value = tag.trim();
        if (value.isNotEmpty) tags.add(value);
      }
    }
    final sorted = tags.toList()..sort();
    return sorted;
  }

  Future<void> _showTagFilterSheet(List<String> tagOptions) async {
    final selected = await showModalBottomSheet<List<String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CustomerTagFilterSheet(
        tagOptions: tagOptions,
        selectedTags: _selectedTags,
      ),
    );
    if (!mounted || selected == null) return;
    setState(() => _selectedTags = selected);
  }

  Future<void> _showAssignCustomerSheet(AdminCustomer customer) async {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AssignCustomerLoadingSheet(),
    );

    AdminCustomerDetail detail;
    try {
      detail = await ref
          .read(adminCustomerServiceRepositoryProvider)
          .getCustomerDetail(customer.userId);
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop();
      AppToast.error(context, '加载可分配客服失败');
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pop();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _AssignCustomerSheet(
        customer: detail,
        onAssign: (staffUserId) async {
          Navigator.of(sheetContext).pop();
          await _assignCustomer(customer.userId, staffUserId);
        },
      ),
    );
  }

  Future<void> _assignCustomer(
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
      if (!mounted) return;
      AppToast.success(context, staffUserId == null ? '已按规则自动分配' : '已分配客服');
    } catch (e) {
      if (!mounted) return;
      AppToast.error(context, '分配客服失败');
    }
  }
}

enum _CustomerFilter { all, assigned, unassigned }

class _CustomerOverviewCard extends StatelessWidget {
  final int totalCustomers;
  final int visibleCustomers;
  final int? assignedCustomers;
  final int? unassignedCustomers;
  final bool dataUnavailable;

  const _CustomerOverviewCard({
    required this.totalCustomers,
    required this.visibleCustomers,
    this.assignedCustomers,
    this.unassignedCustomers,
    this.dataUnavailable = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
              const Icon(Icons.people_alt_outlined,
                  size: 20, color: Color(0xFF00B27A)),
              const SizedBox(width: 8),
              Text(
                '客户概览',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _primaryText(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _OverviewMetric(label: '客户', value: totalCustomers)),
              Expanded(
                  child:
                      _OverviewMetric(label: '当前筛选', value: visibleCustomers)),
              Expanded(
                child: _OverviewMetric(
                  label: '已分配',
                  value: dataUnavailable ? null : assignedCustomers,
                ),
              ),
              Expanded(
                child: _OverviewMetric(
                  label: '未分配',
                  value: dataUnavailable ? null : unassignedCustomers,
                ),
              ),
            ],
          ),
          if (dataUnavailable) ...[
            const SizedBox(height: 12),
            Text(
              '统计接口待接入，当前先展示客户管理界面结构。',
              style: TextStyle(fontSize: 12, color: _secondaryText(context)),
            ),
          ],
        ],
      ),
    );
  }
}

class _OverviewMetric extends StatelessWidget {
  final String label;
  final int? value;

  const _OverviewMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value?.toString() ?? '--',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: _primaryText(context),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: _secondaryText(context),
          ),
        ),
      ],
    );
  }
}

class _CustomerFilterActions extends StatelessWidget {
  final _CustomerFilter filter;
  final ValueChanged<_CustomerFilter> onFilterChanged;
  final List<String> selectedTags;
  final VoidCallback? onTagTap;
  final VoidCallback? onClearTags;

  const _CustomerFilterActions({
    required this.filter,
    required this.onFilterChanged,
    this.selectedTags = const [],
    this.onTagTap,
    this.onClearTags,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _FilterChip(
            label: '全部',
            selected: filter == _CustomerFilter.all,
            onTap: () => onFilterChanged(_CustomerFilter.all),
          ),
          _FilterChip(
            label: '已分配',
            selected: filter == _CustomerFilter.assigned,
            onTap: () => onFilterChanged(_CustomerFilter.assigned),
          ),
          _FilterChip(
            label: '未分配',
            selected: filter == _CustomerFilter.unassigned,
            onTap: () => onFilterChanged(_CustomerFilter.unassigned),
          ),
          if (onTagTap != null)
            _FilterChip(
              label: selectedTags.isEmpty
                  ? '标签筛选'
                  : '标签：${_selectedTagsLabel(selectedTags)}',
              selected: selectedTags.isNotEmpty,
              onTap: onTagTap!,
            ),
          if (onClearTags != null)
            _FilterChip(
              label: '清空标签',
              selected: false,
              onTap: onClearTags!,
            ),
        ],
      ),
    );
  }

  String _selectedTagsLabel(List<String> tags) {
    if (tags.length <= 2) return tags.join('、');
    return '${tags.take(2).join('、')} +${tags.length - 2}';
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? _primary.withValues(alpha: 0.12)
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? _primary : _secondaryText(context),
          ),
        ),
      ),
    );
  }
}

class _CustomerTagFilterSheet extends StatefulWidget {
  final List<String> tagOptions;
  final List<String> selectedTags;

  const _CustomerTagFilterSheet({
    required this.tagOptions,
    required this.selectedTags,
  });

  @override
  State<_CustomerTagFilterSheet> createState() =>
      _CustomerTagFilterSheetState();
}

class _CustomerTagFilterSheetState extends State<_CustomerTagFilterSheet> {
  late final Set<String> _selected = {...widget.selectedTags};

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '标签筛选',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: _primaryText(context),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(
                    Icons.close,
                    size: 20,
                    color: _secondaryText(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (widget.tagOptions.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 34),
                child: Center(
                  child: Text(
                    '暂无客户标签',
                    style: TextStyle(
                      fontSize: 14,
                      color: _secondaryText(context),
                    ),
                  ),
                ),
              )
            else
              Flexible(
                child: SingleChildScrollView(
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: widget.tagOptions.map((tag) {
                      final selected = _selected.contains(tag);
                      return _FilterChip(
                        label: tag,
                        selected: selected,
                        onTap: () {
                          setState(() {
                            if (selected) {
                              _selected.remove(tag);
                            } else {
                              _selected.add(tag);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
              ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(const []),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _secondaryText(context),
                      side: BorderSide(color: _inputBorder(context)),
                    ),
                    child: const Text('重置'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      final result = _selected.toList()..sort();
                      Navigator.of(context).pop(result);
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: _primary,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('确定'),
                  ),
                ),
              ],
            ),
          ],
        ),
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
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: _primaryText(context),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '$count人',
              style: TextStyle(
                fontSize: 13,
                color: _secondaryText(context),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _CustomerSearchField extends StatelessWidget {
  final ValueChanged<String> onChanged;

  const _CustomerSearchField({required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      onChanged: onChanged,
      style: TextStyle(color: _primaryText(context), fontSize: 15),
      cursorColor: _primary,
      decoration: InputDecoration(
        hintText: '搜索客户',
        hintStyle: TextStyle(color: _secondaryText(context), fontSize: 15),
        prefixIcon:
            Icon(Icons.search, color: _secondaryText(context), size: 20),
        filled: true,
        fillColor: Theme.of(context).colorScheme.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _inputBorder(context)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _inputBorder(context)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF00B27A)),
        ),
      ),
    );
  }
}

class _CustomerTile extends StatelessWidget {
  final Contact customer;

  const _CustomerTile({required this.customer});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: () => context.push(
          '/profile/${customer.userId}',
          extra: {'adminCustomerView': true},
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              PersonAvatarWithBadge(
                avatarUrl: customer.avatarUrl,
                name: customer.displayName,
                userType: customer.userType,
                customerTag: customer.customerTag,
                size: 44,
                borderRadius: 11,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            customer.displayName,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: _primaryText(context),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const IdentityBadge(
                          label: '客户',
                          tone: IdentityBadgeTone.customer,
                          compact: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      customer.remark?.isNotEmpty == true
                          ? customer.remark!
                          : '负责客服：未分配',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: _secondaryText(context)),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.28),
                  size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminCustomerTile extends StatelessWidget {
  final AdminCustomer customer;
  final VoidCallback onAssign;

  const _AdminCustomerTile({
    required this.customer,
    required this.onAssign,
  });

  @override
  Widget build(BuildContext context) {
    final assignedName = customer.assignedStaffDisplayName;
    final subtitle = customer.isUnassigned ? '负责客服：未分配' : '负责客服：$assignedName';
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: () => context.push(
          '/profile/${customer.userId}',
          extra: {'adminCustomerView': true},
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              PersonAvatarWithBadge(
                avatarUrl: customer.avatarUrl,
                name: customer.displayName,
                userType: 1,
                customerTag: '客户',
                size: 44,
                borderRadius: 11,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            customer.displayName,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: _primaryText(context),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const IdentityBadge(
                          label: '客户',
                          tone: IdentityBadgeTone.customer,
                          compact: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: _secondaryText(context),
                      ),
                    ),
                    if (customer.tags.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      _CustomerTagsPreview(tags: customer.tags),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 58),
                child: TextButton(
                  onPressed: onAssign,
                  style: TextButton.styleFrom(
                    foregroundColor: _primary,
                    minimumSize: const Size(54, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    customer.isUnassigned ? '分配' : '改分配',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.28),
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomerTagsPreview extends StatelessWidget {
  final List<String> tags;

  const _CustomerTagsPreview({required this.tags});

  @override
  Widget build(BuildContext context) {
    final visibleTags = tags.take(3).toList(growable: false);
    final extraCount = tags.length - visibleTags.length;
    return Wrap(
      spacing: 6,
      runSpacing: 4,
      children: [
        ...visibleTags.map(
          (tag) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: _primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              tag,
              style: const TextStyle(
                fontSize: 11,
                color: _primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        if (extraCount > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '+$extraCount',
              style: TextStyle(
                fontSize: 11,
                color: _secondaryText(context),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }
}

class _EmptyCustomers extends StatelessWidget {
  final _CustomerFilter filter;
  final bool dataUnavailable;

  const _EmptyCustomers({
    required this.filter,
    this.dataUnavailable = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 38),
      alignment: Alignment.center,
      child: Text(
        dataUnavailable
            ? '数据接口待接入，暂无可展示数据'
            : switch (filter) {
                _CustomerFilter.assigned => '暂无已分配客户',
                _CustomerFilter.unassigned => '暂无未分配客户',
                _CustomerFilter.all => '暂无客户',
              },
        style: TextStyle(fontSize: 14, color: _secondaryText(context)),
      ),
    );
  }
}

class _AssignCustomerLoadingSheet extends StatelessWidget {
  const _AssignCustomerLoadingSheet();

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

class _AssignCustomerSheet extends StatelessWidget {
  final AdminCustomerDetail customer;
  final ValueChanged<String?> onAssign;

  const _AssignCustomerSheet({
    required this.customer,
    required this.onAssign,
  });

  @override
  Widget build(BuildContext context) {
    final staffList = customer.customerService.assignableStaff;
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
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
                        color: _primaryText(context),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close,
                      color: _secondaryText(context),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            _AssignRow(
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
                    color: _secondaryText(context),
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
                    return _AssignRow(
                      title: staff.displayName,
                      subtitle: staff.lppId?.isNotEmpty == true
                          ? '星络号：${staff.lppId}'
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

class _AssignRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _AssignRow({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
                      color: _primaryText(context),
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
                        color: _secondaryText(context),
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

class _NoPermissionView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        '仅企业管理员和所有者可查看客户管理',
        style: TextStyle(fontSize: 15, color: _secondaryText(context)),
      ),
    );
  }
}
