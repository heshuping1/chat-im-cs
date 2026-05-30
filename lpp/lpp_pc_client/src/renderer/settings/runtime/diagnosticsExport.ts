import { createDiagnosticsExportPayload } from "../../data/diagnostics/diagnostics-package";

export async function exportCurrentDiagnosticsPackage() {
  return window.desktopApi?.exportDiagnostics(createDiagnosticsExportPayload()) ?? null;
}
