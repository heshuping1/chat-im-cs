import 'package:flutter/material.dart';
import 'package:lpp_mobile/core/widgets/identity_badge.dart';
import 'package:lpp_mobile/core/widgets/user_avatar.dart';

class PersonAvatarWithBadge extends StatelessWidget {
  final String? avatarUrl;
  final String name;
  final double size;
  final double borderRadius;
  final bool isOnline;
  final bool isMyAvatar;
  final int? userType;
  final String? customerTag;
  final int? membershipRole;
  final bool official;
  final bool includeEmployee;
  final bool showIdentity;
  final double badgeSize;
  final String? badgeLabel;
  final IdentityBadgeTone? badgeTone;

  const PersonAvatarWithBadge({
    super.key,
    this.avatarUrl,
    required this.name,
    this.size = 48,
    double? borderRadius,
    this.isOnline = false,
    this.isMyAvatar = false,
    this.userType,
    this.customerTag,
    this.membershipRole,
    this.official = false,
    this.includeEmployee = false,
    this.showIdentity = true,
    this.badgeSize = 17,
    this.badgeLabel,
    this.badgeTone,
  }) : borderRadius = borderRadius ?? size / 4;

  @override
  Widget build(BuildContext context) {
    final derivedIdentity = showIdentity
        ? identityBadgeFor(
            userType: userType,
            customerTag: customerTag,
            membershipRole: membershipRole,
            official: official,
            includeEmployee: includeEmployee,
          )
        : null;
    final effectiveBadgeLabel =
        showIdentity ? (badgeLabel ?? derivedIdentity?.shortLabel) : null;
    final effectiveBadgeTone =
        showIdentity ? (badgeTone ?? derivedIdentity?.tone) : null;
    final hasBadge = effectiveBadgeLabel != null && effectiveBadgeTone != null;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          UserAvatar(
            avatarUrl: avatarUrl,
            name: name,
            size: size,
            borderRadius: borderRadius,
            isMyAvatar: isMyAvatar,
          ),
          if (isOnline)
            Positioned(
              right: hasBadge ? 2 : 0,
              top: hasBadge ? 0 : null,
              bottom: hasBadge ? null : 0,
              child: Container(
                width: size * 0.25,
                height: size * 0.25,
                decoration: BoxDecoration(
                  color: const Color(0xFF00B27A),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Theme.of(context).colorScheme.surface,
                    width: 2,
                  ),
                ),
              ),
            ),
          if (hasBadge)
            Positioned(
              right: -2,
              bottom: -2,
              child: AvatarIdentityBadge(
                label: effectiveBadgeLabel,
                tone: effectiveBadgeTone,
                size: badgeSize,
              ),
            ),
        ],
      ),
    );
  }
}
