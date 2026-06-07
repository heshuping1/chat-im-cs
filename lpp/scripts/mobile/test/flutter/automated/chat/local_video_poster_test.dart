import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/platform/local_video_poster.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late PathProviderPlatform originalPathProvider;

  setUp(() {
    originalPathProvider = PathProviderPlatform.instance;
  });

  tearDown(() {
    PathProviderPlatform.instance = originalPathProvider;
  });

  test(
    'stores video posters under application support, not temporary cache',
    () async {
      final fake = _FakePathProvider(
        applicationSupportPath: p.join('app', 'support'),
        temporaryPath: p.join('app', 'tmp'),
      );
      PathProviderPlatform.instance = fake;

      final directory = await localVideoPosterDirectory();

      expect(directory.path, p.join('app', 'support', 'lpp_video_posters'));
      expect(fake.applicationSupportPathCalls, 1);
      expect(fake.temporaryPathCalls, 0);
    },
  );

  test('uses stable poster file name for the same local video source', () {
    const path = '/data/user/0/com.lpp.mobile/cache/pick/video-1.mp4';

    final first = localVideoPosterFileName(path);
    final second = localVideoPosterFileName(path);

    expect(first, second);
    expect(first, endsWith('.jpg'));
    expect(first, isNot(contains('/')));
    expect(first, isNot(contains('video-1.mp4')));
  });

  test('can key a poster by remote video url instead of temp source path', () {
    const url = 'https://cdn.example.com/media/video-1.mp4';

    final first = localVideoPosterFileName(
      '/tmp/download-a.mp4',
      cacheKey: url,
    );
    final second = localVideoPosterFileName(
      '/tmp/download-b.mp4',
      cacheKey: url,
    );

    expect(first, second);
  });

  test('finds an existing generated poster by remote video url', () async {
    final root = await Directory.systemTemp.createTemp(
      'lpp_video_poster_test_',
    );
    addTearDown(() => root.delete(recursive: true));
    PathProviderPlatform.instance = _FakePathProvider(
      applicationSupportPath: root.path,
      temporaryPath: p.join(root.path, 'tmp'),
    );
    const url = 'https://cdn.example.com/media/video-2.mp4';
    final posterDir = await localVideoPosterDirectory();
    final posterFile = File(
      p.join(posterDir.path, localVideoPosterFileName(url)),
    );
    await posterFile.writeAsBytes([1, 2, 3], flush: true);

    expect(await cachedLocalVideoPosterPath(url), posterFile.path);
  });
}

class _FakePathProvider extends PathProviderPlatform {
  final String applicationSupportPath;
  final String temporaryPath;
  int applicationSupportPathCalls = 0;
  int temporaryPathCalls = 0;

  _FakePathProvider({
    required this.applicationSupportPath,
    required this.temporaryPath,
  });

  @override
  Future<String?> getApplicationSupportPath() async {
    applicationSupportPathCalls += 1;
    return applicationSupportPath;
  }

  @override
  Future<String?> getTemporaryPath() async {
    temporaryPathCalls += 1;
    return temporaryPath;
  }
}
