import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AppInstanceProfilePayload } from '../shared/desktop-api.js';
import type { AppInstanceProfile } from './app-instance-profile.js';

interface StoredIdentity {
  id?: string;
}

export async function readOrCreateAppInstanceIdentity(
  profile: AppInstanceProfile,
): Promise<AppInstanceProfilePayload> {
  const [deviceId, clientInstanceId] = await Promise.all([
    readOrCreateIdentityFile(join(profile.defaultUserDataPath, 'shared', 'device-id.json')),
    readOrCreateIdentityFile(join(profile.userDataPath, 'instance-id.json')),
  ]);
  return {
    clientInstanceId,
    deviceId,
    profileId: profile.profileId,
    profileName: profile.profileName,
  };
}

async function readOrCreateIdentityFile(filePath: string) {
  const existing = await readIdentityFile(filePath);
  if (existing) return existing;
  const next = randomUUID();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify({ id: next }, null, 2), 'utf8');
  return next;
}

async function readIdentityFile(filePath: string) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8')) as StoredIdentity;
    return typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : null;
  } catch {
    return null;
  }
}
