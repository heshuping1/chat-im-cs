import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/widgets/setting_tile.dart';
import 'package:lpp_mobile/features/profile/domain/entities/profile_entities.dart';
import 'package:lpp_mobile/features/profile/presentation/providers/profile_providers.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

class FeedbackPage extends ConsumerStatefulWidget {
  const FeedbackPage({super.key});

  @override
  ConsumerState<FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends ConsumerState<FeedbackPage> {
  String _type = 'suggestion';
  bool _submitting = false;
  final _contentCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();

  @override
  void dispose() {
    _contentCtrl.dispose();
    _contactCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final l10n = AppLocalizations.of(context);
    if (_contentCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.feedbackContent)));
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Text(l10n.feedbackSubmit),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l10n.commonCancel,
                style: const TextStyle(color: Color(0xFF8E8E93))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _submitting = true);
              try {
                await ref.read(profileRepositoryProvider).submitFeedback(
                      FeedbackRequest(
                        type: _type,
                        content: _contentCtrl.text.trim(),
                        contactInfo: _contactCtrl.text.trim().isEmpty
                            ? null
                            : _contactCtrl.text.trim(),
                      ),
                    );
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.feedbackSuccess)));
                Navigator.of(context).maybePop();
              } catch (_) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.feedbackFailed)));
                }
              } finally {
                if (mounted) setState(() => _submitting = false);
              }
            },
            child: Text(l10n.commonConfirm,
                style: const TextStyle(color: Color(0xFF00B27A))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: null,
      appBar: buildSettingsAppBar(context, l10n.feedbackTitle),
      body: ListView(
        children: [
          const SizedBox(height: 16),
          // Type selector
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.feedbackContent,
                    style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.55))),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _TypeBtn(
                        label: l10n.feedbackTypeSuggestion,
                        id: 'suggestion',
                        selected: _type == 'suggestion',
                        onTap: () => setState(() => _type = 'suggestion')),
                    const SizedBox(width: 8),
                    _TypeBtn(
                        label: l10n.feedbackTypeComplaint,
                        id: 'complaint',
                        selected: _type == 'complaint',
                        onTap: () => setState(() => _type = 'complaint')),
                    const SizedBox(width: 8),
                    _TypeBtn(
                        label: l10n.feedbackTypeBug,
                        id: 'bug',
                        selected: _type == 'bug',
                        onTap: () => setState(() => _type = 'bug')),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Content
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.feedbackContent,
                    style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.55))),
                const SizedBox(height: 8),
                TextField(
                  controller: _contentCtrl,
                  maxLines: 6,
                  maxLength: 500,
                  decoration: InputDecoration(
                    hintText: l10n.feedbackContentHint,
                    hintStyle: TextStyle(
                        color: colorScheme.onSurface.withValues(alpha: 0.38),
                        fontSize: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          BorderSide(color: Theme.of(context).dividerColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          BorderSide(color: Theme.of(context).dividerColor),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF00B27A)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Contact
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.feedbackContact,
                    style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.55))),
                const SizedBox(height: 8),
                TextField(
                  controller: _contactCtrl,
                  decoration: InputDecoration(
                    hintText: l10n.feedbackContact,
                    hintStyle: TextStyle(
                        color: colorScheme.onSurface.withValues(alpha: 0.38),
                        fontSize: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          BorderSide(color: Theme.of(context).dividerColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide:
                          BorderSide(color: Theme.of(context).dividerColor),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF00B27A)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ElevatedButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: const Icon(Icons.send, size: 18),
              label: Text(l10n.feedbackSubmit),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00B27A),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              '提示：\n• 我们会在1-3个工作日内处理您的反馈\n• 如果您留下了联系方式，我们会及时回复处理结果\n• 感谢您帮助我们改进产品',
              style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.55),
                  height: 1.6),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _TypeBtn extends StatelessWidget {
  final String label;
  final String id;
  final bool selected;
  final VoidCallback onTap;

  const _TypeBtn({
    required this.label,
    required this.id,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? const Color(0xFF00B27A)
                : colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: selected ? Colors.white : colorScheme.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}
