import 'package:flutter_test/flutter_test.dart';
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
}
