import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const _bg = Color(0xFFF2F2F7);
const _card = Colors.white;
const _text = Color(0xFF1C1C1E);
const _secondary = Color(0xFF8E8E93);
const _primary = Color(0xFF00B27A);
const _divider = Color(0xFFE5E5EA);

// ---------------------------------------------------------------------------
// ComplaintPage — 投诉页面（微信风格：列表选择投诉原因）
// ---------------------------------------------------------------------------

class ComplaintPage extends StatelessWidget {
  const ComplaintPage({super.key});

  static const _options = [
    '存在欺诈骗钱行为',
    '存在侵权行为',
    '发送不良信息',
    '骚扰他人',
    '散布谣言',
    '其他',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 18, color: _text),
          onPressed: () => context.pop(),
        ),
        title: const Text('投诉',
            style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w600, color: _text)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 16),
        children: [
          Container(
            color: _card,
            child: Column(
              children: _options.asMap().entries.map((e) {
                final i = e.key;
                final opt = e.value;
                return Column(
                  children: [
                    InkWell(
                      onTap: () => _submit(context, opt),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(opt,
                                  style: const TextStyle(
                                      fontSize: 15, color: _text)),
                            ),
                            const Icon(Icons.chevron_right,
                                size: 18, color: _secondary),
                          ],
                        ),
                      ),
                    ),
                    if (i < _options.length - 1)
                      const Divider(
                          height: 1, indent: 16, color: _divider),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  void _submit(BuildContext context, String reason) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16)),
        title: const Text('投诉已提交',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: Text('感谢你的反馈，我们会尽快处理「$reason」相关投诉。',
            style: const TextStyle(fontSize: 14, color: _secondary)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.pop(); // 返回群设置页
            },
            child: const Text('确定',
                style: TextStyle(
                    color: _primary, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
