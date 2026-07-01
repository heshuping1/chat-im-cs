import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/space/space_context.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:lpp_mobile/features/startup/presentation/pages/startup_gate_page.dart';

void main() {
  test('startup gate waits for the minimum brand loading display time',
      () async {
    final delayed = <Duration>[];
    var now = DateTime(2026, 6, 12, 10);

    final destination = await waitForMinimumStartupBrandDisplay(
      () async {
        now = now.add(const Duration(milliseconds: 200));
        return '/login';
      },
      now: () => now,
      delay: (duration) async => delayed.add(duration),
    );

    expect(destination, '/login');
    expect(delayed,
        [minimumStartupBrandDisplay - const Duration(milliseconds: 200)]);
  });

  test('startup gate does not add delay when startup work is already slow',
      () async {
    final delayed = <Duration>[];
    var now = DateTime(2026, 6, 12, 10);

    final destination = await waitForMinimumStartupBrandDisplay(
      () async {
        now = now
            .add(minimumStartupBrandDisplay + const Duration(milliseconds: 1));
        return '/';
      },
      now: () => now,
      delay: (duration) async => delayed.add(duration),
    );

    expect(destination, '/');
    expect(delayed, isEmpty);
  });

  test('startup gate warms authenticated home on every cold start', () {
    const space = SpaceContext(
      spaceId: 'space-1',
      accessToken: 'tenant-token',
      refreshToken: 'refresh-token',
      userId: 'user-1',
      type: SpaceType.employee,
    );

    expect(
      shouldWarmAuthenticatedHomeFirstScreen(
        authStatus: AuthStatus.authenticated,
        space: space,
        hasCompletedStartupGate: true,
      ),
      isTrue,
    );
  });

  test('startup gate shows the brand loading frame before navigation', () {
    final source =
        File('lib/features/startup/presentation/pages/startup_gate_page.dart')
            .readAsStringSync();
    final appSource = File('lib/app/app.dart').readAsStringSync();
    final mainSource = File('lib/main.dart').readAsStringSync();
    final routerSource = File('lib/app/router/router.dart').readAsStringSync();

    expect(mainSource, contains('deferFirstFrame()'));
    expect(mainSource, contains('configureStartupSystemUi()'));
    expect(source, contains('SystemUiMode.manual'));
    expect(source, contains('overlays: const []'));
    expect(source, contains('allowFirstFrame()'));
    expect(source, contains('_allowStartupLoadingFirstFrame()'));
    expect(source, contains('configureAppSystemUi()'));
    expect(source, isNot(contains('startupHandoffOverlayProvider')));
    expect(source, contains('startupNetworkBannerSuppressedProvider'));
    expect(appSource, isNot(contains('StartupHandoffOverlay')));
    expect(appSource, contains('!suppressStartupNetworkBanner'));
    expect(
      appSource.indexOf('!suppressStartupNetworkBanner'),
      lessThan(appSource.indexOf('NetworkStatusBanner')),
    );
    expect(
      source.indexOf('SystemUiMode.manual'),
      lessThan(source.indexOf('return const StartupBrandLoadingView()')),
    );
    expect(
      source.indexOf('_allowStartupLoadingFirstFrame();'),
      lessThan(source.indexOf('context.go(destination)')),
    );
    final navigationIndex = source.indexOf('context.go(destination)');
    final deferredReleaseIndex = source.indexOf(
      '_scheduleStartupUiRelease()',
      navigationIndex,
    );
    expect(navigationIndex, isNonNegative);
    expect(deferredReleaseIndex, isNonNegative);
    expect(navigationIndex, lessThan(deferredReleaseIndex));
    expect(routerSource, contains('path: AppRoutes.startup'));
    expect(routerSource, contains('path: AppRoutes.login'));
    expect(routerSource, contains('path: AppRoutes.tenantSelect'));
    expect(
      RegExp(
        r'isAuthenticated\s*&&\s*\(\s*isLoginRoute\s*\|\|\s*isTenantSelectRoute\s*\|\|\s*isRegisterRoute\s*\)',
      ).hasMatch(routerSource),
      isTrue,
    );
    expect(
      RegExp(r'path: AppRoutes\.startup,[\s\S]*?NoTransitionPage')
          .hasMatch(routerSource),
      isTrue,
    );
    expect(
      RegExp(r'path: AppRoutes\.login,[\s\S]*?NoTransitionPage')
          .hasMatch(routerSource),
      isTrue,
    );
    expect(
      RegExp(r'path: AppRoutes\.tenantSelect,[\s\S]*?NoTransitionPage')
          .hasMatch(routerSource),
      isTrue,
    );
  });

  test('register page redirects pending platform registration to space select',
      () {
    final registerSource =
        File('lib/features/auth/presentation/pages/register_page.dart')
            .readAsStringSync();

    expect(registerSource, contains('authStateNeedsSpaceSelection(s)'));
    expect(registerSource, contains('context.go(AppRoutes.tenantSelect)'));
  });

}
