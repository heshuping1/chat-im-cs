import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/space/presentation/providers/tenant_features_provider.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

// ---------------------------------------------------------------------------
// Pinyin initial helper (simplified)
// ---------------------------------------------------------------------------

String _pinyinInitial(String name) {
  if (name.isEmpty) return '#';
  final char = name[0];
  final code = char.codeUnitAt(0);
  if (code >= 65 && code <= 90) return char;
  if (code >= 97 && code <= 122) return char.toUpperCase();
  // Simplified Chinese → pinyin initial mapping
  const map = {
    '张': 'Z',
    '李': 'L',
    '王': 'W',
    '刘': 'L',
    '陈': 'C',
    '杨': 'Y',
    '赵': 'Z',
    '黄': 'H',
    '周': 'Z',
    '吴': 'W',
    '徐': 'X',
    '孙': 'S',
    '胡': 'H',
    '朱': 'Z',
    '高': 'G',
    '林': 'L',
    '何': 'H',
    '郭': 'G',
    '马': 'M',
    '罗': 'L',
    '梁': 'L',
    '宋': 'S',
    '郑': 'Z',
    '谢': 'X',
    '韩': 'H',
    '唐': 'T',
    '冯': 'F',
    '于': 'Y',
    '董': 'D',
    '程': 'C',
    '曹': 'C',
    '袁': 'Y',
    '邓': 'D',
    '许': 'X',
    '傅': 'F',
    '沈': 'S',
    '曾': 'Z',
    '彭': 'P',
    '吕': 'L',
    '苏': 'S',
    '卢': 'L',
    '蒋': 'J',
    '蔡': 'C',
    '贾': 'J',
    '丁': 'D',
    '魏': 'W',
    '薛': 'X',
    '叶': 'Y',
    '余': 'Y',
    '潘': 'P',
    '杜': 'D',
    '戴': 'D',
    '夏': 'X',
    '钟': 'Z',
    '汪': 'W',
    '田': 'T',
    '任': 'R',
    '姜': 'J',
    '范': 'F',
    '方': 'F',
    '石': 'S',
    '姚': 'Y',
    '谭': 'T',
    '廖': 'L',
    '邹': 'Z',
    '金': 'J',
    '陆': 'L',
    '孔': 'K',
    '白': 'B',
    '崔': 'C',
    '康': 'K',
    '毛': 'M',
    '秦': 'Q',
    '江': 'J',
    '史': 'S',
    '顾': 'G',
    '侯': 'H',
    '孟': 'M',
    '龙': 'L',
    '万': 'W',
    '段': 'D',
    '钱': 'Q',
    '汤': 'T',
    '尹': 'Y',
    '黎': 'L',
    '易': 'Y',
    '常': 'C',
    '武': 'W',
    '贺': 'H',
    '龚': 'G',
    '文': 'W',
    '小': 'X',
    '明': 'M',
    '伟': 'W',
    '芳': 'F',
    '静': 'J',
    '华': 'H',
    '强': 'Q',
    '军': 'J',
    '敏': 'M',
    '杰': 'J',
    '涛': 'T',
    '超': 'C',
    '磊': 'L',
    '平': 'P',
    '刚': 'G',
    '鹏': 'P',
    '辉': 'H',
    '洋': 'Y',
    '斌': 'B',
    '客': 'K',
    '专': 'Z',
  };
  return map[char] ?? '#';
}

List<MapEntry<String, List<Contact>>> _groupByInitial(List<Contact> contacts) {
  final groups = <String, List<Contact>>{};
  for (final c in contacts) {
    final letter = _pinyinInitial(c.displayName);
    groups.putIfAbsent(letter, () => []).add(c);
  }
  final sorted = groups.entries.toList()
    ..sort((a, b) {
      if (a.key == '#') return 1;
      if (b.key == '#') return -1;
      return a.key.compareTo(b.key);
    });
  return sorted;
}

bool _contactsIsDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _contactsPrimaryText(BuildContext context) => _contactsIsDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1C1C1E);

Color _contactsSecondaryText(BuildContext context) => _contactsIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _contactsHintText(BuildContext context) => _contactsIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.42)
    : const Color(0xFFAEAEB2);

Color _contactsChevron(BuildContext context) => _contactsIsDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.34)
    : const Color(0xFFC7C7CC);

