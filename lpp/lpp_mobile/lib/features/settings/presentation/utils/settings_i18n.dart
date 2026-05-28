import 'package:lpp_mobile/l10n/app_localizations.dart';

String localizedTimezoneLabel(AppLocalizations l10n, double offset) {
  final prefix = localizedTimezoneOffsetLabel(offset);
  final name = switch (offset) {
    -10 => l10n.timezoneNameHawaii,
    -9 => l10n.timezoneNameAlaska,
    -8 => l10n.timezoneNamePacificTime,
    -7 => l10n.timezoneNameMountainTime,
    -6 => l10n.timezoneNameCentralTime,
    -5 => l10n.timezoneNameEasternTime,
    -4 => l10n.timezoneNameAtlanticTime,
    -3 => l10n.timezoneNameBrasilia,
    -1 => l10n.timezoneNameAzores,
    0 => l10n.timezoneNameLondonDublin,
    1 => l10n.timezoneNameBerlinParisRome,
    2 => l10n.timezoneNameCairoHelsinki,
    3 => l10n.timezoneNameMoscowRiyadh,
    3.5 => l10n.timezoneNameTehran,
    4 => l10n.timezoneNameDubaiBaku,
    4.5 => l10n.timezoneNameKabul,
    5 => l10n.timezoneNameKarachiTashkent,
    5.5 => l10n.timezoneNameMumbaiNewDelhi,
    5.75 => l10n.timezoneNameKathmandu,
    6 => l10n.timezoneNameDhakaAlmaty,
    6.5 => l10n.timezoneNameYangon,
    7 => l10n.timezoneNameBangkokHanoiJakarta,
    8 => l10n.timezoneNameBeijingShanghaiHongKongTaipei,
    9 => l10n.timezoneNameTokyoSeoul,
    9.5 => l10n.timezoneNameAdelaide,
    10 => l10n.timezoneNameSydneyMelbourne,
    11 => l10n.timezoneNameSolomonIslands,
    12 => l10n.timezoneNameAucklandFiji,
    _ => '',
  };
  return name.isEmpty ? prefix : '$prefix $name';
}

String localizedTimezoneOffsetLabel(double offset) {
  final totalMinutes = (offset * 60).round();
  final sign = totalMinutes >= 0 ? '+' : '-';
  final absMinutes = totalMinutes.abs();
  final hours = (absMinutes ~/ 60).toString().padLeft(2, '0');
  final minutes = (absMinutes % 60).toString().padLeft(2, '0');
  return 'UTC$sign$hours:$minutes';
}

String localizedNetworkModeLabel(AppLocalizations l10n, String mode) {
  return mode == 'proxy' ? l10n.networkProxyMode : l10n.networkDirectMode;
}

String localizedNetworkRouteLabel(AppLocalizations l10n, String route) {
  return switch (route) {
    'cn-1' => l10n.networkChinaTelecom,
    'cn-2' => l10n.networkChinaUnicom,
    'cn-3' => l10n.networkChinaMobile,
    'hk-1' => l10n.networkHongKongNode,
    'sg-1' => l10n.networkSingaporeNode,
    'jp-1' => l10n.networkJapanNode,
    'us-1' => l10n.networkUnitedStatesNode,
    _ => l10n.networkAutoSelect,
  };
}

List<String> networkRouteCodes(String mode) {
  return mode == 'proxy'
      ? const ['hk-1', 'sg-1', 'jp-1', 'us-1']
      : const ['auto', 'cn-1', 'cn-2', 'cn-3'];
}
