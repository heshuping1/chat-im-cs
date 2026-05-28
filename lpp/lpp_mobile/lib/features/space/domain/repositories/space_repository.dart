import 'package:lpp_mobile/features/space/domain/entities/space_entity.dart';

abstract class SpaceRepository {
  /// 获取所有已登录空间列表
  Future<List<Space>> getSpaces();

  /// 切换到指定空间
  Future<void> switchSpace(String spaceId);
}
