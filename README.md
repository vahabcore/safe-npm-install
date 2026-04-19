<div align="center">

# safe-npm-install

Detect risky npm packages before installation by checking install scripts, release freshness, and trust signals.

[![CI](https://github.com/vahabcore/safe-npm-install/actions/workflows/ci.yml/badge.svg)](https://github.com/vahabcore/safe-npm-install/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/safe-npm-install.svg)](https://www.npmjs.com/package/safe-npm-install)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

## Problem

Malicious npm packages are a real supply chain risk.

Attackers abuse install-time hooks like `preinstall` and `postinstall`, publish suspiciously fresh versions, and rely on trust gaps before the ecosystem notices. By the time `npm audit` runs, the package may already be in `node_modules` and its install script may already have executed.

safe-npm-install is built for the question developers actually ask before installing a package:

"What if this package or its newest release is malicious?"

## What It Checks

safe-npm-install evaluates real pre-install signals from the npm registry:

- Install-time scripts such as `preinstall`, `install`, and `postinstall`
- Fresh releases that have not had much ecosystem scrutiny yet
- Package age and release history
- Weekly download volume
- Maintainer count
- Direct dependency count

It then produces a risk score and, when the latest release looks risky, recommends a safer historical version to pin instead of leaving you with a vague warning.

## Install

```bash
npm install -g safe-npm-install
```

Or run it directly:

```bash
npx safe-npm-install express
```

## Quick Usage

```bash
safe-npm-install express
safe-npm-install lodash axios chalk
safe-npm-install --strict some-unknown-pkg
safe-npm-install --json express
```

## Example Output

```text
🔍 Checking axios...

  safe-npm-install  npm package risk check
  --------------------------------------------------------
  Package: axios@1.7.0
  ⚠ Risk: Moderate (58/100) [MODERATE]

  ✔ Popular package (18,000,000 weekly downloads)
  ✔ Package has been on npm for over a year
  ✔ 2 maintainers listed

  ⚠ Install-time scripts detected: postinstall
  ⚠ Latest release was published 2 day(s) ago

  Recommendation
  → Prefer axios@1.6.8
    Stable candidate published 96 day(s) ago without install-time scripts.
    - latest release runs install-time scripts (postinstall)
    - latest release is only 2 day(s) old

  Score breakdown
    Package Age       ███████████████  100
    Downloads         ███████████████   90
    Install Scripts   ██░░░░░░░░░░░░░   10
    Dependencies      ████████████░░░   85
    Maintainer Trust  ███████████████  100
    Release Freshness ████████░░░░░░░   55
  --------------------------------------------------------
```

## Why The Recommendation Feature Matters

Most tools stop at "this package looks risky."

safe-npm-install goes one step further:

- It flags risky latest releases.
- It looks through version history.
- It recommends a safer, more mature version when one exists.

That makes it an installation assistant, not just a checker.

## CLI Options

| Flag | Short | Description |
| --- | --- | --- |
| `--strict` | `-s` | Exit with code 1 if any package is high risk |
| `--json` | `-j` | Output JSON for CI/CD or pipelines |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

## Risk Model

Each package receives a score from 0 to 100, where higher means safer.

| Signal | Weight | Why it matters |
| --- | --- | --- |
| Package Age | 15% | Very new packages have less trust history |
| Weekly Downloads | 20% | Real usage is a useful trust signal |
| Install Scripts | 25% | Install hooks can execute arbitrary code |
| Dependency Count | 10% | Large trees increase attack surface |
| Maintainer Trust | 15% | More maintainers and release history improve trust |
| Release Freshness | 15% | Extremely fresh releases are riskier; abandoned releases are also suspicious |

### Risk Levels

| Score | Level | Meaning |
| --- | --- | --- |
| 70-100 | Safe | Strong trust signals, low immediate concern |
| 40-69 | Moderate | Review before installing |
| 0-39 | High | Block in strict mode |

## Programmatic API

```ts
import { fetchPackageData, fetchDownloads, analyze, score } from 'safe-npm-install';

const [pkg, downloads] = await Promise.all([
  fetchPackageData('axios'),
  fetchDownloads('axios'),
]);

const signals = analyze(pkg, downloads);
const report = score(signals);

console.log(report.score);
console.log(report.riskLevel);
console.log(report.warnings);
console.log(report.recommendation);
```

### Exports

| Function | Description |
| --- | --- |
| `fetchPackageData(name)` | Fetch package metadata from the npm registry |
| `fetchDownloads(name)` | Fetch last-week download counts |
| `analyze(pkg, downloads)` | Extract risk and trust signals from registry data |
| `score(signals)` | Compute a final report and risk level |
| `reportText(report)` | Format a terminal-friendly report |
| `reportJson(reports)` | Format JSON output |

## JSON Output

JSON output includes more than the score. It also contains:

- `warnings` for risky signals
- `positives` for trust signals
- `recommendation` when a safer stable version is available
- `breakdown` for weighted score factors

That makes it usable in CI, internal developer tooling, and install policy automation.

## CI/CD

```yaml
- name: Check package safety
  run: npx safe-npm-install --strict --json $(cat packages-to-install.txt)
```

Example shell gate:

```bash
RESULT=$(npx safe-npm-install --json some-pkg)
RISK=$(echo "$RESULT" | jq -r '.[0].riskLevel')

if [ "$RISK" = "high" ]; then
  echo "Blocked: high-risk package"
  exit 1
fi
```

## Architecture

```text
CLI Input
   |
   v
Fetcher -> Analyzer -> Scorer -> Reporter
   |
   v
 Cache
```

| Module | Role |
| --- | --- |
| `fetcher` | Retrieves npm registry metadata and download counts |
| `analyzer` | Extracts release signals and safer-version recommendations |
| `scorer` | Weighs trust and risk signals into a final score |
| `reporter` | Produces terminal and JSON output |
| `cache` | Stores a short-lived cache under `~/.safe-npm-install/cache/` |
| `cli` | Parses arguments and orchestrates analysis |

## Development

```bash
git clone https://github.com/vahabcore/safe-npm-install.git
cd safe-npm-install
npm install
npm run build
npm test
npm run lint
```

## Roadmap

- [x] Pre-install risk scoring
- [x] Strict mode for CI
- [x] JSON output
- [x] Safer-version recommendation
- [x] File-based caching
- [ ] Analyze every dependency in a local package.json
- [ ] Add GitHub repository trust signals
- [ ] Add organization allowlists and policy files
- [ ] Export SARIF or machine-readable policy violations

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
