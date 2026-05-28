import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/permissions/app_permissions.dart';
import 'package:lpp_mobile/core/utils/debouncer.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/person_avatar_with_badge.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/contacts/domain/entities/contact.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';

bool _isDark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

Color _primaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface
    : const Color(0xFF1C1C1E);

Color _secondaryText(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62)
    : const Color(0xFF8E8E93);

Color _chevronColor(BuildContext context) => _isDark(context)
    ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.34)
    : const Color(0xFFC7C7CC);

// ---------------------------------------------------------------------------
// 员工端「我的客户」页面
// 管理员/所有者：从 tenantMembersProvider 过滤 customerTag='客户' 的成员
// 客服：从 friendsProvider 获取（分配给自己的客户）
class MyCustomersPage extends ConsumerStatefulWidget {
  const MyCustomersPage({super.key});

  @override
  ConsumerState<MyCustomersPage> createState() => _MyCustomersPageState();
}

class _MyCustomersPageState extends ConsumerState<MyCustomersPage> {
  final _searchDebouncer = Debouncer();
  String _query = '';

  @override
  void dispose() {
    _searchDebouncer.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebouncer.run(() {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final space = ref.watch(effectiveCurrentSpaceProvider);
    final isAdminOrAbove = AppPermissions.canSeeAllCustomers(space);

    // 管理员/所有者：从企业成员列表过滤客户
    // 客服：从好友列表获取（分配给自己的客户）
    final membersAsync = ref.watch(tenantMembersProvider);
    final friendsAsync = ref.watch(friendsProvider);
    final customersAsync = isAdminOrAbove
        ? membersAsync.whenData((members) => members
            .where((m) => m.isCustomer || m.customerTag == '客户')
            .toList())
        : friendsAsync.whenData((friends) => friends);

    return Scaffold(
      backgroundColor: null,
      appBar: AppBar(
        backgroundColor: null,
        elevation: 0,
        title: Text(
          isAdminOrAbove ? '全部客户' : '我的客户',
          style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: _primaryText(context)),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios,
              size: 18, color: _primaryText(context)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // 搜索框
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: _onSearchChanged,
              style: TextStyle(color: _primaryText(context), fontSize: 15),
              cursorColor: const Color(0xFF00B27A),
              decoration: InputDecoration(
                hintText: '搜索客户',
                hintStyle:
                    TextStyle(color: _secondaryText(context), fontSize: 14),
                prefixIcon: Icon(Icons.search,
                    color: _secondaryText(context), size: 20),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: customersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('加载失败: $e')),
              data: (customers) {
                final filtered = _query.isEmpty
                    ? customers
                    : customers
                        .where((c) => c.displayName
                            .toLowerCase()
                            .contains(_query.toLowerCase()))
                        .toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Text('暂无客户',
                        style: TextStyle(
                            color: _secondaryText(context), fontSize: 15)),
                  );
                }

                return ListView.separated(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 1),
                  itemBuilder: (context, i) {
                    final customer = filtered[i];
                    return _CustomerTile(
                      customer: customer,
                      isAdminOrAbove: isAdminOrAbove,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerTile extends StatelessWidget {
  final Contact customer;
  final bool isAdminOrAbove;

  const _CustomerTile({required this.customer, required this.isAdminOrAbove});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: () => context.push(
          '/profile/${customer.userId}',
          extra: isAdminOrAbove ? {'adminCustomerView': true} : null,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              PersonAvatarWithBadge(
                avatarUrl: customer.avatarUrl,
                name: customer.displayName,
                userType: customer.userType,
                customerTag: customer.customerTag,
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
                        Flexible(
                          child: Text(customer.displayName,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                  color: _primaryText(context))),
                        ),
                        const SizedBox(width: 6),
                        const IdentityBadge(
                          label: '客户',
                          tone: IdentityBadgeTone.customer,
                          compact: true,
                        ),
                      ],
                    ),
                    if (customer.remark != null &&
                        customer.remark!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        customer.remark!,
                        style: TextStyle(
                            fontSize: 12, color: _secondaryText(context)),
                      ),
                    ] else if (isAdminOrAbove) ...[
                      const SizedBox(height: 2),
                      Text(
                        '负责客服：未分配',
                        style: TextStyle(
                            fontSize: 12, color: _secondaryText(context)),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: _chevronColor(context), size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
