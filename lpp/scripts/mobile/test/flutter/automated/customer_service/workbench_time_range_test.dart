import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/customer_service/presentation/pages/customer_service_page.dart';

void main() {
  test('formatWorkbenchDateRange shows explicit custom dates', () {
    final label = formatWorkbenchDateRange(
      DateTimeRange(
        start: DateTime(2026, 5, 1),
        end: DateTime(2026, 5, 17),
      ),
    );

    expect(label, '2026.05.01-2026.05.17');
  });
}
