#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchPackageData, fetchDownloads } from './fetcher.js';
import { analyze } from './analyzer.js';
import { score } from './scorer.js';
import { reportText, reportJson } from './reporter.js';
import type { RiskReport } from './types.js';

const HELP = `
  safe-npm-install — Analyze npm packages for security risks before installing

  Usage:
    safe-ins <package> [package2 ...]   Analyze one or more packages
    safe-ins --strict <package>          Block install if risk is high
    safe-ins --json <package>            Output JSON (for CI/CD)

  Options:
    --strict, -s    Exit with code 1 if any package is high risk
    --json, -j      Output results as JSON
    --help, -h      Show this help message
    --version, -v   Show version

  Examples:
    safe-ins express
    safe-ins lodash axios chalk
    safe-ins --strict some-unknown-pkg
    safe-ins --json express | jq .
`;

function printHelp(): void {
  console.log(HELP);
}

function printVersion(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  console.log(`safe-npm-install v${pkg.version}`);
}

function validatePackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  if (name.startsWith('.') || name.startsWith('_')) return false;
  return /^(@[a-z0-9\-~][a-z0-9\-._~]*\/)?[a-z0-9\-~][a-z0-9\-._~]*$/.test(name);
}

async function analyzePackage(packageName: string): Promise<RiskReport> {
  const [pkgData, dlData] = await Promise.all([
    fetchPackageData(packageName),
    fetchDownloads(packageName),
  ]);

  const signals = analyze(pkgData, dlData);
  return score(signals);
}

async function main(): Promise<void> {
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        strict: { type: 'boolean', short: 's', default: false },
        json: { type: 'boolean', short: 'j', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}\nRun safe-ins --help for usage.`);
    process.exit(2);
  }

  const { strict, json, help, version } = args.values;
  const packages = args.positionals;

  if (help) {
    printHelp();
    return;
  }

  if (version) {
    printVersion();
    return;
  }

  if (packages.length === 0) {
    console.error('Error: No packages specified.\nRun safe-ins --help for usage.');
    process.exit(2);
  }

  // Validate package names
  for (const pkg of packages) {
    if (!validatePackageName(pkg)) {
      console.error(`Error: Invalid package name "${pkg}"`);
      process.exit(2);
    }
  }

  const reports: RiskReport[] = [];
  let hasHighRisk = false;

  // Analyze in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const batch = packages.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(batch.map((pkg) => analyzePackage(pkg)));

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const pkgName = batch[j];

      if (result.status === 'fulfilled') {
        reports.push(result.value);
        if (result.value.riskLevel === 'high') hasHighRisk = true;
      } else {
        const errMsg =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        if (!json) {
          console.error(`\x1b[31m  ✗ Failed to analyze "${pkgName}": ${errMsg}\x1b[0m`);
        } else {
          reports.push({
            packageName: pkgName,
            version: 'unknown',
            score: 0,
            riskLevel: 'high',
            breakdown: {
              packageAge: 0,
              downloads: 0,
              installScripts: 0,
              dependencyCount: 0,
              maintainerTrust: 0,
              lastUpdated: 0,
            },
            signals: {
              packageName: pkgName,
              version: 'unknown',
              packageAgeDays: 0,
              daysSinceLastUpdate: 999,
              weeklyDownloads: 0,
              hasInstallScripts: false,
              installScriptNames: [],
              dependencyCount: 0,
              maintainerCount: 0,
              versionCount: 0,
            },
            warnings: [`Failed to fetch data: ${errMsg}`],
          });
          hasHighRisk = true;
        }
      }
    }
  }

  // Output
  if (json) {
    console.log(reportJson(reports));
  } else {
    for (const report of reports) {
      console.log(reportText(report));
    }
  }

  // Strict mode: exit with error if high risk detected
  if (strict && hasHighRisk) {
    if (!json) {
      console.error('\x1b[31m\x1b[1m  ✗ Blocked: High-risk package(s) detected (strict mode)\x1b[0m\n');
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
