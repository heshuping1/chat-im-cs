import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:http/http.dart' as http;
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';

// ---------------------------------------------------------------------------
// 全局头像内存缓存（微信做法：URL 不变 = 图片不变，直接用内存字节，零延迟）
// ---------------------------------------------------------------------------

/// key: resolvedUrl, value: 图片字节
final _avatarMemCache = <String, Uint8List>{};
final _avatarMemLoads = <String>{};
int _avatarMemCacheBytes = 0;
const _avatarMemCacheMaxEntries = 180;
const _avatarMemCacheMaxBytes = 16 * 1024 * 1024;
const _avatarMemCacheMaxSingleBytes = 1024 * 1024;

void _putAvatarMemCache(String url, Uint8List bytes) {
  if (bytes.isEmpty) return;
  if (bytes.lengthInBytes > _avatarMemCacheMaxSingleBytes) return;
  final old = _avatarMemCache.remove(url);
  if (old != null) _avatarMemCacheBytes -= old.lengthInBytes;
  _avatarMemCache[url] = bytes;
  _avatarMemCacheBytes += bytes.lengthInBytes;
  while (_avatarMemCache.length > _avatarMemCacheMaxEntries ||
      _avatarMemCacheBytes > _avatarMemCacheMaxBytes) {
    final firstKey = _avatarMemCache.keys.first;
    final removed = _avatarMemCache.remove(firstKey);
    if (removed != null) _avatarMemCacheBytes -= removed.lengthInBytes;
  }
}

/// 预热头像到内存缓存：默认只读磁盘缓存，不主动下载，避免列表首屏被头像网络请求拖慢。
/// 需要首屏强预热时可显式设置 [downloadMissing]。
Future<void> prefetchAvatarUrls(
  List<String?> urls, {
  String? accessToken,
  bool downloadMissing = false,
  int maxCount = 72,
}) async {
  setAvatarAuthTokenForPrefetch(accessToken);
  final cm = AuthCacheManager.instance;
  final seen = <String>{};
  for (final raw in urls) {
    if (raw == null || raw.isEmpty) continue;
    final url = AuthNetworkImage.resolveUrl(raw);
    if (!seen.add(url)) continue;
    if (seen.length > maxCount) break;
    if (_avatarMemCache.containsKey(url)) continue; // 内存已有，跳过
    try {
      // getFileFromCache：只查磁盘，不触发网络
      FileInfo? cached;
      try {
        cached = await cm.getFileFromCache(url);
      } catch (_) {}
      if (cached != null) {
        final bytes = await cached.file.readAsBytes();
        _putAvatarMemCache(url, bytes);
      } else if (downloadMissing) {
        // 磁盘无缓存：下载并存内存
        final fresh = await cm.downloadFile(url);
        final bytes = await fresh.file.readAsBytes();
        _putAvatarMemCache(url, bytes);
      }
    } catch (_) {}
  }
}

// ---------------------------------------------------------------------------

final myAvatarCacheBuster = ValueNotifier<int>(0);

class UserAvatar extends ConsumerWidget {
  final String? avatarUrl;
  final String name;
  final double size;
  final double borderRadius;
  final bool isGroup;
  final bool isMyAvatar;

  const UserAvatar({
    super.key,
    this.avatarUrl,
    required this.name,
    this.size = 40,
    this.borderRadius = 8,
    this.isGroup = false,
    this.isMyAvatar = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFE5E5EA),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: avatarUrl != null && avatarUrl!.isNotEmpty
            ? isMyAvatar
                ? ValueListenableBuilder<int>(
                    valueListenable: myAvatarCacheBuster,
                    builder: (_, version, __) {
                      final url =
                          version > 0 ? '$avatarUrl?_v=$version' : avatarUrl!;
                      return AuthNetworkImage(
                        key: ValueKey(url),
                        url: url,
                        width: size,
                        height: size,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _fallback(),
                      );
                    },
                  )
                : AuthNetworkImage(
                    url: avatarUrl!,
                    width: size,
                    height: size,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _fallback(),
                  )
            : _fallback(),
      ),
    );
  }

  Widget _fallback() {
    if (isGroup) {
      return Container(
        color: const Color(0xFFE0E0E0),
        child: Icon(
          Icons.group,
          size: size * 0.55,
          color: const Color(0xFF1D2129).withValues(alpha: 0.5),
        ),
      );
    }
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF00B27A), Color(0xFF00D68F)],
        ),
      ),
      child: Center(
        child: Text(initial,
            style: TextStyle(
                fontSize: size * 0.4,
                fontWeight: FontWeight.w600,
                color: Colors.white)),
      ),
    );
  }
}

