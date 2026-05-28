import 'package:flutter/material.dart';

class ConversationListSkeleton extends StatelessWidget {
  const ConversationListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final base = colorScheme.surfaceContainerHighest.withValues(alpha: 0.72);
    final highlight = colorScheme.surface.withValues(alpha: 0.9);
    return CustomScrollView(
      physics: const NeverScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: _SkeletonBlock(
              height: 40,
              radius: 10,
              base: base,
              highlight: highlight,
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) => _SkeletonConversationTile(
              base: base,
              highlight: highlight,
            ),
            childCount: 9,
          ),
        ),
      ],
    );
  }
}

class _SkeletonConversationTile extends StatelessWidget {
  final Color base;
  final Color highlight;

  const _SkeletonConversationTile({
    required this.base,
    required this.highlight,
  });

  @override
  Widget build(BuildContext context) {
    final divider = Theme.of(context).dividerColor.withValues(alpha: 0.55);
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.only(left: 16),
      child: Row(
        children: [
          _SkeletonBlock(
            width: 48,
            height: 48,
            radius: 12,
            base: base,
            highlight: highlight,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              height: 72,
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: divider, width: 0.5)),
              ),
              padding: const EdgeInsets.only(right: 16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _SkeletonBlock(
                          height: 16,
                          radius: 4,
                          base: base,
                          highlight: highlight,
                        ),
                      ),
                      const SizedBox(width: 48),
                      _SkeletonBlock(
                        width: 36,
                        height: 12,
                        radius: 4,
                        base: base,
                        highlight: highlight,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  FractionallySizedBox(
                    widthFactor: 0.62,
                    child: _SkeletonBlock(
                      height: 13,
                      radius: 4,
                      base: base,
                      highlight: highlight,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonBlock extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  final Color base;
  final Color highlight;

  const _SkeletonBlock({
    this.width,
    required this.height,
    required this.radius,
    required this.base,
    required this.highlight,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [base, highlight, base],
        ),
      ),
    );
  }
}