// ---------------------------------------------------------------------------
// ContactsPage
// ---------------------------------------------------------------------------

class ContactsPage extends ConsumerWidget {
  const ContactsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(effectiveCurrentSpaceProvider);

    if (space == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: Text(
          AppLocalizations.of(context).contactsTitle,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: _contactsPrimaryText(context),
          ),
        ),
        centerTitle: true,
      ),
      body: _buildBody(space),
    );
  }

  Widget _buildBody(SpaceContext space) {
    if (space.isEmployee) return _EmployeeContactsView(space: space);
    if (space.isCustomer) return _CustomerContactsView(space: space);
    return _PersonalContactsView(space: space);
  }
}

// ---------------------------------------------------------------------------
// Personal space view
// ---------------------------------------------------------------------------

class _PersonalContactsView extends ConsumerStatefulWidget {
  final SpaceContext space;
  const _PersonalContactsView({required this.space});

  @override
  ConsumerState<_PersonalContactsView> createState() =>
      _PersonalContactsViewState();
}

class _PersonalContactsViewState extends ConsumerState<_PersonalContactsView> {
  @override
  void initState() {
    super.initState();
    // 不在 initState 里 invalidate，FriendsNotifier 已经实现本地优先 + 后台静默刷新
    // invalidate 会重置为 loading 状态，导致头像闪烁消失
  }

  @override
  Widget build(BuildContext context) {
    final friendsAsync = ref.watch(friendsProvider);

    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: () async {
        await ref.read(friendsProvider.notifier).refresh();
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          const SliverToBoxAdapter(child: _SearchBar()),
          SliverToBoxAdapter(
            child: _QuickActionCard(
              actions: [
                _QuickAction(
                  icon: Icons.person_add_outlined,
                  label: AppLocalizations.of(context).contactsNewFriends,
                  onTap: () => context.push('/new-friends'),
                ),
                _QuickAction(
                  icon: Icons.group_outlined,
                  label: AppLocalizations.of(context).contactsGroups,
                  onTap: () => context.push('/admin/groups'),
                ),
                _QuickAction(
                  icon: Icons.star_outline,
                  label: AppLocalizations.of(context).contactsFavorites,
                  onTap: () => context.push('/favorites'),
                ),
                _QuickAction(
                  icon: Icons.access_time_outlined,
                  label: AppLocalizations.of(context).contactsRecent,
                  onTap: () => context.push('/recent'),
                ),
              ],
            ),
          ),
          friendsAsync.when(
            data: (friends) => _ContactListSliver(contacts: friends),
            loading: () => const SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              )),
            ),
            error: (e, _) => SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(AppLocalizations.of(context).commonLoadFailed,
                    style: TextStyle(color: _contactsSecondaryText(context))),
              )),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Employee space view
// ---------------------------------------------------------------------------

class _EmployeeContactsView extends ConsumerStatefulWidget {
  final SpaceContext space;
  const _EmployeeContactsView({required this.space});

  @override
  ConsumerState<_EmployeeContactsView> createState() =>
      _EmployeeContactsViewState();
}

class _EmployeeContactsViewState extends ConsumerState<_EmployeeContactsView> {
  final _searchController = TextEditingController();
  final _searchDebouncer = Debouncer();
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
    final membersAsync = ref.watch(tenantMembersProvider); // 企业成员（员工）
    final friendsAsync = ref.watch(friendsProvider); // 好友（客户）
    final canSeeCustomers = AppPermissions.canSeeCustomers(widget.space);
    final isAdminOrAbove = AppPermissions.canSeeAllCustomers(widget.space);

