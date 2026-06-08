import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/platform/media_file_runtime.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_download_service.dart';
import 'package:lpp_mobile/features/chat/data/datasources/media_local_store.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

final mediaFileRuntimeProvider = Provider<MediaFileRuntime>((ref) {
  return const MediaFileRuntime();
});

final mediaLocalStoreProvider = Provider<MediaLocalStore>((ref) {
  return const MediaLocalStore();
});

final mediaDownloadServiceProvider = Provider<MediaDownloadService>((ref) {
  return MediaDownloadService(ref.watch(dioProvider));
});

final mediaOpenControllerProvider =
    Provider.family<MediaOpenController, String>((ref, spaceId) {
  return MediaOpenController(
    spaceId: spaceId,
    store: ref.watch(mediaLocalStoreProvider),
    runtime: ref.watch(mediaFileRuntimeProvider),
    downloadService: ref.watch(mediaDownloadServiceProvider),
  );
});

class MediaOpenRequest {
  final String conversationId;
  final String messageId;
  final MediaKind mediaKind;
  final MediaVariant variant;
  final String remoteUrl;
  final String? localCandidateUrl;
  final String fileName;
  final String? mimeType;
  final int? sizeBytes;

  const MediaOpenRequest({
    required this.conversationId,
    required this.messageId,
    required this.mediaKind,
    required this.variant,
    required this.remoteUrl,
    this.localCandidateUrl,
    required this.fileName,
    this.mimeType,
    this.sizeBytes,
  });

  factory MediaOpenRequest.fromResource({
    required Message message,
    required MediaKind mediaKind,
    required MediaVariant variant,
    required MediaResource resource,
    required String fallbackName,
  }) {
    return MediaOpenRequest(
      conversationId: message.conversationId,
      messageId: message.messageId,
      mediaKind: mediaKind,
      variant: variant,
      remoteUrl: resource.url,
      localCandidateUrl: switch (variant) {
        MediaVariant.original ||
        MediaVariant.videoSource ||
        MediaVariant.attachment ||
        MediaVariant.voiceSource =>
          resource.localPreviewUrl,
        MediaVariant.videoPoster => resource.localPosterUrl,
        MediaVariant.thumbnail => null,
      },
      fileName: resource.fileName?.trim().isNotEmpty == true
          ? resource.fileName!.trim()
          : fallbackName,
      mimeType: resource.mimeType,
      sizeBytes: resource.sizeBytes,
    );
  }
}

class MediaOpenController {
  final String spaceId;
  final MediaLocalStore store;
  final MediaFileRuntime runtime;
  final MediaDownloadService downloadService;

  final Map<String, Future<String>> _inFlight = {};

  MediaOpenController({
    required this.spaceId,
    required this.store,
    required this.runtime,
    required this.downloadService,
  });

  Future<String> localPathFor(MediaOpenRequest request) async {
    final rawUrl = request.remoteUrl.trim();
    if (rawUrl.isEmpty) throw ArgumentError('Media url is empty');
    final localCandidate = request.localCandidateUrl?.trim();
    if (localCandidate != null &&
        localCandidate.isNotEmpty &&
        _isLocalMediaPath(localCandidate)) {
      final candidatePath = localPathFromUriOrPath(localCandidate);
      if (await runtime.fileExists(candidatePath)) return candidatePath;
    }
    if (_isLocalMediaPath(rawUrl)) return localPathFromUriOrPath(rawUrl);

    final key = mediaLocalFileId(
      spaceId: spaceId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      mediaKind: request.mediaKind,
      variant: request.variant,
    );

    final existing = _inFlight[key];
    if (existing != null) return existing;

    final future = _resolvePath(request);
    _inFlight[key] = future;
    try {
      return await future;
    } finally {
      _inFlight.remove(key);
    }
  }

  Future<String?> cachedLocalPathFor(MediaOpenRequest request) async {
    final rawUrl = request.remoteUrl.trim();
    if (rawUrl.isEmpty) return null;

    final localCandidate = request.localCandidateUrl?.trim();
    if (localCandidate != null &&
        localCandidate.isNotEmpty &&
        _isLocalMediaPath(localCandidate)) {
      final candidatePath = localPathFromUriOrPath(localCandidate);
      if (await runtime.fileExists(candidatePath)) return candidatePath;
    }

    if (_isLocalMediaPath(rawUrl)) {
      final localPath = localPathFromUriOrPath(rawUrl);
      return await runtime.fileExists(localPath) ? localPath : null;
    }

    final file = await store.get(
      spaceId: spaceId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      mediaKind: request.mediaKind,
      variant: request.variant,
    );
    if (file == null ||
        file.status != MediaLocalStatus.downloaded ||
        file.localPath == null ||
        file.localPath!.trim().isEmpty) {
      return null;
    }
    if (!await runtime.fileExists(file.localPath)) return null;

    return file.localPath;
  }

  Future<List<int>> bytesForResource(MediaResource resource) async {
    final rawUrl = resource.url.trim();
    if (rawUrl.isEmpty) throw ArgumentError('Media url is empty');
    if (_isLocalMediaPath(rawUrl)) {
      final bytes = await runtime.readFileBytes(localPathFromUriOrPath(rawUrl));
      if (bytes.isEmpty) throw StateError('Media response is empty');
      return bytes;
    }
    final bytes = await downloadService.fetchBytes(rawUrl);
    if (bytes.isEmpty) throw StateError('Media response is empty');
    return bytes;
  }

  Future<String> _resolvePath(MediaOpenRequest request) async {
    var file = await store.upsertMissing(
      spaceId: spaceId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      mediaKind: request.mediaKind,
      variant: request.variant,
      remoteUrl: request.remoteUrl,
      fileName: request.fileName,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
    );

    if (file.status == MediaLocalStatus.downloaded) {
      if (await runtime.fileExists(file.localPath)) {
        await store.touch(spaceId, file);
        return file.localPath!;
      }
      file = await store.markMissing(spaceId, file);
    }

    final finalPath = await runtime.finalPath(
      spaceId: spaceId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      variant: request.variant,
      fileName: request.fileName,
    );

    if (await runtime.fileExists(finalPath)) {
      final size = await runtime.fileLength(finalPath);
      await store.markDownloaded(
        spaceId,
        file,
        localPath: finalPath,
        sizeBytes: size > 0 ? size : request.sizeBytes,
      );
      return finalPath;
    }

    final partPath = runtime.partPathFor(finalPath);
    await runtime.ensureParentDirectory(finalPath);
    file = await store.markDownloading(spaceId, file, localPath: finalPath);

    try {
      await runtime.deleteFileIfExists(partPath);
      await downloadService.download(
        remoteUrl: request.remoteUrl,
        partPath: partPath,
      );
      await runtime.promotePartFile(partPath: partPath, finalPath: finalPath);
      final size = await runtime.fileLength(finalPath);
      await store.markDownloaded(
        spaceId,
        file,
        localPath: finalPath,
        sizeBytes: size > 0 ? size : request.sizeBytes,
      );
      return finalPath;
    } catch (error) {
      await runtime.deleteFileIfExists(partPath);
      await store.markFailed(
        spaceId,
        file,
        reason: downloadService.failureReason(error),
      );
      rethrow;
    }
  }

  bool _isLocalMediaPath(String url) {
    final uri = Uri.tryParse(url);
    if (uri != null && uri.scheme == 'file') return true;
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      return false;
    }
    return !url.startsWith('/media') &&
        !url.startsWith('/api') &&
        !url.startsWith('/uploads') &&
        !url.startsWith('/files');
  }
}
