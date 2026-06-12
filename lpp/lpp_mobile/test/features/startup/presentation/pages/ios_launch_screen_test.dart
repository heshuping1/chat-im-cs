import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS launch screen uses the full-screen loading artwork', () {
    final storyboard = File('ios/Runner/Base.lproj/LaunchScreen.storyboard');
    final contents = File(
      'ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json',
    );

    expect(storyboard.existsSync(), isTrue);
    expect(contents.existsSync(), isTrue);

    final storyboardSource = storyboard.readAsStringSync();
    final contentsSource = contents.readAsStringSync();

    expect(storyboardSource, contains('launchScreen="YES"'));
    expect(storyboardSource, contains('contentMode="scaleAspectFill"'));
    expect(storyboardSource, contains('image="LaunchImage"'));
    expect(storyboardSource, contains('firstAttribute="leading"'));
    expect(storyboardSource, contains('firstAttribute="top"'));
    expect(storyboardSource, contains('firstAttribute="trailing"'));
    expect(storyboardSource, contains('firstAttribute="bottom"'));

    expect(contentsSource, contains('"filename" : "LaunchImage.png"'));
    expect(contentsSource, contains('"filename" : "LaunchImage@2x.png"'));
    expect(contentsSource, contains('"filename" : "LaunchImage@3x.png"'));

    expect(_pngSize('LaunchImage.png'), const Size(390, 844));
    expect(_pngSize('LaunchImage@2x.png'), const Size(780, 1688));
    expect(_pngSize('LaunchImage@3x.png'), const Size(1170, 2532));
  });
}

Size _pngSize(String filename) {
  final file =
      File('ios/Runner/Assets.xcassets/LaunchImage.imageset/$filename');
  expect(file.existsSync(), isTrue);

  final data = file.readAsBytesSync();
  final bytes = ByteData.sublistView(Uint8List.fromList(data));
  return Size(bytes.getUint32(16), bytes.getUint32(20));
}

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
