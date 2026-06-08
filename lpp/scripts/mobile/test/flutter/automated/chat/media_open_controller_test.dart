import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_download_service.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_local_store.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_open_controller.dart';

void main() {
  group('MediaOpenController cachedLocalPathFor', () {
    test('returns downloaded local path without starting a download', () async {
      final now = DateTime(2026);
      final file = MediaLocalFile(
        id: mediaLocalFileId(
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          messageId: 'message-1',
          mediaKind: MediaKind.video,
          variant: MediaVariant.videoSource,
        ),
        spaceId: 'space-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        mediaKind: MediaKind.video,
        variant: MediaVariant.videoSource,
        remoteUrl: '/media/video-1',
        localPath: '/local/video-1.mp4',
        status: MediaLocalStatus.downloaded,
        createdAt: now,
        updatedAt: now,
      );
      final store = _FakeMediaLocalStore(file);
      final controller = MediaOpenController(
        spaceId: 'space-1',
        store: store,
        runtime: _FakeMediaFileRuntime(existingPaths: {'/local/video-1.mp4'}),
        downloadService: MediaDownloadService(Dio()),
      );

      final path = await controller.cachedLocalPathFor(_request());

      expect(path, '/local/video-1.mp4');
      expect(store.touched, isFalse);
    });

    test('returns null for missing or stale downloaded file', () async {
      final now = DateTime(2026);
      final staleFile = MediaLocalFile(
        id: mediaLocalFileId(
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          messageId: 'message-1',
          mediaKind: MediaKind.video,
          variant: MediaVariant.videoSource,
        ),
        spaceId: 'space-1',
        conversationId: 'conversation-1',
        messageId: 'message-1',
        mediaKind: MediaKind.video,
        variant: MediaVariant.videoSource,
        remoteUrl: '/media/video-1',
        localPath: '/local/deleted-video-1.mp4',
        status: MediaLocalStatus.downloaded,
        createdAt: now,
        updatedAt: now,
      );
      final controller = MediaOpenController(
        spaceId: 'space-1',
        store: _FakeMediaLocalStore(staleFile),
        runtime: _FakeMediaFileRuntime(existingPaths: const {}),
        downloadService: MediaDownloadService(Dio()),
      );

      expect(await controller.cachedLocalPathFor(_request()), isNull);
    });
  });

  group('MediaOpenController bytesForResource', () {
    test('reads bytes from local media path', () async {
      final controller = MediaOpenController(
        spaceId: 'space-1',
        store: _FakeMediaLocalStore(null),
        runtime: _FakeMediaFileRuntime(
          existingPaths: const {'/local/image-1.jpg'},
          fileBytes: const {
            '/local/image-1.jpg': [1, 2, 3],
          },
        ),
        downloadService: _FakeMediaDownloadService(),
      );

      final bytes = await controller.bytesForResource(
        const MediaResource(url: 'file:///local/image-1.jpg'),
      );

      expect(bytes, [1, 2, 3]);
    });

    test(
      'loads bytes through download service for remote media path',
      () async {
        final downloadService = _FakeMediaDownloadService(
          remoteBytes: const {
            '/media/image-1': [4, 5, 6],
          },
        );
        final controller = MediaOpenController(
          spaceId: 'space-1',
          store: _FakeMediaLocalStore(null),
          runtime: const _FakeMediaFileRuntime(existingPaths: {}),
          downloadService: downloadService,
        );

        final bytes = await controller.bytesForResource(
          const MediaResource(url: '/media/image-1'),
        );

        expect(bytes, [4, 5, 6]);
        expect(downloadService.requestedUrls, ['/media/image-1']);
      },
    );

    test('throws when remote media response is empty', () async {
      final controller = MediaOpenController(
        spaceId: 'space-1',
        store: _FakeMediaLocalStore(null),
        runtime: const _FakeMediaFileRuntime(existingPaths: {}),
        downloadService: _FakeMediaDownloadService(
          remoteBytes: const {'/media/empty': []},
        ),
      );

      await expectLater(
        controller.bytesForResource(const MediaResource(url: '/media/empty')),
        throwsStateError,
      );
    });
  });
}

MediaOpenRequest _request() {
  return MediaOpenRequest.fromResource(
    message: Message(
      messageId: 'message-1',
      conversationId: 'conversation-1',
      conversationSeq: 1,
      senderUserId: 'user-1',
      type: MessageType.video,
      body: const MessageBody(video: MediaResource(url: '/media/video-1')),
      sentAt: DateTime(2026),
    ),
    mediaKind: MediaKind.video,
    variant: MediaVariant.videoSource,
    resource: const MediaResource(url: '/media/video-1'),
    fallbackName: 'video.mp4',
  );
}

class _FakeMediaLocalStore extends MediaLocalStore {
  final MediaLocalFile? file;
  bool touched = false;

  _FakeMediaLocalStore(this.file);

  @override
  Future<MediaLocalFile?> get({
    required String spaceId,
    required String conversationId,
    required String messageId,
    required MediaKind mediaKind,
    required MediaVariant variant,
  }) async {
    return file;
  }

  @override
  Future<MediaLocalFile> touch(String spaceId, MediaLocalFile file) async {
    touched = true;
    return file;
  }
}

class _FakeMediaFileRuntime extends MediaFileRuntime {
  final Set<String> existingPaths;
  final Map<String, List<int>> fileBytes;

  const _FakeMediaFileRuntime({
    required this.existingPaths,
    this.fileBytes = const {},
  });

  @override
  Future<bool> fileExists(String? path) async {
    return path != null && existingPaths.contains(path);
  }

  @override
  Future<List<int>> readFileBytes(String path) async => fileBytes[path] ?? [];
}

class _FakeMediaDownloadService extends MediaDownloadService {
  final Map<String, List<int>> remoteBytes;
  final requestedUrls = <String>[];

  _FakeMediaDownloadService({this.remoteBytes = const {}}) : super(Dio());

  @override
  Future<List<int>> fetchBytes(String remoteUrl) async {
    requestedUrls.add(remoteUrl);
    return remoteBytes[remoteUrl] ?? const [];
  }
}
