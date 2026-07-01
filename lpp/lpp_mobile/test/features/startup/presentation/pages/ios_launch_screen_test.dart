import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/branding/app_brand_assets.dart';

void main() {
  test('iOS launch screen uses the full-screen loading artwork', () {
    final storyboard = File('ios/Runner/Base.lproj/LaunchScreen.storyboard');
    final primaryContents = File(
      'ios/Runner/Assets.xcassets/WeijieLaunchImage.imageset/Contents.json',
    );
    final fallbackContents =
        File('ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json');

    expect(storyboard.existsSync(), isTrue);
    expect(primaryContents.existsSync(), isTrue);
    expect(fallbackContents.existsSync(), isTrue);

    final storyboardSource = storyboard.readAsStringSync();
    final primaryContentsSource = primaryContents.readAsStringSync();

    expect(storyboardSource, contains('launchScreen="YES"'));
    expect(storyboardSource, contains('contentMode="scaleAspectFill"'));
    expect(storyboardSource, contains('image="WeijieLaunchImage"'));
    expect(storyboardSource, isNot(contains('image="LaunchImage"')));
    expect(storyboardSource, contains('firstAttribute="leading"'));
    expect(storyboardSource, contains('firstAttribute="top"'));
    expect(storyboardSource, contains('firstAttribute="trailing"'));
    expect(storyboardSource, contains('firstAttribute="bottom"'));

    expect(
      primaryContentsSource,
      contains('"filename" : "WeijieLaunchImage.png"'),
    );
    expect(
      primaryContentsSource,
      contains('"filename" : "WeijieLaunchImage@2x.png"'),
    );
    expect(
      primaryContentsSource,
      contains('"filename" : "WeijieLaunchImage@3x.png"'),
    );

    expect(
      _pngSize('WeijieLaunchImage.imageset/WeijieLaunchImage.png'),
      const Size(390, 844),
    );
    expect(
      _pngSize('WeijieLaunchImage.imageset/WeijieLaunchImage@2x.png'),
      const Size(780, 1688),
    );
    expect(
      _pngSize('WeijieLaunchImage.imageset/WeijieLaunchImage@3x.png'),
      const Size(1170, 2532),
    );
    expect(
        _pngSize('LaunchImage.imageset/LaunchImage.png'), const Size(390, 844));
    expect(
      _pngSize('LaunchImage.imageset/LaunchImage@2x.png'),
      const Size(780, 1688),
    );
    expect(
      _pngSize('LaunchImage.imageset/LaunchImage@3x.png'),
      const Size(1170, 2532),
    );
  });

  test('iOS launch fallback artwork stays aligned with the primary artwork',
      () {
    final sourceArtwork = File(AppBrandAssets.loadingPage);
    final primaryArtwork = File(
      'ios/Runner/Assets.xcassets/WeijieLaunchImage.imageset/'
      'WeijieLaunchImage@3x.png',
    );
    final fallbackArtwork = File(
      'ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@3x.png',
    );

    expect(sourceArtwork.existsSync(), isTrue);
    expect(primaryArtwork.existsSync(), isTrue);
    expect(fallbackArtwork.existsSync(), isTrue);
    expect(_sha256(primaryArtwork), _sha256(fallbackArtwork));
  });
}

Size _pngSize(String assetPath) {
  final file = File('ios/Runner/Assets.xcassets/$assetPath');
  expect(file.existsSync(), isTrue);

  final data = file.readAsBytesSync();
  final bytes = ByteData.sublistView(Uint8List.fromList(data));
  return Size(bytes.getUint32(16), bytes.getUint32(20));
}

String _sha256(File file) => sha256.convert(file.readAsBytesSync()).toString();

class Size {
  const Size(this.width, this.height);

  final int width;
  final int height;

  @override
  bool operator ==(Object other) =>
      other is Size && other.width == width && other.height == height;

  @override
  int get hashCode => Object.hash(width, height);

  @override
  String toString() => '${width}x$height';
}
