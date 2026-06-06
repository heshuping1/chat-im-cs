import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/features/chat/data/datasources/group_invite_qr_api.dart';

final groupInviteQrProvider =
    FutureProvider.family<GroupInviteQr, String>((ref, groupId) async {
  final api = GroupInviteQrApi(ref.watch(dioProvider));
  final existing = await api.listActive(groupId);
  final reusable = existing.where((item) => item.isUsable).firstOrNull;
  if (reusable != null) return reusable;
  return api.create(groupId);
});
