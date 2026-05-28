import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/platform/local_file.dart';

export 'package:just_audio/just_audio.dart' show PlayerState, ProcessingState;

// ---------------------------------------------------------------------------
// AudioPlayerService — 单例播放器，保证同一时刻只有一条语音在播放
// ---------------------------------------------------------------------------

class AudioPlayerService {
  final Dio? _dio;
  final AudioPlayer _player = AudioPlayer();

  AudioPlayerService({Dio? dio}) : _dio = dio;

  /// 当前正在播放的消息 ID
  String? currentlyPlayingId;

  bool get isPlaying => _player.playing;

  Stream<PlayerState> get playerStateStream => _player.playerStateStream;
  Stream<Duration> get positionStream => _player.positionStream;

  /// 播放指定消息的语音
  /// 若当前有其他消息在播放，先停止再播放新的
  Future<void> play(String messageId, String url, {String? token}) async {
    if (currentlyPlayingId == messageId && _player.playing) return;

    // 停止当前播放
    await stop();

    try {
      final source = await _buildAudioSource(url, token: token);
      await _player.setAudioSource(source);
      currentlyPlayingId = messageId;
      await _player.play();
    } catch (_) {
      currentlyPlayingId = null;
      rethrow;
    }
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> stop() async {
    await _player.stop();
    currentlyPlayingId = null;
  }

  Future<void> dispose() async {
    await _player.dispose();
  }

  Future<AudioSource> _buildAudioSource(String rawUrl, {String? token}) async {
    final url = rawUrl.trim();
    if (url.isEmpty) throw ArgumentError('Voice url is empty');

    final filePath = _localFilePath(url);
    if (filePath != null && await localFileExists(filePath)) {
      return AudioSource.file(filePath);
    }

    final uri = _resolveRemoteUri(url);
    final cachedPath = await _downloadRemoteVoice(uri);
    if (cachedPath != null) {
      return AudioSource.file(cachedPath);
    }

    final authHeaders = token == null || token.isEmpty
        ? null
        : <String, String>{'Authorization': 'Bearer $token'};
    return AudioSource.uri(uri, headers: authHeaders);
  }

  Future<String?> _downloadRemoteVoice(Uri uri) async {
    final dio = _dio;
    if (dio == null) return null;

    try {
      final response = await dio.get<List<int>>(
        uri.toString(),
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      if (bytes == null || bytes.isEmpty) return null;

      return cacheBytesToLocalFile(
        bytes: bytes,
        directoryName: 'lpp_voice',
        fileName: _cacheFileName(uri, response.headers.value('content-type')),
      );
    } on UnsupportedError {
      return null;
    }
  }

  String _cacheFileName(Uri uri, String? contentType) {
    final digest = sha1.convert(utf8.encode(uri.toString())).toString();
    final ext =
        _extensionFromUri(uri) ?? _extensionFromContentType(contentType);
    return '$digest${ext ?? '.m4a'}';
  }

  String? _extensionFromUri(Uri uri) {
    final lastSegment = uri.pathSegments.isEmpty ? '' : uri.pathSegments.last;
    final dot = lastSegment.lastIndexOf('.');
    if (dot <= 0 || dot == lastSegment.length - 1) return null;
    final ext = lastSegment.substring(dot).toLowerCase();
    if (ext.length > 8) return null;
    return ext;
  }

  String? _extensionFromContentType(String? contentType) {
    final type = contentType?.toLowerCase() ?? '';
    if (type.contains('mp4') || type.contains('m4a')) return '.m4a';
    if (type.contains('aac')) return '.aac';
    if (type.contains('mpeg')) return '.mp3';
    if (type.contains('ogg')) return '.ogg';
    if (type.contains('wav')) return '.wav';
    return null;
  }

  String? _localFilePath(String url) {
    final uri = Uri.tryParse(url);
    if (uri != null && uri.scheme == 'file') {
      return uri.toFilePath();
    }
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      return null;
    }
    if (url.startsWith('/api/') ||
        url.startsWith('/media/') ||
        url.startsWith('/uploads/') ||
        url.startsWith('/files/')) {
      return null;
    }
    return url;
  }

  Uri _resolveRemoteUri(String url) {
    final parsed = Uri.tryParse(url);
    if (parsed != null && parsed.hasScheme) return parsed;
    return Uri.parse(HttpClient.baseUrl).resolve(url);
  }
}

// ---------------------------------------------------------------------------
// Provider — 全局单例，跨 widget 共享播放状态
// ---------------------------------------------------------------------------

final audioPlayerServiceProvider = Provider<AudioPlayerService>((ref) {
  final service = AudioPlayerService(dio: ref.watch(dioProvider));
  ref.onDispose(service.dispose);
  return service;
});
