import { app, safeStorage } from 'electron';
import { dirname, join } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import type { DesktopAuthSessionPayload } from '../shared/desktop-api.js';

const secureAuthSessionFileName = 'auth-session.bin';

export async function readSecureAuthSession(): Promise<DesktopAuthSessionPayload | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await readFile(secureAuthSessionPath());
    const raw = safeStorage.decryptString(encrypted);
    const payload = JSON.parse(raw) as DesktopAuthSessionPayload;
    if (!payload || typeof payload !== 'object' || !payload.tenantToken) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function saveSecureAuthSession(payload: DesktopAuthSessionPayload) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统安全存储不可用，无法保存登录态');
  }
  const filePath = secureAuthSessionPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, safeStorage.encryptString(JSON.stringify(payload)));
}

export async function clearSecureAuthSession() {
  await rm(secureAuthSessionPath(), { force: true });
}

function secureAuthSessionPath() {
  return join(app.getPath('userData'), 'secure', secureAuthSessionFileName);
}