    if (isAdminOrAbove) {
      return _AdminContactsView(
        space: widget.space,
        membersAsync: membersAsync,
        query: _query,
        onQueryChanged: _onSearchChanged,
        onRefresh: () async {
          await Future.wait([
            ref.read(tenantMembersProvider.notifier).refresh(),
            ref.read(friendsProvider.notifier).refresh(),
          ]);
        },
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: () async {
        await Future.wait([
          ref.read(tenantMembersProvider.notifier).refresh(),
          ref.read(friendsProvider.notifier).refresh(),
        ]);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _SearchBar(
              controller: _searchController,
              onChanged: _onSearchChanged,
            ),
          ),
          if (widget.space.isCustomerService)
            const SliverToBoxAdapter(
              child: _CustomerServiceQuickList(),
            ),
          if (widget.space.isCustomerService)
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
          // 我的客户：普通员工/客服只展示自己权限内客户。
          if (canSeeCustomers) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isAdminOrAbove
                          ? AppLocalizations.of(context).contactsAllCustomers
                          : AppLocalizations.of(context).contactsMyCustomers,
                      style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.5)),
                    ),
                    GestureDetector(
                      onTap: () => context.push('/my-customers'),
                      child: Text(
                        AppLocalizations.of(context).contactsViewAll,
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFF00B27A)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (isAdminOrAbove)
              // 管理员/所有者：从企业成员列表过滤客户
              membersAsync.when(
                data: (members) {
                  final customers = members
                      .where((m) => m.isCustomer)
                      .where((m) =>
                          _query.isEmpty || m.displayName.contains(_query))
                      .toList();
                  if (customers.isEmpty) {
                    return SliverToBoxAdapter(child: _EmptyCustomers());
                  }
                  return _ContactListSliver(contacts: customers);
                },
                loading: () => const SliverToBoxAdapter(
                  child: Center(
                      child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  )),
                ),
                error: (_, __) => SliverToBoxAdapter(
                  child: Center(
                      child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(AppLocalizations.of(context).commonLoadFailed,
                        style:
                            TextStyle(color: _contactsSecondaryText(context))),
                  )),
                ),
              )
            else
              // 客服：从好友列表获取（分配给自己的客户）
              friendsAsync.when(
                data: (friends) {
                  final filtered = _query.isEmpty
                      ? friends
                      : friends
                          .where((c) => c.displayName.contains(_query))
                          .toList();
                  if (filtered.isEmpty) {
                    return SliverToBoxAdapter(child: _EmptyCustomers());
                  }
                  return _ContactListSliver(contacts: filtered);
                },
                loading: () => const SliverToBoxAdapter(
                  child: Center(
                      child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  )),
                ),
                error: (_, __) => SliverToBoxAdapter(
                  child: Center(
                      child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(AppLocalizations.of(context).commonLoadFailed,
                        style:
                            TextStyle(color: _contactsSecondaryText(context))),
                  )),
                ),
              ),
          ],
          if (!widget.space.isCustomerService)
            SliverToBoxAdapter(
              child: _QuickActionCard(
                actions: [
                  _QuickAction(
                    icon: Icons.account_tree_outlined,
                    label: AppLocalizations.of(context).contactsOrganization,
                    onTap: () => context.push('/organization'),
                  ),
                  _QuickAction(
                    icon: Icons.person_add_alt_1_outlined,
                    label: '好友申请',
                    onTap: () => context.push('/new-friends'),
                  ),
                  _QuickAction(
                    icon: Icons.group_add_outlined,
                    label: '群申请',
                    onTap: () => _showUnavailable(
                      context,
                      '群申请列表需要服务端提供全局群申请接口',
                    ),
                  ),
                  _QuickAction(
                    icon: Icons.forum_outlined,
                    label: AppLocalizations.of(context).contactsGroups,
                    onTap: () => context.push('/group-list'),
                  ),
                  _QuickAction(
                    icon: Icons.schedule_outlined,
                    label: '最近活跃',
                    onTap: () => _showUnavailable(
                      context,
                      '最近活跃客户需要服务端提供客户活跃接口',
                    ),
                  ),
                ],
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _AdminContactsView extends StatelessWidget {
  final SpaceContext space;
  final AsyncValue<List<Contact>> membersAsync;
  final String query;
  final ValueChanged<String> onQueryChanged;
  final Future<void> Function() onRefresh;

  const _AdminContactsView({
    required this.space,
    required this.membersAsync,
    required this.query,
    required this.onQueryChanged,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final canManageCustomers = AppPermissions.canSeeCustomerOverview(space);
    final customerCount = membersAsync.valueOrNull
        ?.where((m) =>
            (m.isCustomer || m.customerTag == '客户') &&
            (query.isEmpty || m.displayName.contains(query.trim())))
        .length;
    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _SearchBar(
              onChanged: onQueryChanged,
            ),
          ),
          SliverToBoxAdapter(
            child: _AdminQuickList(
              space: space,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        canManageCustomers ? '客户' : '全部客户',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: _contactsPrimaryText(context),
                        ),
                      ),
                      if (customerCount != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '$customerCount人',
                          style: TextStyle(
                            fontSize: 13,
                            color: _contactsSecondaryText(context),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (!canManageCustomers)
                    GestureDetector(
                      onTap: () => context.push('/my-customers'),
                      child: const Text(
                        '查看全部',
                        style:
                            TextStyle(fontSize: 13, color: Color(0xFF00B27A)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          membersAsync.when(
            data: (members) {
              final customers = members
                  .where((m) => m.isCustomer || m.customerTag == '客户')
                  .where((m) =>
                      query.isEmpty || m.displayName.contains(query.trim()))
                  .toList();
              if (customers.isEmpty) {
                return SliverToBoxAdapter(child: _EmptyCustomers());
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final customer = customers[index];
                    return Padding(
                      padding: EdgeInsets.fromLTRB(
                        16,
                        index == 0 ? 0 : 1,
                        16,
                        0,
                      ),
                      child: _AdminCustomerTile(customer: customer),
                    );
                  },
                  childCount: customers.length > 8 ? 8 : customers.length,
                ),
              );
            },
            loading: () => const SliverToBoxAdapter(
              child: _AdminCustomersLoading(),
            ),
            error: (_, __) => SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    '加载失败',
                    style: TextStyle(color: _contactsSecondaryText(context)),
                  ),
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 18)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '企业成员',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: _contactsPrimaryText(context),
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          membersAsync.when(
            data: (members) {
              final staff = members
                  .where((m) => m.customerTag != '客户' && !m.isCustomer)
                  .where((m) =>
                      query.isEmpty || m.displayName.contains(query.trim()))
                  .toList();
              if (staff.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }
              final preview = staff.take(5).toList();
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final contact = preview[index];
                    return _ContactTile(
                      contact: contact,
                      showDivider: index < preview.length - 1,
                    );
                  },
                  childCount: preview.length,
                ),
              );
            },
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, __) =>
                const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _AdminCustomersLoading extends StatelessWidget {
  const _AdminCustomersLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: CircularProgressIndicator(),
      ),
    );
  }
}

