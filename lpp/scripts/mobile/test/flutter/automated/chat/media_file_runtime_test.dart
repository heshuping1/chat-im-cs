import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late PathProviderPlatform originalPathProvider;

  setUp(() {
    originalPathProvider = PathProviderPlatform.instance;
    PathProviderPlatform.instance = _FakePathProvider(
      applicationSupportPath: p.join('app', 'support'),
    );
  });

  tearDown(() {
    PathProviderPlatform.instance = originalPathProvider;
  });

  test(
    'stores durable media files under application support by scope',
    () async {
      final runtime = MediaFileRuntime();

      final path = await runtime.finalPath(
        spaceId: 'space/1',
        conversationId: 'conversation:1',
        messageId: 'message*1',
        variant: MediaVariant.videoSource,
        fileName: 'video.mp4',
      );

      expect(path, contains(p.join('app', 'support', 'lpp_media')));
      expect(path, contains('videoSource'));
      expect(path, endsWith('video.mp4'));
      expect(path, isNot(contains('space/1')));
      expect(path, isNot(contains('conversation:1')));
    },
  );

  test('creates part path next to final path', () {
    final runtime = MediaFileRuntime();

    expect(
      runtime.partPathFor('/app/support/lpp_media/file.mp4'),
      '/app/support/lpp_media/file.mp4.part',
    );
  });
}

class _FakePathProvider extends PathProviderPlatform {
  final String applicationSupportPath;

  _FakePathProvider({required this.applicationSupportPath});

  @override
  Future<String?> getApplicationSupportPath() async => applicationSupportPath;
}
