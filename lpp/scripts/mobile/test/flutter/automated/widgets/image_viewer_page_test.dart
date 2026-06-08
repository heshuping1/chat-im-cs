import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/image_viewer_page.dart';

void main() {
  testWidgets('single tap on image viewer returns to chat page', (
    tester,
  ) async {
    final imageFile = _createTestPng();
    addTearDown(() {
      final dir = imageFile.parent;
      if (dir.existsSync()) dir.deleteSync(recursive: true);
    });

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          ImageViewerPage(imageUrls: [imageFile.path]),
                    ),
                  ),
                  child: const Text('open image'),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open image'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(ImageViewerPage), findsOneWidget);

    await tester.tapAt(const Offset(400, 400));
    await tester.pumpAndSettle();

    expect(find.byType(ImageViewerPage), findsNothing);
    expect(find.text('open image'), findsOneWidget);
  });
}

File _createTestPng() {
  final dir = Directory.systemTemp.createTempSync('image_viewer_test_');
  final file = File('${dir.path}/image.png');
  file.writeAsBytesSync(
    base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    ),
  );
  return file;
}
