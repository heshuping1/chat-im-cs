import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/effective_space_provider.dart';
import 'package:lpp_mobile/features/contacts/presentation/providers/contacts_provider.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';
import 'package:lpp_mobile/features/customer_service/presentation/pages/customer_service_page.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

void main() {
  testWidgets('customer has no workbench permission', (tester) async {
    const customerSpace = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
      userId: 'customer-1',
      type: SpaceType.customerSocial,
      membershipRole: 0,
    );

    await _pumpWorkbench(tester, customerSpace);

    expect(find.text('当前身份暂无工作台权限'), findsOneWidget);
    expect(find.text('企业公告'), findsNothing);
  });

  testWidgets('normal employee only sees the basic enterprise workbench', (
    tester,
  ) async {
    const employeeSpace = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
      userId: 'employee-1',
      type: SpaceType.employee,
      membershipRole: 1,
    );

    await _pumpWorkbench(tester, employeeSpace);

    expect(find.text('工作台'), findsOneWidget);
    expect(find.text('企业公告'), findsOneWidget);
    expect(find.text('客户管理'), findsNothing);
    expect(find.text('客服工作台'), findsNothing);
  });

  testWidgets('customer service role sees customer-service tabs', (
    tester,
  ) async {
    const csSpace = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
      userId: 'cs-1',
      type: SpaceType.employee,
      membershipRole: 2,
    );

    await _pumpWorkbench(tester, csSpace);

    expect(find.text('客服工作台'), findsOneWidget);
    expect(find.text('在线客服'), findsWidgets);
    expect(find.text('客户服务'), findsOneWidget);
    expect(find.text('效能'), findsOneWidget);
    expect(find.text('所有者工作台'), findsNothing);
  });

  testWidgets('admin workbench shows management entries', (tester) async {
    const adminSpace = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'tenant-access',
      refreshToken: 'tenant-refresh',
      userId: 'admin-1',
      type: SpaceType.employee,
      membershipRole: 3,
    );

    await _pumpWorkbench(tester, adminSpace);

    expect(find.text('管理工作台'), findsOneWidget);
    expect(find.text('客户运营'), findsOneWidget);
    expect(find.text('服务运营'), findsOneWidget);
    expect(find.text('客户管理'), findsOneWidget);
    expect(find.text('加入企业申请'), findsOneWidget);
    expect(find.text('待分配客户'), findsNothing);
    expect(find.text('按客服查看'), findsNothing);
    expect(find.text('客服中心'), findsOneWidget);
    expect(find.text('客服状态'), findsNothing);

    await tester.scrollUntilVisible(find.text('风控治理'), 180);
    expect(find.text('风控治理'), findsOneWidget);
    expect(find.text('超时未响应'), findsOneWidget);
    expect(find.text('风险会话'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('群组运营'), 180);
    expect(find.text('群组运营'), findsOneWidget);
    expect(find.text('群组监管'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('企业公告'), 180);
    expect(find.text('企业公告'), findsOneWidget);
    expect(find.text('企业管理'), findsWidgets);
  });

  testWidgets(
    'owner workbench uses effective role and shows management entries',
    (tester) async {
      const ownerSpace = SpaceContext(
        spaceId: 'tenant-1',
        accessToken: 'tenant-access',
        refreshToken: 'tenant-refresh',
        userId: 'owner-1',
        type: SpaceType.employee,
        membershipRole: 4,
      );

      await _pumpWorkbench(tester, ownerSpace);

      expect(find.text('所有者工作台'), findsOneWidget);
      expect(find.text('客户运营'), findsOneWidget);
      expect(find.text('服务运营'), findsOneWidget);
      expect(find.text('客户管理'), findsOneWidget);
      expect(find.text('加入企业申请'), findsOneWidget);
      expect(find.text('待分配客户'), findsNothing);
      expect(find.text('客服中心'), findsOneWidget);
      expect(find.text('团队服务效率'), findsNothing);
      expect(find.text('客服会话管理'), findsNothing);

      await tester.scrollUntilVisible(find.text('风控治理'), 180);
      expect(find.text('风控治理'), findsOneWidget);
      expect(find.text('风险会话'), findsOneWidget);
      expect(find.text('会话审计'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('群组运营'), 180);
      expect(find.text('群组运营'), findsOneWidget);
      expect(find.text('群组监管'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('企业公告'), 180);
      expect(find.text('企业公告'), findsOneWidget);
      expect(find.text('企业管理'), findsWidgets);
    },
  );

  testWidgets('service center shows staff and conversation tabs', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          effectiveCurrentSpaceProvider.overrideWithValue(
            const SpaceContext(
              spaceId: 'tenant-1',
              accessToken: 'tenant-access',
              refreshToken: 'tenant-refresh',
              userId: 'owner-1',
              type: SpaceType.employee,
              membershipRole: 4,
            ),
          ),
          currentSpaceProvider.overrideWith(
            () => _FakeSpaceManager(
              const SpaceContext(
                spaceId: 'tenant-1',
                accessToken: 'tenant-access',
                refreshToken: 'tenant-refresh',
                userId: 'owner-1',
                type: SpaceType.employee,
                membershipRole: 4,
              ),
            ),
          ),
          adminCustomerServiceRepositoryProvider.overrideWithValue(
            _FakeAdminCustomerServiceRepository(),
          ),
        ],
        child: const MaterialApp(
          home: OwnerWorkbenchFeaturePage(
            title: '客服中心',
            featureKey: 'admin_service_center',
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('客服中心概览'), findsOneWidget);
    expect(find.text('客户会话'), findsWidgets);
    expect(find.text('在线客服'), findsWidgets);
    expect(find.text('排队'), findsOneWidget);
    expect(find.text('接待人员'), findsOneWidget);
    expect(find.text('客服状态'), findsOneWidget);
    expect(find.text('客户会话 A'), findsOneWidget);

    await tester.tap(find.widgetWithText(InkWell, '客服状态'));
    await tester.pumpAndSettle();

    expect(find.text('客服小王'), findsOneWidget);
    expect(find.text('服务中 2/5 · 手动接入'), findsOneWidget);
    expect(find.text('在线'), findsOneWidget);

    await tester.tap(find.widgetWithText(InkWell, '在线客服'));
    await tester.pumpAndSettle();

    expect(find.text('访客咨询 A'), findsOneWidget);
  });

  testWidgets('service efficiency shows cross-channel staff performance', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          effectiveCurrentSpaceProvider.overrideWithValue(
            const SpaceContext(
              spaceId: 'tenant-1',
              accessToken: 'tenant-access',
              refreshToken: 'tenant-refresh',
              userId: 'owner-1',
              type: SpaceType.employee,
              membershipRole: 4,
            ),
          ),
          currentSpaceProvider.overrideWith(
            () => _FakeSpaceManager(
              const SpaceContext(
                spaceId: 'tenant-1',
                accessToken: 'tenant-access',
                refreshToken: 'tenant-refresh',
                userId: 'owner-1',
                type: SpaceType.employee,
                membershipRole: 4,
              ),
            ),
          ),
          adminCustomerServiceRepositoryProvider.overrideWithValue(
            _FakeAdminCustomerServiceRepository(),
          ),
        ],
        child: const MaterialApp(
          home: OwnerWorkbenchFeaturePage(
            title: '团队服务效率',
            featureKey: 'owner_service_efficiency',
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('客服小王'), findsOneWidget);
    expect(find.text('10 单'), findsOneWidget);
    expect(find.textContaining('访客 4 单'), findsOneWidget);
    expect(find.textContaining('注册客户 6 单'), findsOneWidget);
    expect(find.text('平均首响'), findsOneWidget);
  });

  testWidgets('service center opens customer conversation as read-only', (
    tester,
  ) async {
    Object? chatExtra;
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, __) => const OwnerWorkbenchFeaturePage(
            title: '客服中心',
            featureKey: 'admin_service_center',
          ),
        ),
        GoRoute(
          path: '/chat/:id',
          builder: (_, state) {
            chatExtra = state.extra;
            return const Scaffold(body: Text('chat'));
          },
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          effectiveCurrentSpaceProvider.overrideWithValue(
            const SpaceContext(
              spaceId: 'tenant-1',
              accessToken: 'tenant-access',
              refreshToken: 'tenant-refresh',
              userId: 'owner-1',
              type: SpaceType.employee,
              membershipRole: 4,
            ),
          ),
          currentSpaceProvider.overrideWith(
            () => _FakeSpaceManager(
              const SpaceContext(
                spaceId: 'tenant-1',
                accessToken: 'tenant-access',
                refreshToken: 'tenant-refresh',
                userId: 'owner-1',
                type: SpaceType.employee,
                membershipRole: 4,
              ),
            ),
          ),
          adminCustomerServiceRepositoryProvider.overrideWithValue(
            _FakeAdminCustomerServiceRepository(),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );

    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('客户会话 A'), 120);
    await tester.tap(find.text('客户会话 A'));
    await tester.pumpAndSettle();

    expect(chatExtra, isA<Map<String, dynamic>>());
    expect(
      (chatExtra as Map<String, dynamic>)['customerServiceReadOnly'],
      isTrue,
    );
  });
}

