<div align="center">

# safe-npm-install

Pre-install risk analysis for npm packages.  
Scores packages on real security signals and blocks suspicious installs before they reach your `node_modules`.

[![CI](https://github.com/vahabcore/safe-npm-install/actions/workflows/ci.yml/badge.svg)](https://github.com/vahabcore/safe-npm-install/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/safe-npm-install.svg)](https://www.npmjs.com/package/safe-npm-install)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

---

## Why

`npm audit` only reports vulnerabilities **after** packages are installed. By that point, a malicious `postinstall` script has already run.

There's no built-in way to evaluate whether a package is trustworthy **before** you install it. This tool fills that gap.

`safe-npm-install` checks six security signals against the npm registry and gives you a risk score (0–100) before anything is written to disk.

## Install

```bash
npm install -g safe-npm-install
```

Or run directly:

```bash
npx safe-npm-install express
```

## Usage

```bash
# Analyze a package
safe-install express

# Analyze multiple packages
safe-install lodash axios chalk

# Strict mode: exit code 1 on high-risk packages (for CI)
safe-install --strict some-unknown-pkg

# JSON output for pipelines
safe-install --json express
```

### Example output

```
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

### Options

| Flag | Short | Description |
|---|---|---|
| `--strict` | `-s` | Exit with code 1 if any package is high risk |
| `--json` | `-j` | Output results as JSON |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

---

## Risk Scoring

Each package is scored 0–100 (higher = safer) based on six weighted signals:

| Signal | Weight | What it checks |
|---|---|---|
| Package Age | 15% | How long the package has existed on npm |
| Weekly Downloads | 20% | Download volume as a popularity indicator |
| Install Scripts | 25% | Presence of `preinstall` / `postinstall` hooks |
| Dependency Count | 10% | Number of production dependencies |
| Maintainer Trust | 15% | Maintainer count and version history |
| Last Updated | 15% | How recently the package was published |

Install scripts carry the highest weight because they execute arbitrary code during `npm install` — the primary vector for supply chain attacks.

### Risk Levels

| Score | Level | Meaning |
|---|---|---|
| 70–100 | Safe | Well-established, trusted package |
| 40–69 | Moderate | Some concerns, review before installing |
| 0–39 | High Risk | Blocked in strict mode |

---

## Programmatic API

Use it as a library in your own tools:

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

### Exports

| Function | Description |
|---|---|
| `fetchPackageData(name)` | Fetch package metadata from the npm registry |
| `fetchDownloads(name)` | Fetch weekly download count |
| `analyze(pkg, downloads)` | Extract security signals from raw data |
| `score(signals)` | Compute risk score and generate a report |
| `reportText(report)` | Format a report as colored terminal output |
| `reportJson(reports)` | Format reports as a JSON string |

All types (`RiskReport`, `RiskLevel`, `PackageSignals`, `ScoreBreakdown`, etc.) are exported for TypeScript users.

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Check package safety
  run: npx safe-npm-install --strict --json $(cat packages-to-install.txt)
```

### Pipeline example

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
└──────────┘    └────────────┘    └──────────┘    └────────────┘
       │
   ┌───▼───┐
   │ Cache  │
   └───────┘
```

| Module | Role |
|---|---|
| `fetcher` | Fetches registry metadata and download stats with timeouts and caching |
| `analyzer` | Extracts structured security signals from raw API responses |
| `scorer` | Applies weighted scoring to produce a 0–100 risk score |
| `reporter` | Formats output for terminal or JSON |
| `cache` | File-based TTL cache (15 min) under `~/.safe-npm-install/cache/` |
| `cli` | Argument parsing, validation, orchestration |

---

## Development

```bash
git clone https://github.com/vahabcore/safe-npm-install.git
cd safe-npm-install
npm install
npm run build
npm test
```

### Project Structure

```
src/
├── cli.ts            CLI entry point
├── index.ts          Public API exports
├── fetcher.ts        npm registry data fetching
├── analyzer.ts       Signal extraction
├── scorer.ts         Risk scoring engine
├── reporter.ts       Output formatting
├── cache.ts          File-based cache
└── types.ts          TypeScript types
tests/
├── scorer.test.ts
└── analyzer.test.ts
scripts/
└── postbuild.mjs     Adds shebang to CLI build output
```

---

## Roadmap

- [x] CLI with risk scoring
- [x] Strict mode for CI/CD
- [x] JSON output
- [x] Programmatic API
- [x] File-based caching
- [ ] Scan entire `package.json` dependencies
- [ ] GitHub repo analysis (stars, commits, issues)
- [ ] Script sandbox mode
- [ ] Behavioral pattern detection
- [ ] VS Code extension

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
