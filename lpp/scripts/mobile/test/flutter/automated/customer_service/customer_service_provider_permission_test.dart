import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

void main() {
  group('Customer service provider permissions', () {
    test('admin and owner do not call customer-service workbench providers',
        () async {
      for (final role in [3, 4]) {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        container.read(currentSpaceProvider.notifier).setSpace(
              _employee(role),
            );

        await expectLater(
          container.read(customerServiceThreadsProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不是客服'),
          )),
        );
        await expectLater(
          container.read(customerServiceDashboardProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不是客服'),
          )),
        );
        await expectLater(
          container.read(customerServiceQuickRepliesProvider(null).future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不是客服'),
          )),
        );
        await expectLater(
          container.read(customerServiceReceptionStatusProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不是客服'),
          )),
        );
      }
    });

    test('non-admin roles cannot call admin workbench providers', () async {
      for (final role in [0, 2]) {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        container.read(currentSpaceProvider.notifier).setSpace(
              _employee(role),
            );

        await expectLater(
          container.read(adminCustomerServiceDashboardProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不能查看管理工作台数据'),
          )),
        );
        await expectLater(
          container.read(adminCustomerServiceStaffStatusesProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不能查看客服状态'),
          )),
        );
        await expectLater(
          container.read(
            adminCustomerServiceThreadsProvider(
              const AdminCustomerServiceThreadQuery(),
            ).future,
          ),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不能查看客服会话'),
          )),
        );
        await expectLater(
          container.read(adminDirectCustomerThreadsProvider(false).future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不能查看客户线程池'),
          )),
        );
        await expectLater(
          container.read(adminAuditLogsProvider.future),
          throwsA(isA<StateError>().having(
            (e) => e.message,
            'message',
            contains('当前角色不能查看操作审计'),
          )),
        );
      }
    });
  });
}

SpaceContext _employee(int membershipRole) => SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'token',
      refreshToken: 'refresh',
      userId: 'user-$membershipRole',
      type: SpaceType.employee,
      membershipRole: membershipRole,
    );
