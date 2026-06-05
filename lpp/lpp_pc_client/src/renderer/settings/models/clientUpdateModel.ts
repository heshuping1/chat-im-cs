import type {
  ClientUpdatePackageInfo,
  ClientUpdatePhase,
  ClientUpdateProgress,
  ClientUpdateState,
} from "../../../shared/desktop-api";

export function formatUpdateSize(sizeBytes: number | undefined) {
  if (!sizeBytes || sizeBytes <= 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function updatePackageSummary(updatePackage: ClientUpdatePackageInfo | undefined) {
  if (!updatePackage) return "";
  const kind = updatePackage.updateKind === "delta" ? "增量" : "全量";
  const force = updatePackage.force ? "，强制更新" : "";
  return `${kind}更新 ${updatePackage.version}，${formatUpdateSize(updatePackage.sizeBytes)}${force}`;
}

export function updateProgressText(progress: ClientUpdateProgress | undefined) {
  if (!progress) return "";
  const percent = Math.min(100, Math.max(0, progress.percent));
  return `${percent.toFixed(0)}% · ${formatUpdateSize(progress.transferred)} / ${formatUpdateSize(progress.total)}`;
}

export function updateStateCanDownload(state: ClientUpdateState) {
  return state.phase === "available" || state.phase === "error";
}

export function updateStateCanInstall(state: ClientUpdateState) {
  return state.phase === "downloaded";
}

export function updatePhaseLabelKey(phase: ClientUpdatePhase) {
  return `settings.helpAbout.update.phase.${phase}`;
}
