#!/usr/bin/env node
// Execute the real browser request checks rather than matching implementation strings.
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', 'e2e/smoke.spec.ts'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
