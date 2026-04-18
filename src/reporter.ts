import type { RiskReport } from './types.js';

// ─── ANSI color helpers (zero dependencies) ───

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

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

// ─── Public reporters ───

export function reportText(report: RiskReport): string {
  const lines: string[] = [];
  const { packageName, version, score: s, riskLevel, breakdown, warnings } = report;

  lines.push('');
  lines.push(`${BOLD}${CYAN}  safe-npm-install${RESET}  Package Risk Report`);
  lines.push(`${DIM}  ${'─'.repeat(48)}${RESET}`);
  lines.push(`  Package:    ${BOLD}${packageName}@${version}${RESET}`);
  lines.push(`  Risk Score: ${bar(s)} ${BOLD}${s}/100${RESET}  ${riskBadge(riskLevel)}`);
  lines.push('');
  lines.push(`${DIM}  Breakdown:${RESET}`);
  lines.push(`    Package Age      ${bar(breakdown.packageAge, 15)}  ${breakdown.packageAge}`);
  lines.push(`    Downloads        ${bar(breakdown.downloads, 15)}  ${breakdown.downloads}`);
  lines.push(`    Install Scripts  ${bar(breakdown.installScripts, 15)}  ${breakdown.installScripts}`);
  lines.push(`    Dependencies     ${bar(breakdown.dependencyCount, 15)}  ${breakdown.dependencyCount}`);
  lines.push(`    Maintainer Trust ${bar(breakdown.maintainerTrust, 15)}  ${breakdown.maintainerTrust}`);
  lines.push(`    Last Updated     ${bar(breakdown.lastUpdated, 15)}  ${breakdown.lastUpdated}`);

  if (warnings.length > 0) {
    lines.push('');
    lines.push(`${YELLOW}${BOLD}  ⚠ Warnings:${RESET}`);
    for (const w of warnings) {
      lines.push(`    ${YELLOW}• ${w}${RESET}`);
    }
  }

  lines.push(`${DIM}  ${'─'.repeat(48)}${RESET}`);
  lines.push('');

  return lines.join('\n');
}

export function reportJson(reports: RiskReport[]): string {
  return JSON.stringify(reports, null, 2);
}