class _AdminQuickList extends StatelessWidget {
  final SpaceContext space;

  const _AdminQuickList({
    required this.space,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      _QuickAction(
        icon: Icons.account_tree_outlined,
        label: AppLocalizations.of(context).contactsOrganization,
        onTap: () => context.push(
          '/organization?title=${Uri.encodeComponent(AppLocalizations.of(context).contactsOrganization)}',
        ),
      ),
      _QuickAction(
        icon: Icons.person_add_alt_1_outlined,
        label: '好友申请',
        onTap: () => context.push('/new-friends'),
      ),
      _QuickAction(
        icon: Icons.group_add_outlined,
        label: '群申请',
        onTap: () => _showUnavailable(
          context,
          '群申请列表需要服务端提供全局群申请接口',
        ),
      ),
      _QuickAction(
        icon: Icons.forum_outlined,
        label: AppLocalizations.of(context).contactsGroups,
        onTap: () => context.push('/group-list'),
      ),
    ];

    return _QuickActionCard(actions: items);
  }
}

class _CustomerServiceQuickList extends StatelessWidget {
  const _CustomerServiceQuickList();

  @override
  Widget build(BuildContext context) {
    final items = [
      _QuickAction(
        icon: Icons.account_tree_outlined,
        label: AppLocalizations.of(context).contactsOrganization,
        onTap: () => context.push('/organization'),
      ),
      _QuickAction(
        icon: Icons.person_add_alt_1_outlined,
        label: '好友申请',
        onTap: () => context.push('/new-friends'),
      ),
      _QuickAction(
        icon: Icons.group_add_outlined,
        label: '群申请',
        onTap: () => _showUnavailable(
          context,
          '群申请列表需要服务端提供全局群申请接口',
        ),
      ),
      _QuickAction(
        icon: Icons.forum_outlined,
        label: AppLocalizations.of(context).contactsGroups,
        onTap: () => context.push('/group-list'),
      ),
    ];

    return _QuickActionCard(actions: items);
  }
}

