$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$outputExe = Join-Path $releaseDir "build-and-run-pc-windows.exe"

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$escapedRoot = $root.Path.Replace("\", "\\").Replace('"', '\"')

$source = @"
using System;
using System.Diagnostics;
using System.IO;

public static class BuildAndRunLauncher
{
    public static int Main(string[] args)
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string embeddedRoot = "$escapedRoot";
        string[] candidates = new string[]
        {
            Path.GetFullPath(Path.Combine(exeDir, "..", "bin", "build-and-run-pc-windows.bat")),
            Path.GetFullPath(Path.Combine(exeDir, "bin", "build-and-run-pc-windows.bat")),
            Path.Combine(embeddedRoot, "bin", "build-and-run-pc-windows.bat")
        };

        string batPath = null;
        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                batPath = candidate;
                break;
            }
        }

        if (batPath == null)
        {
            Console.Error.WriteLine("[LPP PC] Could not find bin\\build-and-run-pc-windows.bat.");
            Console.Error.WriteLine("[LPP PC] Keep this launcher inside the project release folder.");
            return 1;
        }

        string projectRoot = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(batPath), ".."));
        var process = new Process();
        process.StartInfo.FileName = "cmd.exe";
        process.StartInfo.Arguments = "/c \"\"" + batPath + "\"\"";
        process.StartInfo.WorkingDirectory = projectRoot;
        process.StartInfo.UseShellExecute = false;
        process.Start();
        process.WaitForExit();
        return process.ExitCode;
    }
}
"@

if (Test-Path $outputExe) {
  Remove-Item $outputExe -Force
}

Add-Type `
  -TypeDefinition $source `
  -Language CSharp `
  -OutputAssembly $outputExe `
  -OutputType ConsoleApplication

Write-Host "[LPP PC] Launcher created: $outputExe"
