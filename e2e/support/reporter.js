// The only reporter the suite uses. Run logs and job summaries are public on this repo and staging
// holds real member data, so this prints test titles, outcomes and spec locations, and nothing else.
//
// Dropped deliberately: stdout and stderr from tests, error bodies (a Playwright failure can quote
// page text in "Received:" and in its call log) and attachments. There is no HTML report.

import { appendFileSync } from 'node:fs';
import { relative } from 'node:path';

// A failure's first line is shown only when it starts with a shape known to hold no page content.
const SAFE_FIRST_LINE = [
  /^(?:Error: )?(expect\([^)]*\)(?:\.not)?\.\w+\((?:expected)?\))/,
  /^(?:Error: )?((?:locator|page|frame|apiRequestContext)\.\w+: (?:Timeout \d+ms exceeded|Test timeout of \d+ms exceeded))/,
  /^(Test timeout of \d+ms exceeded)/,
  /^(?:Error: )?(Bulk-endpoint safety net blocked: [^\n]*)/,
  /^(?:Error: )?(e2e identity not configured: [^\n]*)/,
];

// eslint-disable-next-line no-control-regex -- matching ANSI escape sequences is the point.
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

export function safeMessage(error) {
  const firstLine = stripAnsi(error?.message ?? '').split('\n')[0];
  for (const pattern of SAFE_FIRST_LINE) {
    const match = firstLine.match(pattern);
    if (match) return match[1];
  }
  return 'message withheld (see the spec location)';
}

const OUTCOME = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' };

export function outcomeLabel(test) {
  return OUTCOME[test.outcome()] ?? 'unknown';
}

export default class RedactingReporter {
  printsToStdio() {
    return true;
  }

  onBegin(config, suite) {
    this.rootDir = config.rootDir;
    this.suite = suite;
    this.globalErrors = [];
    console.log(`Running ${suite.allTests().length} test(s)`);
  }

  onStdOut() {}

  onStdErr() {}

  onError(error) {
    this.globalErrors.push(safeMessage(error));
  }

  onTestEnd(test, result) {
    const retry = result.retry > 0 ? ` (retry ${result.retry})` : '';
    const status = result.status === test.expectedStatus ? 'as expected' : result.status;
    console.log(`${status}${retry}: ${test.title}`);
  }

  location(error) {
    if (!error?.location) return '';
    return `${relative(this.rootDir, error.location.file)}:${error.location.line}`;
  }

  onEnd(result) {
    const rows = this.suite.allTests().map((test) => {
      const label = outcomeLabel(test);
      const error = test.results.at(-1)?.error;
      const detail = label === 'failed' ? `${safeMessage(error)} ${this.location(error)}`.trim() : '';
      return { title: test.title, label, detail };
    });
    for (const row of rows.filter((r) => r.detail)) console.log(`failed: ${row.title}: ${row.detail}`);
    for (const message of this.globalErrors) console.log(`suite error: ${message}`);
    console.log(`Suite result: ${result.status}`);

    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) return;
    const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const lines = [
      '### e2e results',
      '',
      `Suite: **${result.status}**. "flaky" means it passed only on the retry, which is not a pass (§5.6).`,
      '',
      '| Test | Result | Detail |',
      '|---|---|---|',
      ...rows.map((r) => `| ${cell(r.title)} | ${r.label} | ${cell(r.detail)} |`),
      ...this.globalErrors.map((m) => `| (suite) | failed | ${cell(m)} |`),
      '',
    ];
    appendFileSync(summaryPath, lines.join('\n'));
  }
}
