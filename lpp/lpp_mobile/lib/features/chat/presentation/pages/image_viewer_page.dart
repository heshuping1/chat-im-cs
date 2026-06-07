import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/platform/local_file.dart';
import 'package:lpp_mobile/core/widgets/app_network_image.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_open_controller.dart';

class ImageViewerItem {
  final String conversationId;
  final String messageId;
  final MediaResource media;

  const ImageViewerItem({
    required this.conversationId,
    required this.messageId,
    required this.media,
  });

  factory ImageViewerItem.fromMessage({
    required Message message,
    required MediaResource media,
  }) {
    return ImageViewerItem(
      conversationId: message.conversationId,
      messageId: message.messageId,
      media: media,
    );
  }
}

/// 全屏图片预览页
/// 支持 PageView 多图浏览 + InteractiveViewer 双指缩放
class ImageViewerPage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  final List<ImageViewerItem>? items;
  final int initialIndex;
  final String? token;

  const ImageViewerPage({
    super.key,
    required this.imageUrls,
    this.items,
    this.initialIndex = 0,
    this.token,
  });

  @override
  ConsumerState<ImageViewerPage> createState() => _ImageViewerPageState();
}

class _ImageViewerPageState extends ConsumerState<ImageViewerPage> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _pageController.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: widget.imageUrls.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (_, i) {
              final item = widget.items != null && i < widget.items!.length
                  ? widget.items![i]
                  : null;
              return InteractiveViewer(
                minScale: 0.5,
                maxScale: 5.0,
                child: Center(
                  child: _ViewerImage(
                    item: item,
                    fallbackUrl: widget.imageUrls[i],
                  ),
                ),
              );
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.close,
                        color: Theme.of(context).colorScheme.surface, size: 28),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const Spacer(),
                  if (widget.imageUrls.length > 1)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_currentIndex + 1} / ${widget.imageUrls.length}',
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.surface,
                            fontSize: 14),
                      ),
                    ),
                  const Spacer(),
                  const SizedBox(width: 48),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ViewerImage extends ConsumerStatefulWidget {
  final ImageViewerItem? item;
  final String fallbackUrl;

  const _ViewerImage({
    required this.item,
    required this.fallbackUrl,
  });

  @override
  ConsumerState<_ViewerImage> createState() => _ViewerImageState();
}

class _ViewerImageState extends ConsumerState<_ViewerImage> {
  int _attempt = 0;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final spaceId = ref.watch(currentSpaceProvider)?.spaceId;
    if (item == null || spaceId == null) {
      return _networkImage(widget.fallbackUrl);
    }

    return FutureBuilder<String>(
      key: ValueKey('${item.messageId}-${item.media.url}-$_attempt'),
      future: ref.read(mediaOpenControllerProvider(spaceId)).localPathFor(
            MediaOpenRequest(
              conversationId: item.conversationId,
              messageId: item.messageId,
              mediaKind: MediaKind.image,
              variant: MediaVariant.original,
              remoteUrl: item.media.url,
              fileName: item.media.fileName?.trim().isNotEmpty == true
                  ? item.media.fileName!.trim()
                  : 'image.jpg',
              mimeType: item.media.mimeType,
              sizeBytes: item.media.sizeBytes,
            ),
          ),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return localImageWidget(
            snapshot.data!,
            fit: BoxFit.contain,
          );
        }
        if (snapshot.hasError) {
          return _error();
        }
        return Stack(
          alignment: Alignment.center,
          children: [
            _networkImage(item.media.thumbnailUrl ?? widget.fallbackUrl),
            const Positioned.fill(
              child: ColoredBox(color: Color(0x66000000)),
            ),
            CircularProgressIndicator(
              color: Theme.of(context).colorScheme.surface,
            ),
          ],
        );
      },
    );
  }

  Widget _networkImage(String url) {
    return AppNetworkImage(
      url: url,
      fit: BoxFit.contain,
      placeholderBuilder: (_) => Center(
        child: CircularProgressIndicator(
          color: Theme.of(context).colorScheme.surface,
        ),
      ),
      errorBuilder: (_) => _error(),
    );
  }

  Widget _error() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.broken_image, size: 64, color: Colors.white54),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() => _attempt++),
          child: Text(
            '重试',
            style: TextStyle(color: Theme.of(context).colorScheme.surface),
          ),
        ),
      ],
    );
  }
}
