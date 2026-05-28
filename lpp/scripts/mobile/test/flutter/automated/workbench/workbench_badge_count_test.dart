import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/app/router/router.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';

void main() {
  test('customer service workbench badge includes unread and queued sessions',
      () {
    const space = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'token',
      refreshToken: 'refresh',
      userId: 'cs-1',
      type: SpaceType.employee,
      membershipRole: 2,
    );

    final count = calculateWorkbenchBadgeCount(
      space: space,
      customerServiceDashboard: const CsDashboardData(
        directUnreadCount: 3,
        queuedTotalCount: 2,
      ),
    );

    expect(count, 5);
  });

  test('owner workbench badge uses pending enterprise join requests', () {
    const space = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'token',
      refreshToken: 'refresh',
      userId: 'owner-1',
      type: SpaceType.employee,
      membershipRole: 4,
    );

    expect(
      calculateWorkbenchBadgeCount(space: space, pendingJoinCount: 7),
      7,
    );
  });

  test('roles without workbench do not show badge', () {
    const space = SpaceContext(
      spaceId: 'tenant-1',
      accessToken: 'token',
      refreshToken: 'refresh',
      userId: 'customer-1',
      type: SpaceType.customerSocial,
      membershipRole: 0,
    );

    expect(
      calculateWorkbenchBadgeCount(space: space, pendingJoinCount: 7),
      0,
    );
  });
}
