import 'package:flutter/material.dart';

enum IdentityBadgeTone { customer, service, admin, owner, official, employee }

class IdentityBadge extends StatelessWidget {
  final String label;
  final IdentityBadgeTone tone;
  final bool compact;

  const IdentityBadge({
    super.key,
    required this.label,
    required this.tone,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _colors(context, tone);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 4 : 6,
        vertical: compact ? 0 : 1.5,
      ),
      decoration: BoxDecoration(
        color: colors.$1,
        borderRadius: BorderRadius.circular(compact ? 4 : 5),
        border: Border.all(color: colors.$2),
      ),
      child: Text(
        label,
        strutStyle: const StrutStyle(forceStrutHeight: true, height: 1.1),
        style: TextStyle(
          fontSize: compact ? 10 : 11,
          height: 1.1,
          fontWeight: FontWeight.w600,
          color: colors.$3,
        ),
      ),
    );
  }

  static (Color, Color, Color) _colors(
    BuildContext context,
    IdentityBadgeTone tone,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    switch (tone) {
      case IdentityBadgeTone.customer:
        return isDark
            ? (
                const Color(0xFF123D2D),
                const Color(0xFF1F7A55),
                const Color(0xFF7BE0B2)
              )
            : (
                const Color(0xFFE8F8F1),
                const Color(0xFFB7E7D0),
                const Color(0xFF008A5A)
              );
      case IdentityBadgeTone.service:
        return isDark
            ? (
                const Color(0xFF102F4A),
                const Color(0xFF1F5A86),
                const Color(0xFF8BCBFF)
              )
            : (
                const Color(0xFFEAF4FF),
                const Color(0xFFB8DAFF),
                const Color(0xFF1976B8)
              );
      case IdentityBadgeTone.admin:
        return isDark
            ? (
                const Color(0xFF4A2B10),
                const Color(0xFF8A5A1F),
                const Color(0xFFFFC46B)
              )
            : (
                const Color(0xFFFFF4DF),
                const Color(0xFFFFD99A),
                const Color(0xFFB86B00)
              );
      case IdentityBadgeTone.owner:
        return isDark
            ? (
                const Color(0xFF422050),
                const Color(0xFF75408D),
                const Color(0xFFE2AAFF)
              )
            : (
                const Color(0xFFF6EAFE),
                const Color(0xFFE0C2F4),
                const Color(0xFF7A3BA0)
              );
      case IdentityBadgeTone.official:
        return isDark
            ? (
                const Color(0xFF45350A),
                const Color(0xFF8D7119),
                const Color(0xFFFFD95A)
              )
            : (
                const Color(0xFFFFF7D6),
                const Color(0xFFFFE28A),
                const Color(0xFF9A7600)
              );
      case IdentityBadgeTone.employee:
        return isDark
            ? (
                const Color(0xFF26313D),
                const Color(0xFF48586A),
                const Color(0xFFC8D3DE)
              )
            : (
                const Color(0xFFF1F4F7),
                const Color(0xFFD8E0E8),
                const Color(0xFF5A6673)
              );
    }
  }
}

class AvatarIdentityBadge extends StatelessWidget {
  final String label;
  final IdentityBadgeTone tone;
  final double size;

  const AvatarIdentityBadge({
    super.key,
    required this.label,
    required this.tone,
    this.size = 17,
  });

  @override
  Widget build(BuildContext context) {
    final colors = IdentityBadge._colors(context, tone);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.$3,
        shape: BoxShape.circle,
        border: Border.all(
          color: Theme.of(context).colorScheme.surface,
          width: 1.5,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(
          fontSize: size * 0.48,
          height: 1,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).colorScheme.surface,
        ),
      ),
    );
  }
}

({String label, String shortLabel, IdentityBadgeTone tone})? identityBadgeFor({
  int? userType,
  String? customerTag,
  int? membershipRole,
  bool official = false,
  bool includeEmployee = false,
}) {
  if (official) {
    return (
      label: '官方',
      shortLabel: '官',
      tone: IdentityBadgeTone.official,
    );
  }
  final tag = customerTag?.trim();
  if (tag == '所有者' || membershipRole == 4) {
    return (
      label: '所有者',
      shortLabel: '主',
      tone: IdentityBadgeTone.owner,
    );
  }
  if (tag == '管理员' || membershipRole == 3) {
    return (
      label: '管理员',
      shortLabel: '管',
      tone: IdentityBadgeTone.admin,
    );
  }
  if (tag == '客服' || membershipRole == 2) {
    return (
      label: '客服',
      shortLabel: '服',
      tone: IdentityBadgeTone.service,
    );
  }
  if (tag == '客户' || userType == 1) {
    return (
      label: '客户',
      shortLabel: '客',
      tone: IdentityBadgeTone.customer,
    );
  }
  if (includeEmployee && userType == 2) {
    return (
      label: '员工',
      shortLabel: '员',
      tone: IdentityBadgeTone.employee,
    );
  }
  return null;
}
