#!/usr/bin/env node
/**
 * CI entry point for the npm audit gate. Always runs the gate: there is no
 * "am I the main module?" check that a symlink or path mismatch could skip.
 *
 * Logic, the ALLOWLIST and docs live in ./npm-audit-gate.mjs.
 *
 * Usage: node scripts/ci/npm-audit-allowlist.mjs
 */
import { runGate } from './npm-audit-gate.mjs';

process.exit(runGate());
