<div align="center">

# safe-npm-install

**Stop installing npm packages blindly.**

Analyze any npm package for security risks *before* it touches your project.

[![CI](https://github.com/YOUR_USERNAME/safe-npm-install/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/safe-npm-install/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/safe-npm-install.svg)](https://www.npmjs.com/package/safe-npm-install)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## The Problem

npm's open publishing model means **anyone can publish anything**. Supply chain attacks are [on the rise](https://www.techradar.com/pro/security/npm-package-with-millions-of-downloads-is-at-risk-from-malware-hijacking), and the existing `npm audit` only checks vulnerabilities *after* packages are already installed on your machine.

There is no built-in way to assess whether a package is **trustworthy before you install it**.

## The Solution

`safe-npm-install` is a lightweight CLI tool and Node.js library that scores npm packages on a **0–100 risk scale** using six real-world security signals — before a single file is written to your `node_modules`.

```
$ safe-install express

  safe-npm-install  Package Risk Report
  ────────────────────────────────────────────────
  Package:    express@4.21.0
  Risk Score: ████████████████░░░░ 82/100  [SAFE]

  Breakdown:
    Package Age      ███████████████  100
    Downloads        ███████████████  100
    Install Scripts  ███████████████  100
    Dependencies     ██████████░░░░░   65
    Maintainer Trust ███████████████  100
    Last Updated     █████████████░░   85
  ────────────────────────────────────────────────
```

---

## Features

- **Pre-install risk scoring** — know the risk *before* `npm install`
- **Install script detection** — flags packages with `preinstall`/`postinstall` hooks (the #1 attack vector)
- **Strict mode** — block high-risk installs automatically in CI/CD
- **JSON output** — machine-readable results for pipelines
- **Programmatic API** — use it as a library in your own tools
- **File-based caching** — fast repeat lookups, no redundant API calls
- **Zero heavy dependencies** — uses native Node.js APIs only
- **TypeScript** — fully typed, strict mode

---

## Quick Start

### Install globally

```bash
npm install -g safe-npm-install
```

### Or run with npx (no install)

```bash
npx safe-npm-install express
```

---

## CLI Usage

### Analyze a single package

```bash
safe-install express
```

### Analyze multiple packages at once

```bash
safe-install lodash axios chalk
```

### Strict mode — block unsafe packages

```bash
safe-install --strict some-unknown-pkg
```

Exits with code `1` if any package scores as **high risk**. Perfect for CI/CD gates.

### JSON output — for automation

```bash
safe-install --json express
```

Pipe into `jq` or feed directly into your pipeline:

```bash
safe-install --json express axios | jq '.[].riskLevel'
```

### All options

```
Usage:
  safe-install <package> [package2 ...]

Options:
  --strict, -s    Exit with code 1 if any package is high risk
  --json,   -j    Output results as JSON
  --help,   -h    Show help
  --version, -v   Show version
```

---

## Risk Scoring System

Every package is scored **0–100** (higher = safer) by combining six weighted signals:

| Signal | Weight | What it checks |
|---|---|---|
| **Package Age** | 15% | How long the package has existed on npm |
| **Weekly Downloads** | 20% | Download volume as a popularity proxy |
| **Install Scripts** | 25% | Presence of `preinstall` / `postinstall` hooks |
| **Dependency Count** | 10% | Size of the production dependency tree |
| **Maintainer Trust** | 15% | Number of maintainers + published versions |
| **Last Updated** | 15% | How recently the package was published |

Install scripts carry the **highest weight** because they can execute arbitrary code during `npm install` — the primary vector for supply chain attacks.

### Risk Levels

| Score | Level | Action |
|---|---|---|
| **70–100** | 🟢 **Safe** | Well-established and trusted |
| **40–69** | 🟡 **Moderate** | Review warnings before installing |
| **0–39** | 🔴 **High Risk** | Significant concerns — blocked in strict mode |

---

## Use as a Library

`safe-npm-install` exports a clean programmatic API for integration into your own tools, scripts, or dashboards.

```typescript
import { fetchPackageData, fetchDownloads, analyze, score } from 'safe-npm-install';

const [pkg, dl] = await Promise.all([
  fetchPackageData('express'),
  fetchDownloads('express'),
]);

const signals = analyze(pkg, dl);
const report = score(signals);

console.log(report.score);       // 82
console.log(report.riskLevel);   // 'safe'
console.log(report.warnings);    // []
console.log(report.breakdown);   // { packageAge: 100, downloads: 100, ... }
```

### Exported Functions

| Function | Description |
|---|---|
| `fetchPackageData(name)` | Fetch full metadata from the npm registry |
| `fetchDownloads(name)` | Fetch weekly download count |
| `analyze(pkg, downloads)` | Extract security signals from raw data |
| `score(signals)` | Compute risk score and generate report |
| `reportText(report)` | Format report as colored CLI output |
| `reportJson(reports)` | Format reports as JSON string |

### Exported Types

```typescript
import type {
  RiskReport,
  RiskLevel,
  PackageSignals,
  ScoreBreakdown,
  NpmPackageData,
  NpmDownloadData,
} from 'safe-npm-install';
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Check package safety
  run: npx safe-npm-install --strict --json $(cat packages-to-install.txt)
```

### Pre-commit / Pre-install Hook

```json
{
  "scripts": {
    "preinstall": "npx safe-npm-install --strict my-new-dep"
  }
}
```

### Pipeline with JSON parsing

```bash
RESULT=$(npx safe-npm-install --json some-pkg)
RISK=$(echo "$RESULT" | jq -r '.[0].riskLevel')
if [ "$RISK" = "high" ]; then
  echo "Blocked: high-risk package"
  exit 1
fi
```

---

## Architecture

```
CLI Input
   │
   ▼
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌────────────┐
│  Fetcher  │───▶│  Analyzer  │───▶│  Scorer  │───▶│  Reporter  │
│ (npm API) │    │ (signals)  │    │ (0–100)  │    │ (output)   │
└──────────┘    └────────────┘    └──────────┘    └────────────┘
       │
   ┌───▼───┐
   │ Cache  │  (~/.safe-npm-install/cache/)
   └───────┘
```

| Module | Responsibility |
|---|---|
| **`fetcher`** | Fetches registry metadata + download stats with timeout and caching |
| **`analyzer`** | Extracts structured security signals from raw API data |
| **`scorer`** | Applies weighted scoring algorithm to produce a 0–100 score |
| **`reporter`** | Formats output for terminal (colored) or JSON |
| **`cache`** | File-based TTL cache (15 min) to avoid redundant network calls |
| **`cli`** | Argument parsing, orchestration, error handling |

---

## Development

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/safe-npm-install.git
cd safe-npm-install

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

### Project Structure

```
src/
├── cli.ts          # CLI entry point
├── index.ts        # Public API exports
├── fetcher.ts      # npm registry data fetching
├── analyzer.ts     # Signal extraction
├── scorer.ts       # Risk scoring engine
├── reporter.ts     # Output formatting
├── cache.ts        # File-based cache
└── types.ts        # TypeScript type definitions
tests/
├── scorer.test.ts  # Scoring engine tests
└── analyzer.test.ts # Analyzer tests
```

---

## Roadmap

- [x] CLI with risk scoring
- [x] Strict mode for CI/CD
- [x] JSON output
- [x] Programmatic API
- [x] File-based caching
- [ ] `safe-install scan` — scan entire `package.json`
- [ ] GitHub repo analysis (stars, commits, issues)
- [ ] Script sandbox mode (simulate install without execution)
- [ ] Behavioral pattern detection (env access, network calls)
- [ ] VS Code extension

See the [full roadmap](./package.md) for details.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before getting started.

Good places to start:
- Issues labeled [`good first issue`](../../issues?q=label%3A%22good+first+issue%22)
- New security signals or scoring improvements
- Documentation improvements

---

## Security

If you discover a vulnerability, **do not open a public issue**. Please read [SECURITY.md](./SECURITY.md) for responsible disclosure instructions.

---

## Why This Exists

The npm ecosystem powers millions of projects, but its open publishing model creates real risk:

- **No verification** — anyone can publish any package name
- **Install scripts run automatically** — `postinstall` can execute arbitrary code
- **Typosquatting** — malicious packages mimic popular ones
- **Dependency depth** — a single `npm install` can pull hundreds of transitive packages

`npm audit` helps, but only *after* code is on your machine. `safe-npm-install` fills the gap with a **pre-install trust layer** — giving you visibility into risk *before* you commit.

---

## License

[MIT](./LICENSE) — free for personal and commercial use.
