#!/usr/bin/env node
/**
 * Builds an installable .vsix package for the openHASP Page Editor extension.
 *
 * Usage:
 *   node scripts/build-vsix.js [--no-lint] [--pre-release] [--out <dir>]
 *
 * The webpack build and icon generation are NOT invoked here on purpose: `vsce package`
 * runs the `vscode:prepublish` script, which does both. Keeping them there means anyone
 * running `vsce package` directly still gets a production bundle and a valid icon.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

/**
 * The README shipped inside the .vsix and shown on the extension's marketplace page. The repo's
 * own README.md stays a contributor document (how to build, how the source is laid out), which
 * is the wrong thing to greet a user with after they install — so the package gets this one
 * instead, via `vsce package --readme-path`. Keep it in sync with `publish:vsix` in package.json.
 */
const README_PATH = 'docs/EXTENSION_README.md';

function parseArgs(argv) {
  const opts = { lint: true, preRelease: false, outDir: root };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-lint') {
      opts.lint = false;
    } else if (arg === '--pre-release') {
      opts.preRelease = true;
    } else if (arg === '--out') {
      const dir = argv[++i];
      if (!dir) {
        throw new Error('--out requires a directory argument');
      }
      opts.outDir = path.resolve(root, dir);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
}

function clean(outDir) {
  for (const dir of ['dist', 'assets']) {
    fs.rmSync(path.join(root, dir), { recursive: true, force: true });
  }
  for (const dir of new Set([root, outDir])) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.vsix')) {
        fs.rmSync(path.join(dir, entry), { force: true });
      }
    }
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const vsixName = `${pkg.name}-${pkg.version}.vsix`;
  const vsixPath = path.join(opts.outDir, vsixName);

  if (!fs.existsSync(path.join(root, README_PATH))) {
    throw new Error(`User-facing README not found at ${README_PATH} — it is what ships as the extension's readme.`);
  }

  console.log(`Building ${pkg.name} v${pkg.version}${opts.preRelease ? ' (pre-release)' : ''}`);
  console.log(`> extension readme: ${README_PATH}`);

  console.log('\n> cleaning dist/, assets/, *.vsix');
  clean(opts.outDir);
  fs.mkdirSync(opts.outDir, { recursive: true });

  if (opts.lint) {
    run('npm', ['run', 'lint']);
  } else {
    console.log('\n> skipping lint (--no-lint)');
  }

  // Triggers `vscode:prepublish` -> icon generation + production webpack build.
  const vsceArgs = ['vsce', 'package', '--no-dependencies', '--readme-path', README_PATH, '--out', vsixPath];
  if (opts.preRelease) {
    vsceArgs.push('--pre-release');
  }
  run('npx', vsceArgs);

  const { size } = fs.statSync(vsixPath);
  console.log(`\nPackaged ${path.relative(root, vsixPath)} (${(size / 1024).toFixed(0)} KB)`);
  console.log(`Install locally with: code --install-extension ${path.relative(root, vsixPath)}`);
}

try {
  main();
} catch (err) {
  console.error(`\nBuild failed: ${err.message}`);
  process.exit(1);
}
