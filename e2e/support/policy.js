// Artifact and isolation policy (DEC-0023 / Q-0058): traces off, failure screenshots on
// member-scoped pages only, no attachments, no storageState uploads.
//
// Called from playwright.config.js, so it runs on every invocation, including --list. A spec that
// imports Playwright directly, or that asks for an artifact itself, stops the whole run. This stops
// accidents, not someone determined; review of e2e/ on the PR covers the rest.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const FORBIDDEN = [
  [/['"]@playwright\/test['"]/, "import test and expect from support/fixtures.js, so the safety net applies"],
  [/\bscreenshot\b/i, 'screenshots are taken only by support/fixtures.js, on member-scoped pages'],
  [/\.attach\s*\(/, 'no attachments (Q-0058)'],
  [/\btrace\s*:|\btracing\b/i, 'traces are off (Q-0058)'],
  [/\bvideo\s*:|recordVideo|recordHar|routeFromHAR/, 'no video or HAR capture (Q-0058)'],
  [/storageState/, 'no storageState: it holds session cookies (§6.5)'],
  [/newContext\s*\(/, 'a new context would bypass the safety net'],
  [/\b(?:page|context)\.request\b/, 'use the request fixture: this context bypasses the safety net'],
];

const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((line) => line.replace(/^\s*\/\/.*$/, '')).join('\n');

/** Returns one message per violation in a spec's source text. */
export function findViolations(source) {
  const text = stripComments(source);
  return FORBIDDEN.filter(([pattern]) => pattern.test(text)).map(([pattern, why]) => `${pattern.source}: ${why}`);
}

export function assertSuitePolicy(testDir) {
  const problems = [];
  for (const entry of readdirSync(testDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    for (const message of findViolations(readFileSync(path, 'utf8'))) {
      problems.push(`${relative(testDir, path)} -> ${message}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`e2e suite policy violated (DEC-0023, Q-0058):\n  ${problems.join('\n  ')}`);
  }
}
