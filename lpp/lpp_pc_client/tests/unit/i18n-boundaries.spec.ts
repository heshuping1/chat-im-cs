import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx', '.cts']);

describe('i18n DDD boundaries', () => {
  const files = listSourceFiles(join(repoRoot, 'src', 'renderer'));

  it('keeps domain, data, model and runtime layers independent from presentation i18n', () => {
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

    const violations = files
      .filter((file) => guardedSegments.some((segment) => isUnder(file, segment)))
      .flatMap((file) => {
        const relativeFile = relative(file);
        const source = readFileSync(file, 'utf8');
        return forbiddenPatterns
          .filter((pattern) => pattern.test(source))
          .map((pattern) => `${relativeFile} matches ${pattern}`);
      });

    expect(violations).toEqual([]);
  });

  it('keeps i18n foundation free of feature imports', () => {
    const i18nFiles = files.filter((file) => isUnder(file, 'src/renderer/i18n'));
    const forbiddenImportTargets = [
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
    const violations = i18nFiles.flatMap((file) => {
      const relativeFile = relative(file);
      const source = readFileSync(file, 'utf8');
      return importsOf(source)
        .filter((specifier) =>
          forbiddenImportTargets.some((target) => specifier.startsWith(target)),
        )
        .map((specifier) => `${relativeFile} imports ${specifier}`);
    });

    expect(violations).toEqual([]);
  });
});

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) return listSourceFiles(filePath);
    return sourceExtensions.has(extname(filePath)) ? [filePath] : [];
  });
}

function importsOf(source: string) {
  return Array.from(
    source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
}

function isUnder(file: string, segment: string) {
  return relative(file).startsWith(segment);
}

function relative(file: string) {
  return file.replace(repoRoot, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
}
