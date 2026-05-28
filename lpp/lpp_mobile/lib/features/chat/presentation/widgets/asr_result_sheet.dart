import 'package:flutter/material.dart';

/// 语音转文字结果弹窗
/// 用户可以编辑识别结果后发送，类似微信的"转文字"功能
class AsrResultSheet extends StatefulWidget {
  final String recognizedText;
  final double confidence;
  final void Function(String text) onSend;

  const AsrResultSheet({
    super.key,
    required this.recognizedText,
    required this.confidence,
    required this.onSend,
  });

  static Future<void> show(
    BuildContext context, {
    required String text,
    required double confidence,
    required void Function(String text) onSend,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AsrResultSheet(
        recognizedText: text,
        confidence: confidence,
        onSend: onSend,
      ),
    );
  }

  @override
  State<AsrResultSheet> createState() => _AsrResultSheetState();
}

class _AsrResultSheetState extends State<AsrResultSheet> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.recognizedText);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  bool get _isLowConf => widget.confidence < 0.7 && widget.confidence > 0;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.only(bottom: bottom),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 4),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.outline,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              '语音转文字',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1D2129),
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF2F2F7)),
          // Low confidence warning
          if (_isLowConf)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7E6),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFFD591)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      size: 16, color: Color(0xFFFA8C16)),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '识别可能不准确，请确认后再发送',
                      style: TextStyle(fontSize: 12, color: Color(0xFFD46B08)),
                    ),
                  ),
                ],
              ),
            ),
          // Text editor
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _ctrl,
              maxLines: 5,
              minLines: 2,
              autofocus: true,
              style: const TextStyle(
                  fontSize: 16, color: Color(0xFF1D2129), height: 1.5),
              decoration: InputDecoration(
                hintText: '识别结果...',
                hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
                filled: true,
                fillColor: const Color(0xFFF7F8FA),
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          // Confidence indicator
          if (widget.confidence > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const Text('识别置信度：',
                      style: TextStyle(fontSize: 12, color: Color(0xFF8E8E93))),
                  Text(
                    '${(widget.confidence * 100).toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: _isLowConf
                          ? const Color(0xFFFA8C16)
                          : const Color(0xFF00B27A),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          // Buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF8E8E93),
                      side: const BorderSide(color: Color(0xFFE5E5EA)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('取消'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      final text = _ctrl.text.trim();
                      if (text.isEmpty) return;
                      Navigator.of(context).pop();
                      widget.onSend(text);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00B27A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('发送'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
