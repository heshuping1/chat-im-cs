import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/shared/widgets/responsive_layout.dart';

Widget _wrap({required double width, required Widget child}) {
  return MaterialApp(
    home: MediaQuery(
      data: MediaQueryData(size: Size(width, 800)),
      child: child,
    ),
  );
}

void main() {
  testWidgets('ResponsiveLayout uses mobile layout on compact screens', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        width: 390,
        child: const ResponsiveLayout(
          mobile: Text('mobile'),
          sidePanel: Text('side'),
          contentPanel: Text('content'),
          tertiaryPanel: Text('context'),
        ),
      ),
    );

    expect(find.text('mobile'), findsOneWidget);
    expect(find.text('side'), findsNothing);
    expect(find.text('content'), findsNothing);
    expect(find.text('context'), findsNothing);
  });

  testWidgets('ResponsiveLayout uses two panes on medium screens', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        width: 800,
        child: const ResponsiveLayout(
          mobile: Text('mobile'),
          sidePanel: Text('side'),
          contentPanel: Text('content'),
          tertiaryPanel: Text('context'),
        ),
      ),
    );

    expect(find.text('mobile'), findsNothing);
    expect(find.text('side'), findsOneWidget);
    expect(find.text('content'), findsOneWidget);
    expect(find.text('context'), findsNothing);
  });

  testWidgets('ResponsiveLayout uses three panes on desktop screens', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        width: 1280,
        child: const ResponsiveLayout(
          mobile: Text('mobile'),
          sidePanel: Text('side'),
          contentPanel: Text('content'),
          tertiaryPanel: Text('context'),
        ),
      ),
    );

    expect(find.text('mobile'), findsNothing);
    expect(find.text('side'), findsOneWidget);
    expect(find.text('content'), findsOneWidget);
    expect(find.text('context'), findsOneWidget);
  });
}
