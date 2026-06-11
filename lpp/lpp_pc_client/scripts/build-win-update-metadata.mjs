import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const args = new Set(process.argv.slice(2));
const releaseDir = join(process.cwd(), "release");
const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
const version = String(packageJson.version);
const fromVersion = valueAfter("--from-version=") || process.env.startlink_UPDATE_FROM_VERSION || "";
const baseUrl = trimTrailingSlash(process.env.startlink_UPDATE_BASE_URL || "");

const entries = await readdir(releaseDir).catch(() => []);
const installerName = findInstaller(entries);
if (!installerName) {
  throw new Error(`No Windows installer found in ${releaseDir}. Run npm run build:win:full first.`);
}

const installerPath = join(releaseDir, installerName);
const installerStat = await stat(installerPath);
const installerSha512 = await sha512(installerPath);
const latestYmlName = entries.find((entry) => entry.toLowerCase() === "latest.yml");
const installerBlockmapName =
  entries.find((entry) => entry === `${installerName}.blockmap`) ??
  entries.find(
    (entry) =>
      entry.toLowerCase().startsWith("startlink-") && entry.toLowerCase().endsWith(".exe.blockmap"),
  ) ??
  entries.find((entry) => entry.toLowerCase().endsWith(".exe.blockmap"));
const blockmapInfo = installerBlockmapName ? await fileInfo(join(releaseDir, installerBlockmapName)) : undefined;

const fullPackage = {
  arch: "x64",
  installerUrl: urlFor(installerName),
  latestYmlUrl: latestYmlName ? urlFor(latestYmlName) : undefined,
  platform: "windows",
  sha512: installerSha512,
  sizeBytes: installerStat.size,
  version,
};

const metadata = {
  appId: "startlink",
  generatedAt: new Date().toISOString(),
  fullPackage,
  deltaPackage: buildDeltaPackage(installerBlockmapName),
};

const outputPath = join(releaseDir, "update-metadata.json");
await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(metadata, null, 2));

function buildDeltaPackage(blockmapName) {
  if (!args.has("--delta") && !fromVersion) return undefined;
  if (!fromVersion) {
    throw new Error("Delta metadata requires --from-version=x.y.z or startlink_UPDATE_FROM_VERSION.");
  }
  if (!blockmapName) {
    throw new Error("No .blockmap artifact found. electron-builder must produce blockmap metadata first.");
  }
  return {
    arch: "x64",
    fallbackFullPackageUrl: fullPackage.installerUrl,
    fallbackSha512: fullPackage.sha512,
    fromVersion,
    patchUrl: urlFor(blockmapName),
    platform: "windows",
    sha512: blockmapInfo?.sha512,
    sizeBytes: blockmapInfo?.sizeBytes,
    toVersion: version,
  };
}

function findInstaller(entryNames) {
  const expectedName = `startlink-${version}-win-x64.exe`;
  if (entryNames.includes(expectedName)) return expectedName;
  return (
    entryNames.find(
      (entry) => entry.toLowerCase().startsWith("startlink-") && extname(entry).toLowerCase() === ".exe",
    ) ??
    entryNames.find((entry) => extname(entry).toLowerCase() === ".exe" && !entry.includes("uninstaller"))
  );
}

function urlFor(fileName) {
  return baseUrl ? `${baseUrl}/${encodeURIComponent(fileName)}` : fileName;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function valueAfter(prefix) {
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : "";
}

function sha512(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha512");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("base64")));
  });
}

async function fileInfo(filePath) {
  const fileStat = await stat(filePath);
  return {
    sha512: await sha512(filePath),
    sizeBytes: fileStat.size,
  };
}
