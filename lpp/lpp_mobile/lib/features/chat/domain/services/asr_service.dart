import 'dart:async';

import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// ASR 服务抽象接口
abstract class AsrService {
  Future<AsrResult> transcribe(String audioFilePath,
      {String language = 'zh-CN'});
  Future<void> startListening({
    required void Function(String text, double confidence) onResult,
    String language = 'zh-CN',
  });
  Future<void> stopListening();
}

class AsrResult {
  final String text;
  final double confidence;
  bool get isLowConfidence => confidence < 0.7 && confidence > 0;

  const AsrResult({required this.text, required this.confidence});
}

class DeviceAsrService implements AsrService {
  final SpeechToText _speech = SpeechToText();
  bool _initialized = false;
  String _lastText = '';
  double _lastConfidence = 0;

  @override
  Future<AsrResult> transcribe(String audioFilePath,
      {String language = 'zh-CN'}) async {
    return AsrResult(text: _lastText, confidence: _lastConfidence);
  }

  @override
  Future<void> startListening({
    required void Function(String text, double confidence) onResult,
    String language = 'zh-CN',
  }) async {
    final ready = await _ensureInitialized();
    if (!ready) {
      onResult('', 0);
      return;
    }
    _lastText = '';
    _lastConfidence = 0;
    await _speech.listen(
      localeId: _normalizeLocale(language),
      listenOptions: SpeechListenOptions(
        listenMode: ListenMode.dictation,
        partialResults: true,
      ),
      onResult: (SpeechRecognitionResult result) {
        _lastText = result.recognizedWords;
        _lastConfidence = result.confidence <= 0 ? 0.8 : result.confidence;
        onResult(_lastText, _lastConfidence);
      },
    );
  }

  @override
  Future<void> stopListening() async {
    if (!_initialized) return;
    await _speech.stop();
  }

  Future<bool> _ensureInitialized() async {
    if (_initialized) return true;
    _initialized = await _speech.initialize();
    return _initialized;
  }

  String _normalizeLocale(String language) {
    return language.replaceAll('-', '_');
  }
}

/// 全局实例
final deviceAsrService = DeviceAsrService();
