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

  test('startup gate keeps brand loading immersive until handoff', () {
    final source =
        File('lib/features/startup/presentation/pages/startup_gate_page.dart')
            .readAsStringSync();
    final appSource = File('lib/app/app.dart').readAsStringSync();

    expect(source, contains('SystemUiMode.manual'));
    expect(source, contains('overlays: const []'));
    expect(source, contains('configureAppSystemUi()'));
    expect(source, contains('startupHandoffOverlayProvider'));
    expect(source.indexOf('startupHandoffOverlayProvider'),
        lessThan(source.indexOf('context.go(destination)')));
    expect(appSource, contains('StartupHandoffOverlay'));
    expect(
      source.indexOf('SystemUiMode.manual'),
      lessThan(source.indexOf('return const StartupBrandLoadingView()')),
    );
  });
}