class UserAvatarCircle extends StatelessWidget {
  final String? avatarUrl;
  final String name;
  final double size;

  const UserAvatarCircle(
      {super.key, this.avatarUrl, required this.name, this.size = 40});

  @override
  Widget build(BuildContext context) => UserAvatar(
      avatarUrl: avatarUrl, name: name, size: size, borderRadius: size / 2);
}

// ---------------------------------------------------------------------------
// AuthNetworkImage
// ---------------------------------------------------------------------------

String? _currentToken;

void setAvatarAuthTokenForPrefetch(String? token) {
  if (token != null && token.isNotEmpty) {
    _currentToken = token;
  }
}

class AuthNetworkImage extends ConsumerStatefulWidget {
  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;
  final bool cacheInMemory;

  const AuthNetworkImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.errorBuilder,
    this.cacheInMemory = true,
  });

  static String resolveUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${HttpClient.baseUrl}${url.startsWith('/') ? '' : '/'}$url';
  }

  @override
  ConsumerState<AuthNetworkImage> createState() => _AuthNetworkImageState();
}

class _AuthNetworkImageState extends ConsumerState<AuthNetworkImage> {
  String? _resolvedUrl;
  bool _isSvg = false;
  Uint8List? _svgBytes;
  bool _svgLoading = true;

  @override
  void initState() {
    super.initState();
    _resolvedUrl = AuthNetworkImage.resolveUrl(widget.url);
    _isSvg = _checkIsSvg(_resolvedUrl!);
    if (_isSvg) _loadSvg(_resolvedUrl!);
  }

  @override
  void didUpdateWidget(AuthNetworkImage old) {
    super.didUpdateWidget(old);
    final newUrl = AuthNetworkImage.resolveUrl(widget.url);
    if (newUrl != _resolvedUrl) {
      _resolvedUrl = newUrl;
      _isSvg = _checkIsSvg(newUrl);
      if (_isSvg) {
        _svgBytes = null;
        _svgLoading = true;
        _loadSvg(newUrl);
      }
    }
  }

  static bool _checkIsSvg(String url) =>
      url.contains('.svg') || url.contains('/svg') || url.contains('image/svg');

