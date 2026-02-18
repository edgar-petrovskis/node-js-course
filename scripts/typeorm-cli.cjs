const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const dotenv = require('dotenv');

const envFile =
  process.env.DOTENV_CONFIG_PATH ||
  (existsSync('.env.local') ? '.env.local' : '.env');

dotenv.config({ path: envFile });

const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const cliArgs = [
  'typeorm-ts-node-commonjs',
  '-d',
  'src/infrastructure/database/data-source.ts',
  ...process.argv.slice(2),
];

const result = spawnSync(npxBin, cliArgs, {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
