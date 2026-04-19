import type { RiskReport } from './types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function riskMarker(level: string): string {
  switch (level) {
    case 'safe':
      return `${GREEN}✔${RESET}`;
    case 'moderate':
      return `${YELLOW}⚠${RESET}`;
    case 'high':
      return `${RED}✖${RESET}`;
    default:
      return `${WHITE}•${RESET}`;
  }
}

function colorFor(level: string): string {
  switch (level) {
    case 'safe':
      return GREEN;
    case 'moderate':
      return YELLOW;
    case 'high':
      return RED;
    default:
      return WHITE;
  }
}

function riskBadge(level: string): string {
  const color = colorFor(level);
  const label = level.toUpperCase();
  return `${color}${BOLD}[${label}]${RESET}`;
}

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  const color = value >= 70 ? GREEN : value >= 40 ? YELLOW : RED;
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}

export function reportText(report: RiskReport): string {
  const lines: string[] = [];
  const {
    packageName,
    version,
    score: s,
    riskLevel,
    breakdown,
    positives,
    warnings,
    recommendation,
  } = report;

  lines.push('');
  lines.push(`${BOLD}${CYAN}  safe-npm-install${RESET}  npm package risk check`);
  lines.push(`${DIM}  ${'─'.repeat(56)}${RESET}`);
  lines.push(`  Package: ${BOLD}${packageName}@${version}${RESET}`);
  lines.push(
    `  ${riskMarker(riskLevel)} ${BOLD}Risk: ${titleCase(riskLevel)}${RESET} ${DIM}(${s}/100)${RESET} ${riskBadge(riskLevel)}`,
  );
  lines.push('');

  if (positives.length > 0) {
    for (const positive of positives) {
      lines.push(`  ${GREEN}✔${RESET} ${positive}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      lines.push(`  ${YELLOW}⚠${RESET} ${w}`);
    }
    lines.push('');
  }

  if (recommendation) {
    lines.push(`${CYAN}${BOLD}  Recommendation${RESET}`);
    lines.push(`  ${CYAN}→${RESET} Prefer ${BOLD}${packageName}@${recommendation.version}${RESET}`);
    lines.push(
      `    Stable candidate published ${recommendation.ageDays} day(s) ago without install-time scripts.`,
    );
    for (const reason of recommendation.reasons) {
      lines.push(`    ${DIM}- ${reason}${RESET}`);
    }
    lines.push('');
  } else if (riskLevel !== 'safe') {
    lines.push(`${CYAN}${BOLD}  Recommendation${RESET}`);
    lines.push('  Review the package changelog and maintainer history before installing.');
    lines.push('');
  }

  lines.push(`${DIM}  Score breakdown${RESET}`);
  lines.push(`    Package Age       ${bar(breakdown.packageAge, 15)}  ${breakdown.packageAge}`);
  lines.push(`    Downloads         ${bar(breakdown.downloads, 15)}  ${breakdown.downloads}`);
  lines.push(`    Install Scripts   ${bar(breakdown.installScripts, 15)}  ${breakdown.installScripts}`);
  lines.push(`    Dependencies      ${bar(breakdown.dependencyCount, 15)}  ${breakdown.dependencyCount}`);
  lines.push(`    Maintainer Trust  ${bar(breakdown.maintainerTrust, 15)}  ${breakdown.maintainerTrust}`);
  lines.push(`    Release Freshness ${bar(breakdown.lastUpdated, 15)}  ${breakdown.lastUpdated}`);
  lines.push(`${DIM}  ${'─'.repeat(56)}${RESET}`);
  lines.push('');

  return lines.join('\n');
}

export function reportJson(reports: RiskReport[]): string {
  return JSON.stringify(reports, null, 2);
}
