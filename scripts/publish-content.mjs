import {spawnSync} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const message = process.argv.slice(2).join(' ').trim() || 'Update multilingual library content';
const managedRoots = ['docs/', 'i18n/', '.translation-cache.json'];

const branch = capture('git', ['branch', '--show-current']).trim();
if (branch !== 'main') {
  console.error(`Content publishing must run on main; current branch is ${branch || 'detached HEAD'}.`);
  process.exit(1);
}

const stagedBefore = capture('git', ['diff', '--cached', '--name-only'])
  .split(/\r?\n/)
  .filter(Boolean);
const unrelatedStaged = stagedBefore.filter(
  (file) => !managedRoots.some((rootPath) => file === rootPath || file.startsWith(rootPath)),
);
if (unrelatedStaged.length) {
  console.error('Refusing to include unrelated staged files in the content commit:');
  for (const file of unrelatedStaged) console.error(`- ${file}`);
  console.error('Commit or unstage those files, then run the publish task again.');
  process.exit(1);
}

run('npm', ['run', 'translate']);
run('npm', ['run', 'check']);
run('git', ['add', 'docs', 'i18n', '.translation-cache.json']);

const staged = spawnSync('git', ['diff', '--cached', '--quiet'], {cwd: root});
if (staged.status === 1) {
  run('git', ['commit', '-m', message]);
} else if (staged.status !== 0) {
  process.exit(staged.status || 1);
} else {
  console.log('No new content changes to commit.');
}

run('git', ['push', 'origin', 'main']);
console.log('Published to main. Cloudflare Pages deployment has been triggered.');

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function capture(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {cwd: root, encoding: 'utf8'});
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr || 'Command failed.\n');
    process.exit(result.status || 1);
  }
  return result.stdout;
}
