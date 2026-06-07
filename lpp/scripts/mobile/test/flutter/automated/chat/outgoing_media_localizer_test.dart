import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/outgoing_media_localizer.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('lpp_outgoing_media_test_');
    PathProviderPlatform.instance = FakePathProviderPlatform(tempDir.path);
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test(
    'copies outgoing media into durable media directory by message scope',
    () async {
      final source = File('${tempDir.path}/picked-image.jpg');
      await source.writeAsBytes([1, 2, 3, 4]);

      final localizer = OutgoingMediaLocalizer(runtime: MediaFileRuntime());
      final result = await localizer.localize(
        spaceId: 'space-1',
        conversationId: 'conversation-1',
        messageId: 'client-1',
        variant: MediaVariant.original,
        sourcePath: source.path,
        fileName: 'picked-image.jpg',
      );

      expect(result.localPath, isNot(source.path));
      expect(result.localPath, contains('lpp_media'));
      expect(result.localPath, contains('space-1'));
      expect(result.localPath, contains('conversation-1'));
      expect(result.localPath, contains('client-1'));
      expect(await File(result.localPath).readAsBytes(), [1, 2, 3, 4]);
    },
  );
}

class FakePathProviderPlatform extends PathProviderPlatform {
  final String rootPath;

  FakePathProviderPlatform(this.rootPath);

  @override
  Future<String?> getApplicationSupportPath() async => rootPath;
}
