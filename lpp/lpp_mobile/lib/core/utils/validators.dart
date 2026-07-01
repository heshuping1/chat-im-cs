/// 表单验证工具
abstract final class Validators {
  /// 中国大陆手机号：1 开头，第二位 3-9，共 11 位
  static bool isMobile(String value) =>
      RegExp(r'^1[3-9]\d{9}$').hasMatch(value.trim());

  /// 邮箱基础格式
  static bool isEmail(String value) =>
      RegExp(r'^[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}$').hasMatch(value.trim());

  /// 微界号：字母开头，6-20 位，仅字母/数字/下划线
  static bool isZtId(String value) =>
      RegExp(r'^[a-zA-Z][a-zA-Z0-9_]{5,19}$').hasMatch(value.trim());

  static String? validateMobile(String value) {
    if (value.trim().isEmpty) return '请输入手机号';
    if (!isMobile(value)) return '手机号格式不正确';
    return null;
  }

  static String? validateEmail(String value) {
    if (value.trim().isEmpty) return '请输入邮箱';
    if (!isEmail(value)) return '邮箱格式不正确';
    return null;
  }

  static String? validatePassword(String value) {
    if (value.isEmpty) return '请输入密码';
    if (value.length < 6) return '密码至少6位';
    return null;
  }
}