  Future<void> _loadSvg(String url) async {
    // 先查内存缓存（prefetchAvatarUrls 已预热）
    final memBytes = _avatarMemCache[url];
    if (memBytes != null) {
      if (mounted) {
        setState(() {
          _svgBytes = memBytes;
          _svgLoading = false;
        });
      }
      _refreshSvgIfChanged(url, memBytes);
      return;
    }

    // 内存无缓存：查磁盘
    final cm = AuthCacheManager.instance;
    FileInfo? cached;
    try {
      cached = await cm.getFileFromCache(url);
    } catch (_) {}

    if (cached != null) {
      final bytes = await cached.file.readAsBytes();
      _putAvatarMemCache(url, bytes);
      if (mounted) {
        setState(() {
          _svgBytes = bytes;
          _svgLoading = false;
        });
      }
      _refreshSvgIfChanged(url, bytes);
    } else {
      try {
        final fresh = await cm.downloadFile(url);
        final bytes = await fresh.file.readAsBytes();
        _putAvatarMemCache(url, bytes);
        if (mounted) {
          setState(() {
            _svgBytes = bytes;
            _svgLoading = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _svgLoading = false);
      }
    }
  }

  void _refreshSvgIfChanged(String url, Uint8List current) {
    Future.microtask(() async {
      try {
        final fresh =
            await AuthCacheManager.instance.downloadFile(url, force: true);
        final newBytes = await fresh.file.readAsBytes();
        if (!mounted) return;
        if (!_bytesEqual(newBytes, current)) {
          _putAvatarMemCache(url, newBytes);
          setState(() => _svgBytes = newBytes);
        }
      } catch (_) {}
    });
  }

  static bool _bytesEqual(Uint8List a, Uint8List b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i += 64) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    _currentToken = ref.watch(currentSpaceProvider)?.accessToken;

    final resolvedUrl = _resolvedUrl ?? AuthNetworkImage.resolveUrl(widget.url);
    final decodeWidth = _decodeDimension(context, widget.width);
    final decodeHeight = _decodeDimension(context, widget.height);

    Widget placeholder() => widget.width != null || widget.height != null
        ? SizedBox(
            width: widget.width,
            height: widget.height,
            child: const ColoredBox(color: Color(0xFFE5E7EB)))
        : const SizedBox.shrink();

    Widget error() => widget.errorBuilder != null
        ? widget.errorBuilder!(context, 'error', null)
        : SizedBox(
            width: widget.width,
            height: widget.height,
            child: const ColoredBox(
                color: Color(0xFFE5E7EB),
                child: Icon(Icons.broken_image, color: Color(0xFF9CA3AF))));

    if (_isSvg) {
      if (_svgLoading) return placeholder();
      if (_svgBytes == null) return error();
      return SizedBox(
        width: widget.width,
        height: widget.height,
        child: SvgPicture.memory(_svgBytes!, fit: widget.fit),
      );
    }

    // 普通图片：先查内存缓存，命中直接 Image.memory（零延迟）
    final memBytes = widget.cacheInMemory ? _avatarMemCache[resolvedUrl] : null;
    if (memBytes != null) {
      return SizedBox(
        width: widget.width,
        height: widget.height,
        child: Image.memory(memBytes,
            fit: widget.fit,
            cacheWidth: decodeWidth,
            cacheHeight: decodeHeight,
            errorBuilder: (_, __, ___) => error()),
      );
    }

    // 内存无缓存：走 CachedNetworkImage，同时异步写入内存缓存
    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      cacheManager: AuthCacheManager.instance,
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
      memCacheWidth: decodeWidth,
      memCacheHeight: decodeHeight,
      placeholder: (_, __) => widget.errorBuilder != null
          ? widget.errorBuilder!(context, 'loading', null)
          : placeholder(),
      imageBuilder: (ctx, imageProvider) {
        // 下载完成后写入内存缓存，下次直接用 Image.memory
        if (widget.cacheInMemory) _cacheToMemory(resolvedUrl);
        return Image(image: imageProvider, fit: widget.fit);
      },
      errorWidget: widget.errorBuilder != null
          ? (ctx, url, err) => widget.errorBuilder!(ctx, err, null)
          : (_, __, ___) => error(),
    );
  }

  int? _decodeDimension(BuildContext context, double? logicalSize) {
    if (logicalSize == null || logicalSize <= 0 || !logicalSize.isFinite) {
      return null;
    }
    final ratio = MediaQuery.devicePixelRatioOf(context);
    return (logicalSize * ratio).round().clamp(1, 2048);
  }

  void _cacheToMemory(String url) {
    if (_avatarMemCache.containsKey(url)) return;
    if (!_avatarMemLoads.add(url)) return;
    Future.microtask(() async {
      try {
        final cached = await AuthCacheManager.instance.getFileFromCache(url);
        if (cached != null) {
          _putAvatarMemCache(url, await cached.file.readAsBytes());
        }
      } catch (_) {
      } finally {
        _avatarMemLoads.remove(url);
      }
    });
  }
}

// ---------------------------------------------------------------------------

class _AuthHttpClient extends http.BaseClient {
  final http.Client _inner = http.Client();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    final url = request.url.toString();
    final token = _currentToken;
    final apiHost = Uri.tryParse(HttpClient.baseUrl)?.host;
    final needsAuth = token != null &&
        token.isNotEmpty &&
        ((apiHost != null && url.contains(apiHost)) || url.contains('/api/')) &&
        !url.contains('/api/admin/v1/public/'); // 公开资源不需要 token
    if (needsAuth) request.headers['Authorization'] = 'Bearer $token';
    return _inner.send(request);
  }

  @override
  void close() {
    _inner.close();
    super.close();
  }
}

class AuthCacheManager extends CacheManager {
  static final AuthCacheManager instance = AuthCacheManager._();

  AuthCacheManager._()
      : super(Config(
          'auth_img_cache_v2',
          stalePeriod: const Duration(days: 7),
          maxNrOfCacheObjects: 500,
          fileService: HttpFileService(httpClient: _AuthHttpClient()),
        ));
}
