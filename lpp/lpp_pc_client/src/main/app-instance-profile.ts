import type { app as ElectronApp } from 'electron';
import { join } from 'node:path';

export interface AppInstanceProfile {
  defaultUserDataPath: string;
  profileId: string | null;
  profileName: string;
  userDataPath: string;
}

export interface ProfileSource {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
}

const profileArgNames = new Set(['--profile', '--lpp-profile', '--pc-profile']);
const profileEnvNames = ['LPP_PC_PROFILE', 'LPP_PC_INSTANCE_PROFILE'];
export const appUserModelIdPrefix = 'com.lppchat.desktop';

export function configureAppInstanceProfile(
  app: Pick<typeof ElectronApp, 'getPath' | 'setPath' | 'setAppUserModelId'>,
  source: ProfileSource = { argv: process.argv, env: process.env },
): AppInstanceProfile {
  const defaultUserDataPath = app.getPath('userData');
  const profileId = resolveAppInstanceProfileId(source);
  if (!profileId) {
    return {
      defaultUserDataPath,
      profileId: null,
      profileName: 'main',
      userDataPath: defaultUserDataPath,
    };
  }

  const userDataPath = join(defaultUserDataPath, 'profiles', profileId);
  app.setPath('userData', userDataPath);
  if (process.platform === 'win32') {
    app.setAppUserModelId(appUserModelIdForProfile(profileId));
  }
  return {
    defaultUserDataPath,
    profileId,
    profileName: profileId,
    userDataPath,
  };
}

export function appUserModelIdForProfile(profileId: string | null) {
  return profileId ? `${appUserModelIdPrefix}.${profileId}` : appUserModelIdPrefix;
}

export function resolveAppInstanceProfileId(source: ProfileSource): string | null {
  const raw = readProfileArg(source.argv) ?? readProfileEnv(source.env);
  return normalizeProfileId(raw);
}

export function formatProfileWindowTitle(baseTitle: string, profileId: string | null) {
  return profileId ? `${baseTitle} (${profileId})` : baseTitle;
}

export function createNextProfileId(existingProfileIds: readonly string[]) {
  const existing = new Set(existingProfileIds);
  for (let index = 2; index < 100; index += 1) {
    const candidate = `client-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `client-${Date.now()}`;
}

export function buildAppProfileLaunchArgs(
  argv: readonly string[],
  profileId: string,
) {
  const args: string[] = [];
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name] = arg.split('=', 1);
    if (profileArgNames.has(name)) {
      if (!arg.includes('=')) index += 1;
      continue;
    }
    args.push(arg);
  }
  args.push(`--profile=${profileId}`);
  return args;
}

function readProfileArg(argv: readonly string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inlineValue] = arg.split('=', 2);
    if (profileArgNames.has(name)) {
      return inlineValue ?? argv[index + 1];
    }
  }
  return undefined;
}

function readProfileEnv(env: NodeJS.ProcessEnv) {
  for (const key of profileEnvNames) {
    const value = env[key];
    if (value) return value;
  }
  return undefined;
}

function normalizeProfileId(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 48);
  return normalized || null;
}