Future<void> _pumpWorkbench(WidgetTester tester, SpaceContext? space) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        effectiveCurrentSpaceProvider.overrideWithValue(space),
        pendingJoinRequestsCountProvider.overrideWith((ref) async => 0),
      ],
      child: const MaterialApp(home: CustomerServicePage()),
    ),
  );

  await tester.pump();
}

class _FakeAdminCustomerServiceRepository
    implements AdminCustomerServiceRepository {
  @override
  Future<AdminCustomerServiceDashboard> getCenterDashboard() async =>
      const AdminCustomerServiceDashboard(
        queuedTempCount: 4,
        queuedDirectCount: 1,
        queuedTotalCount: 5,
        activeTempCount: 7,
        activeDirectCount: 2,
        totalActiveCount: 9,
        onlineStaffCount: 5,
        busyStaffCount: 2,
      );

  @override
  Future<List<CsThread>> getCenterThreads({
    String? keyword,
    String? status,
    String? threadType,
  }) async {
    if (threadType == 'temp_session') {
      return const [
        CsThread(
          threadType: 'temp_session',
          threadId: 'temp-thread-1',
          conversationId: 'temp-conversation-1',
          status: 'active',
          title: '访客咨询 A',
          visitorId: 'visitor-1',
          lastMessagePreview: '访客最近一条消息',
        ),
      ];
    }
    return const [
      CsThread(
        threadType: 'direct_customer',
        threadId: 'thread-1',
        conversationId: 'conversation-1',
        status: 'active',
        title: '客户会话 A',
        customerUserId: 'customer-1',
        lastMessagePreview: '最近一条消息',
      ),
    ];
  }

  @override
  Future<List<CsThread>> getDirectCustomerThreads({
    String? keyword,
    String? status,
    bool? unassignedOnly,
  }) async => const [
    CsThread(
      threadType: 'direct_customer',
      threadId: 'thread-1',
      conversationId: 'conversation-1',
      status: 'active',
      title: '客户会话 A',
      customerUserId: 'customer-1',
      lastMessagePreview: '最近一条消息',
    ),
  ];

  @override
  Future<List<AdminStaffStatus>> getStaffStatuses() async => const [
    AdminStaffStatus(
      staffUserId: 'staff-1',
      displayName: '客服小王',
      serviceStatus: 'online',
      activeSessionCount: 2,
      maxConcurrentSessions: 5,
    ),
  ];

  @override
  Future<AdminTempSessionStats> getTempSessionStats() async =>
      const AdminTempSessionStats(
        totalServed: 21,
        avgFirstResponseSeconds: 58,
        avgDurationSeconds: 360,
        avgRating: 4.8,
        staffPerformance: [
          AdminStaffPerformance(
            staffUserId: 'staff-1',
            displayName: '客服小王',
            sessionsServed: 10,
            avgFirstResponseSeconds: 30,
            avgDurationSeconds: 300,
            avgRating: 4.9,
            excellentRate: 0.92,
            byChannel: [
              AdminStaffChannelBreakdown(
                channel: 'widget',
                sessionsServed: 4,
                avgFirstResponseSeconds: 40,
                avgRating: 4.8,
              ),
              AdminStaffChannelBreakdown(
                channel: 'im_direct',
                sessionsServed: 6,
                avgFirstResponseSeconds: 24,
                avgRating: 5,
              ),
            ],
          ),
        ],
      );

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeSpaceManager extends SpaceManager {
  final SpaceContext? space;

  _FakeSpaceManager(this.space);

  @override
  SpaceContext? build() => space;
}
