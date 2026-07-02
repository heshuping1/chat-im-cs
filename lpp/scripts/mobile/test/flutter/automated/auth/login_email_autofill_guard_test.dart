import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('email login field does not request platform autofill', () {
    final source = File(
      'lib/features/auth/presentation/pages/login_page.dart',
    ).readAsStringSync();

    expect(source, isNot(contains('AutofillHints.email')));
  });
}
