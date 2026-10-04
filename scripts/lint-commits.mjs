import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

function git(args) {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    return result;
}

function commitExists(ref) {
    return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0;
}

const explicitFrom = process.env.COMMITLINT_FROM?.trim();
const base = explicitFrom || ['origin/main', 'main'].find(commitExists);
if (!base) {
    console.error('No commitlint base ref found. Fetch origin/main, or set COMMITLINT_FROM.');
    process.exit(1);
}

const listed = git(['rev-list', '--count', `${base}..HEAD`]);
if (listed.status !== 0) {
    process.stderr.write(listed.stderr ?? '');
    process.exit(listed.status ?? 1);
}

const count = Number(listed.stdout.trim());
if (count === 0) {
    console.log(`No commits to lint (${base}..HEAD).`);
    process.exit(0);
}

const cli = require.resolve('@commitlint/cli/cli.js');
const lint = spawnSync(process.execPath, [
    cli,
    '--from',
    base,
    '--to',
    'HEAD',
    '--verbose',
], { stdio: 'inherit' });

if (lint.error) {
    console.error(lint.error.message);
    process.exit(1);
}

process.exit(lint.status ?? 1);