class _AdminCustomerTile extends StatelessWidget {
  final Contact customer;

  const _AdminCustomerTile({required this.customer});

  @override
  Widget build(BuildContext context) {
    return Container(
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
              UserAvatar(
                avatarUrl: customer.avatarUrl,
                name: customer.displayName,
                size: 48,
                borderRadius: 12,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _contactsPrimaryText(context),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      customer.remark?.isNotEmpty == true
                          ? customer.remark!
                          : '负责客服：未分配',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: _contactsSecondaryText(context)),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: _contactsChevron(context), size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Customer space view
// ---------------------------------------------------------------------------

class _CustomerContactsView extends ConsumerWidget {
  final SpaceContext space;
  const _CustomerContactsView({required this.space});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 客户的联系人 = 好友列表（官方账号 + 分配的客服，由服务端自动建立好友关系）
    final friendsAsync = ref.watch(friendsProvider);
    final featuresAsync = ref.watch(tenantFeaturesProvider(space.spaceId));
    final canAddFriend =
        featuresAsync.valueOrNull?.isSocialMode ?? space.canAddFriend;
    final assignedStaffAsync = ref.watch(assignedStaffProvider);
    final assignedStaff = assignedStaffAsync.valueOrNull;

    return RefreshIndicator(
      color: const Color(0xFF00B27A),
      onRefresh: () async {
        ref.invalidate(friendsProvider);
        ref.invalidate(assignedStaffProvider);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          const SliverToBoxAdapter(child: _SearchBar()),
          SliverToBoxAdapter(
            child: _QuickActionCard(
              actions: [
                if (canAddFriend)
                  _QuickAction(
                    icon: Icons.person_add_outlined,
                    label: AppLocalizations.of(context).contactsNewFriends,
                    onTap: () => context.push('/new-friends'),
                  ),
                _QuickAction(
                  icon: Icons.support_agent_outlined,
                  label: AppLocalizations.of(context).contactsMyAdvisor,
                  onTap: () async {
                    if (assignedStaff != null) {
                      // 跳转到与客服的单聊
                      final dio = ref.read(dioProvider);
                      try {
                        final resp = await dio.post<Map<String, dynamic>>(
                          '/api/client/v1/direct-chats',
                          data: {'peerUserId': assignedStaff.userId},
                        );
                        final chatId = resp.data?['data']?['chatId']
                                as String? ??
                            resp.data?['data']?['conversationId'] as String?;
                        if (chatId != null && context.mounted) {
                          context.push('/chat/$chatId', extra: {
                            'title': assignedStaff.displayName,
                            'avatarUrl': assignedStaff.avatarUrl,
                            'isGroup': false,
                            'peerUserId': assignedStaff.userId,
                          });
                        }
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text(AppLocalizations.of(context)
                                    .contactsNavigateFailed)),
                          );
                        }
                      }
                    } else {
                      // assignedStaff 还在加载中或确实未分配
                      final isLoading = assignedStaffAsync.isLoading;
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(isLoading
                                  ? AppLocalizations.of(context)
                                      .contactsAdvisorLoading
                                  : AppLocalizations.of(context)
                                      .contactsNoAdvisor)),
                        );
                      }
                    }
                  },
                ),
                _QuickAction(
                  icon: Icons.forum_outlined,
                  label: AppLocalizations.of(context).contactsGroups,
                  onTap: () => context.push('/group-list'),
                ),
              ],
            ),
          ),
          // 联系人列表（官方账号 + 分配的客服，来自好友列表）
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Text(
                AppLocalizations.of(context).contactsMyContacts,
                style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5)),
              ),
            ),
          ),
          friendsAsync.when(
            data: (friends) {
              final visibleFriends = canAddFriend
                  ? friends
                  : friends.where((friend) => !friend.isCustomer).toList();
              if (visibleFriends.isEmpty) {
                return SliverToBoxAdapter(
                  child: Center(
                      child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(AppLocalizations.of(context).contactsEmpty,
                        style:
                            TextStyle(color: _contactsSecondaryText(context))),
                  )),
                );
              }
              return _ContactListSliver(
                  contacts: visibleFriends, showOfficialBadge: true);
            },
            loading: () => const SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              )),
            ),
            error: (_, __) => SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(AppLocalizations.of(context).commonLoadFailed,
                    style: TextStyle(color: _contactsSecondaryText(context))),
              )),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------

