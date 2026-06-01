import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pcAutomationFeatureMatrix, summarizePcAutomationMatrix } from './pc-automation-feature-matrix.mjs';

const root = process.cwd();
const suite = normalizeSuite(process.argv[2] || 'daily');
const runStartedAt = new Date();
const reportDir = join(root, '..', 'reports', 'pc', `automation-${suite}`, runStartedAt.toISOString().replace(/[:.]/g, '-'));
const commandPlans = buildCommandPlans(suite);
const commandResults = [];

await mkdir(reportDir, { recursive: true });

try {
  if (suite !== 'matrix') {
    for (const plan of commandPlans) {
      commandResults.push(await runCommandPlan(plan));
      if (commandResults.at(-1).status === 'failed' && plan.stopOnFailure) break;
    }
  }
} catch (error) {
  commandResults.push({
    name: 'runner',
    status: 'failed',
    exitCode: 1,
    timedOut: false,
    startedAt: runStartedAt.toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - runStartedAt.getTime(),
    error: shortError(error),
  });
} finally {
  await writeSummary();
}

if (commandResults.some((result) => result.status === 'failed')) {
  process.exitCode = 1;
}

function normalizeSuite(value) {
  if (['daily', 'weekly', 'matrix'].includes(value)) return value;
  throw new Error(`Unknown PC automation suite: ${value}. Expected daily, weekly, or matrix.`);
}

function buildCommandPlans(targetSuite) {
  const daily = [
    command('typecheck', ['run', 'typecheck'], { stopOnFailure: true }),
    command('build', ['run', 'build'], { stopOnFailure: true }),
    command('lint:boundaries', ['run', 'lint:boundaries'], { stopOnFailure: true }),
    command('test:core', ['run', 'test:core'], { stopOnFailure: true }),
    command('test:browser', ['run', 'test:browser'], { stopOnFailure: false }),
    command('test:electron:chat', ['run', 'test:electron:chat'], { stopOnFailure: false }),
    command('test:electron:group-chat:smoke', ['run', 'test:electron:group-chat:smoke'], { stopOnFailure: false }),
    command('test:electron:regression', ['run', 'test:electron:regression'], { stopOnFailure: false }),
  ];
  const weekly = [
    ...daily,
    command('lint:core', ['run', 'lint:core'], { stopOnFailure: false }),
    command('lint:hooks', ['run', 'lint:hooks'], { stopOnFailure: false }),
    command('lint:shape', ['run', 'lint:shape'], { stopOnFailure: false }),
    command('docs:check', ['run', 'docs:check'], { stopOnFailure: false }),
    command('test:coverage:core', ['run', 'test:coverage:core'], { stopOnFailure: false }),
    command('test:electron:group-chat:full', ['run', 'test:electron:group-chat:full'], { stopOnFailure: false }),
  ];
  return targetSuite === 'daily' ? daily : weekly;
}

function command(name, args, options = {}) {
  const invocation = npmInvocation(args);
  return {
    name,
    executable: invocation.executable,
    args: invocation.args,
    stopOnFailure: Boolean(options.stopOnFailure),
    timeoutMs: options.timeoutMs || defaultTimeoutFor(name),
  };
}

function npmInvocation(args) {
  if (process.platform === 'win32') {
    return {
      executable: 'cmd.exe',
      args: ['/c', 'npm.cmd', ...args],
    };
  }
  return {
    executable: 'npm',
    args,
  };
}

function defaultTimeoutFor(name) {
  if (name === 'test:electron:regression') return 8 * 60_000;
  if (name.startsWith('test:electron')) return 3 * 60_000;
  if (name === 'test:browser') return 10 * 60_000;
  if (name === 'build') return 10 * 60_000;
  return 5 * 60_000;
}

async function runCommandPlan(plan) {
  const startedAt = new Date();
  const logPath = join(reportDir, `${sanitizeFileName(plan.name)}.log`);
  let output = '';
  let timedOut = false;
  let spawnError = null;
  const child = spawn(plan.executable, plan.args, {
    cwd: root,
    shell: false,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
  });
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stderr.write(text);
  });
  const closePromise = new Promise((resolve) => {
    child.on('error', (error) => {
      spawnError = error;
      output += `\n[spawn-error] ${error.message}\n`;
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(async () => {
      timedOut = true;
      output += `\n[timeout] ${plan.name} exceeded ${plan.timeoutMs}ms; killing process tree.\n`;
      await killProcessTree(child);
      resolve(124);
    }, plan.timeoutMs);
  });
  const exitCode = await Promise.race([closePromise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  await writeFile(logPath, output);
  const endedAt = new Date();
  return {
    name: plan.name,
    status: exitCode === 0 && !timedOut ? 'passed' : 'failed',
    exitCode,
    timedOut,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    logPath,
    stopOnFailure: plan.stopOnFailure,
    ...(spawnError ? { error: shortError(spawnError) } : {}),
  };
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('error', () => resolve());
      killer.on('close', () => resolve());
    });
    return;
  }
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function writeSummary() {
  const matrix = summarizePcAutomationMatrix(suite === 'matrix' ? 'weekly' : suite);
  const commandCoverage = mapCommandCoverage(matrix.scenarios);
  const uncoveredHardGateScenarios = matrix.scenarios.filter(
    (scenario) =>
      (scenario.priority === 'P0' || scenario.priority === 'P1') &&
      (scenario.automation === 'gap' || scenario.commands.length === 0),
  );
  const summary = {
    suite,
    generatedAt: new Date().toISOString(),
    reportDir,
    matrix,
    commandCoverage,
    uncoveredHardGateScenarios,
    commandResults,
    counts: {
      commandsPassed: commandResults.filter((result) => result.status === 'passed').length,
      commandsFailed: commandResults.filter((result) => result.status === 'failed').length,
      hardGateGaps: uncoveredHardGateScenarios.length,
    },
    note:
      suite === 'weekly' || suite === 'matrix'
        ? 'Weekly intentionally includes full capability gaps so the report remains a complete product coverage tracker.'
        : 'Daily focuses on P0 critical chains and stops early on static/core breakage.',
  };
  await writeFile(join(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(reportDir, 'matrix.json'), `${JSON.stringify(pcAutomationFeatureMatrix, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

function mapCommandCoverage(scenarios) {
  const map = {};
  for (const scenario of scenarios) {
    for (const commandName of scenario.commands) {
      map[commandName] ||= [];
      map[commandName].push(scenario.id);
    }
  }
  return map;
}

function sanitizeFileName(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_');
}

function shortError(error) {
  return String(error?.message || error || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
}
