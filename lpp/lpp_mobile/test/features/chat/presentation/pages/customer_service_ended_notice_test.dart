import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/customer_service_ended_notice.dart';

void main() {
  testWidgets('customer service ended notice reserves bottom safe area',
      (tester) async {
    Future<double> pumpNoticeWithBottomPadding(double bottomPadding) async {
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              padding: EdgeInsets.only(bottom: bottomPadding),
            ),
            child: const Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: CustomerServiceEndedNotice(),
              ),
            ),
          ),
        ),
      );

      return tester.getSize(find.byType(CustomerServiceEndedNotice)).height;
    }

    final baselineHeight = await pumpNoticeWithBottomPadding(0);
    final safeAreaHeight = await pumpNoticeWithBottomPadding(24);

    expect(find.text('会话已结束'), findsOneWidget);
    expect(safeAreaHeight, baselineHeight + 24);
  });

  testWidgets(
    'customer service ended notice explains history retention and refreshes',
    (tester) async {
      var refreshCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: CustomerServiceEndedNotice(
                statusLabel: '超时关闭',
                onRefresh: () => refreshCount += 1,
              ),
            ),
          ),
        ),
      );

      expect(find.text('超时关闭'), findsOneWidget);
      expect(find.text('历史记录已保留，客户继续对话后会恢复接待。'), findsOneWidget);
      expect(find.text('刷新状态'), findsOneWidget);

      await tester.tap(find.text('刷新状态'));
      await tester.pump();

      expect(refreshCount, 1);
    },
  );
}