void _showUnavailable(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message)),
  );
}

class _SearchBar extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;

  const _SearchBar({this.controller, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: TextStyle(color: _contactsPrimaryText(context), fontSize: 15),
        cursorColor: const Color(0xFF00B27A),
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context).contactsSearch,
          hintStyle: TextStyle(color: _contactsHintText(context), fontSize: 15),
          prefixIcon:
              Icon(Icons.search, color: _contactsHintText(context), size: 20),
          filled: true,
          fillColor: Theme.of(context).colorScheme.surface,
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
            borderSide: const BorderSide(color: Color(0xFF00B27A)),
          ),
        ),
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });
}

class _QuickActionCard extends StatelessWidget {
  final List<_QuickAction> actions;

  const _QuickActionCard({required this.actions});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: actions.asMap().entries.map((entry) {
          final i = entry.key;
          final action = entry.value;
          return Column(
            children: [
              InkWell(
                onTap: action.onTap,
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF00B27A).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(action.icon,
                            color: const Color(0xFF00B27A), size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              action.label,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: _contactsPrimaryText(context),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (i < actions.length - 1)
                Divider(
                    height: 1,
                    indent: 72,
                    color: Theme.of(context).dividerColor),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _ContactListSliver extends StatelessWidget {
  final List<Contact> contacts;
  final bool showOfficialBadge;

  const _ContactListSliver({
    required this.contacts,
    this.showOfficialBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    final groups = _groupByInitial(contacts);

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          // Calculate which group/item we're in
          int offset = 0;
          for (final group in groups) {
            // header
            if (index == offset) {
              return Container(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
                child: Text(
                  group.key,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _contactsSecondaryText(context),
                  ),
                ),
              );
            }
            offset++;
            // items
            for (int i = 0; i < group.value.length; i++) {
              if (index == offset) {
                final contact = group.value[i];
                final isLast = i == group.value.length - 1;
                return _ContactTile(
                  contact: contact,
                  showOfficialBadge: showOfficialBadge,
                  showDivider: !isLast,
                );
              }
              offset++;
            }
          }
          return null;
        },
        childCount: groups.fold<int>(0, (sum, g) => sum + 1 + g.value.length),
      ),
    );
  }
}

class _ContactTile extends ConsumerWidget {
  final Contact contact;
  final bool showOfficialBadge;
  final bool showDivider;

  const _ContactTile({
    required this.contact,
    this.showOfficialBadge = false,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final space = ref.watch(currentSpaceProvider);
    final showIdentity = space != null && !space.isPersonal;
    final identity = showIdentity
        ? identityBadgeFor(
            userType: contact.userType,
            customerTag: contact.customerTag,
          )
        : null;
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          InkWell(
            onTap: () => context.push('/profile/${contact.userId}'),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  PersonAvatarWithBadge(
                    avatarUrl: contact.avatarUrl,
                    name: contact.displayName,
                    isOnline: contact.isOnline,
                    userType: contact.userType,
                    customerTag: contact.customerTag,
                    showIdentity: showIdentity,
                    size: 48,
                    borderRadius: 12,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              contact.displayName,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: _contactsPrimaryText(context),
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
                            if (showOfficialBadge) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFB800),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  AppLocalizations.of(context)
                                      .contactsOfficialBadge,
                                  style: TextStyle(
                                    fontSize: 10,
                                    color:
                                        Theme.of(context).colorScheme.surface,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (showDivider)
            Divider(
                height: 1, indent: 72, color: Theme.of(context).dividerColor),
        ],
      ),
    );
  }
}

class _EmptyCustomers extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(color: Color(0x14000000), blurRadius: 8),
              ],
            ),
            child:
                const Icon(Icons.qr_code_2, size: 36, color: Color(0xFF00B27A)),
          ),
          const SizedBox(height: 16),
          Text(
            '还没有客户',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: _contactsPrimaryText(context)),
          ),
          const SizedBox(height: 8),
          Text(
            '通过分享您的二维码或企业代码，邀请客户加入',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13,
                color: _contactsSecondaryText(context),
                height: 1.5),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => context.push('/qrcode'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00B27A),
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            ),
            child: const Text('分享我的二维码',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
