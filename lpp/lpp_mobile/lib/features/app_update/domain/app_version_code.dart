int parseAppVersionCode(String? buildNumber) {
  final parsed = int.tryParse((buildNumber ?? '').trim());
  if (parsed == null || parsed <= 0) return 1;
  return parsed;
}
