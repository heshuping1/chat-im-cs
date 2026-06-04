import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative as relativePath } from 'node:path';

const repoRoot = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx', '.cts']);
const guardedSegments = [
  'src/renderer/data',
  'src/renderer/messages/models',
  'src/renderer/settings/models',
  'src/renderer/spaces/models',
  'src/renderer/contacts/models',
  'src/renderer/composer/domain',
  'src/renderer/composer/runtime',
  'src/renderer/messages/runtime',
  'src/renderer/settings/runtime',
];
const forbiddenPatterns = [
  /\buseI18n\b/,
  /\bI18nProvider\b/,
  /\bI18nContext\b/,
  /\bt\s*\(/,
  /\blocaleLabels\b/,
];
const forbiddenI18nImportTargets = [
  '../components',
  '../customer-service',
  '../data',
  '../messages',
  '../settings',
  '../spaces',
  '../translation',
  './components',
  './data',
];

const files = listSourceFiles(join(repoRoot, 'src', 'renderer'));
const violations = [
  ...findLayerViolations(files),
  ...findI18nReverseDependencyViolations(files),
];

if (violations.length > 0) {
  console.error('i18n boundary violations:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
}

function findLayerViolations(files) {
  return files
    .filter((file) => guardedSegments.some((segment) => isUnder(file, segment)))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${relative(file)} matches ${pattern}`);
    });
}

function findI18nReverseDependencyViolations(files) {
  return files
    .filter((file) => isUnder(file, 'src/renderer/i18n'))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return importsOf(source)
        .filter((specifier) =>
          forbiddenI18nImportTargets.some((target) => specifier.startsWith(target)),
        )
        .map((specifier) => `${relative(file)} imports ${specifier}`);
    });
}

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listSourceFiles(filePath);
    return sourceExtensions.has(extname(filePath)) ? [filePath] : [];
  });
}

function importsOf(source) {
  return Array.from(
    source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
}

function isUnder(file, segment) {
  return relative(file).startsWith(segment);
}

function relative(file) {
  return relativePath(repoRoot, file).replace(/\\/g, '/');
}
