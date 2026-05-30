import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function createVideoPlayerDocument({
  html,
  userDataPath,
}: {
  html: string;
  userDataPath: string;
}) {
  const directory = join(userDataPath, 'LPP Player');
  await mkdir(directory, { recursive: true });
  const filePath = join(directory, `video-player-${Date.now()}-${randomUUID()}.html`);
  await writeFile(filePath, html, 'utf8');
  return {
    filePath,
    fileUrl: pathToFileURL(filePath).toString(),
  };
}

export function removeVideoPlayerDocument(filePath: string) {
  void unlink(filePath).catch(() => {});
}
