import { readFile } from "node:fs/promises";
import { join } from "node:path";

const metadataPath = process.env.LPP_UPDATE_METADATA_PATH || join(process.cwd(), "release", "update-metadata.json");
const publishUrl = process.env.LPP_UPDATE_PUBLISH_URL || "";
const token = process.env.LPP_UPDATE_PUBLISH_TOKEN || "";
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

if (!publishUrl) {
  console.log("LPP_UPDATE_PUBLISH_URL is not configured. Metadata payload:");
  console.log(JSON.stringify(metadata, null, 2));
  process.exit(0);
}

const response = await fetch(publishUrl, {
  body: JSON.stringify(metadata),
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  method: "POST",
});

if (!response.ok) {
  const body = await response.text().catch(() => "");
  throw new Error(`Publish failed: HTTP ${response.status}${body ? ` ${body}` : ""}`);
}

console.log(`Published Windows update metadata to ${publishUrl}`);
