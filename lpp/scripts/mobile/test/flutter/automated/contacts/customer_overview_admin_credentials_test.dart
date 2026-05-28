import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/pages/customer_overview_page.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

void main() {
  testWidgets(
    'owner customer management does not spin forever when admin credential is unavailable',
    (tester) async {
      const ownerSpace = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            effectiveCurrentSpaceProvider.overrideWithValue(ownerSpace),
            adminManagementCredentialAvailableProvider('tenant-1')
                .overrideWith((ref) async => false),
            adminDirectCustomerThreadsProvider(false).overrideWith((ref) {
              throw StateError('admin thread provider should not be called');
            }),
          ],
          child: const MaterialApp(
            home: CustomerOverviewPage(),
          ),
        ),
      );

      await tester.pump();

      expect(find.text('数据接口待接入，暂无可展示数据'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    },
  );

  testWidgets('owner customer management filters customers by enterprise tags',
      (tester) async {
    const ownerSpace = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
      userId: 'owner-1',
      type: SpaceType.employee,
      membershipRole: 4,
    );
    final repository = _FakeAdminCustomerServiceRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          effectiveCurrentSpaceProvider.overrideWithValue(ownerSpace),
          currentSpaceHasAdminConsoleAccessProvider.overrideWithValue(true),
          adminManagementCredentialAvailableProvider('tenant-1')
              .overrideWith((ref) async => true),
          adminCustomerServiceRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: CustomerOverviewPage(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('标签筛选'), findsOneWidget);
    expect(find.text('VIP'), findsOneWidget);
    expect(find.text('投诉'), findsOneWidget);
    expect(find.text('客户 A'), findsOneWidget);
    expect(find.text('客户 B'), findsOneWidget);

    await tester.tap(find.text('标签筛选'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('VIP').last);
    await tester.tap(find.text('确定'));
    await tester.pumpAndSettle();

    expect(repository.queries.last.tags, ['VIP']);
    expect(repository.queries.last.tagMatch, 'any');
    expect(find.text('标签：VIP'), findsOneWidget);
    expect(find.text('客户 A'), findsOneWidget);
    expect(find.text('客户 B'), findsNothing);
  });
}

class _FakeAdminCustomerServiceRepository
    implements AdminCustomerServiceRepository {
  final queries = <AdminCustomerQuery>[];

  static const _customers = [
    AdminCustomer(
      userId: 'customer-1',
      loginName: 'customer_a',
      displayName: '客户 A',
      status: 'active',
      userType: 1,
      membershipRole: 0,
      assignedStaffDisplayName: '客服 A',
      tags: ['VIP', '投诉'],
    ),
    AdminCustomer(
      userId: 'customer-2',
      loginName: 'customer_b',
      displayName: '客户 B',
      status: 'active',
      userType: 1,
      membershipRole: 0,
      tags: ['普通'],
    ),
  ];

  @override
  Future<List<AdminCustomer>> getCustomers({
    String? keyword,
    String? status,
    String? assignedStaffUserId,
    List<String> tags = const [],
    String tagMatch = 'any',
  }) async {
    queries.add(AdminCustomerQuery(
      keyword: keyword,
      status: status,
      assignedStaffUserId: assignedStaffUserId,
      tags: tags,
      tagMatch: tagMatch,
    ));
    if (tags.isEmpty) return _customers;
    return _customers
        .where((customer) => customer.tags.any(tags.contains))
        .toList(growable: false);
  }

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
