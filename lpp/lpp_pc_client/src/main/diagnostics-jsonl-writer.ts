import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface DiagnosticsJsonlWriterOptions {
  filePath: string;
  maxLines: number;
}

export class DiagnosticsJsonlWriter {
  private lineCount: number | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly options: DiagnosticsJsonlWriterOptions) {}

  write(payload: unknown) {
    const next = this.queue.then(() => this.writeNow(payload));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async writeNow(payload: unknown) {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await appendFile(this.options.filePath, `${JSON.stringify(payload)}\n`, 'utf8');
    if (this.lineCount === undefined) {
      await this.compact();
      return;
    }
    this.lineCount += 1;
    if (this.lineCount > this.options.maxLines) {
      await this.compact();
    }
  }

  private async compact() {
    let lines: string[] = [];
    try {
      const existing = await readFile(this.options.filePath, 'utf8');
      lines = existing
        .split(/\r?\n/)
        .filter((line) => isValidJsonLine(line))
        .slice(-Math.max(1, this.options.maxLines));
    } catch {
      lines = [];
    }
    await writeFile(
      this.options.filePath,
      lines.length > 0 ? `${lines.join('\n')}\n` : '',
      'utf8',
    );
    this.lineCount = lines.length;
  }
}

function isValidJsonLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
