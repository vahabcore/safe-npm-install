import type { PackageSignals, RiskLevel, RiskReport, ScoreBreakdown } from './types.js';

const WEIGHTS = {
  packageAge: 15,
  downloads: 20,
  installScripts: 25,
  dependencyCount: 10,
  maintainerTrust: 15,
  lastUpdated: 15,
} as const;

const RISK_THRESHOLDS = {
  safe: 70,
  moderate: 40,
} as const;

function scorePackageAge(days: number): number {
  if (days >= 365) return 100;
  if (days >= 180) return 80;
  if (days >= 30) return 60;
  if (days >= 7) return 30;
  return 5;
}

function scoreDownloads(weekly: number): number {
  if (weekly >= 1_000_000) return 100;
  if (weekly >= 100_000) return 90;
  if (weekly >= 10_000) return 75;
  if (weekly >= 1_000) return 55;
  if (weekly >= 100) return 30;
  return 10;
}

function scoreInstallScripts(hasScripts: boolean): number {
  return hasScripts ? 10 : 100;
}

function scoreDependencyCount(count: number): number {
  if (count === 0) return 100;
  if (count <= 3) return 85;
  if (count <= 10) return 65;
  if (count <= 25) return 40;
  return 15;
}

function scoreMaintainerTrust(maintainerCount: number, versionCount: number): number {
  let score = 50;
  if (maintainerCount >= 2) score += 20;
  else if (maintainerCount === 1) score += 10;
  if (versionCount >= 10) score += 30;
  else if (versionCount >= 3) score += 15;
  return Math.min(100, score);
}

function scoreLastUpdated(daysSince: number): number {
  if (daysSince <= 30) return 100;
  if (daysSince <= 90) return 85;
  if (daysSince <= 180) return 65;
  if (daysSince <= 365) return 40;
  return 15;
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.safe) return 'safe';
  if (score >= RISK_THRESHOLDS.moderate) return 'moderate';
  return 'high';
}

function buildWarnings(signals: PackageSignals, breakdown: ScoreBreakdown): string[] {
  const warnings: string[] = [];

  if (signals.packageAgeDays < 7) {
    warnings.push(`Package is only ${signals.packageAgeDays} day(s) old`);
  }
  if (signals.hasInstallScripts) {
    warnings.push(
      `Has install scripts: ${signals.installScriptNames.join(', ')}`,
    );
  }
  if (signals.weeklyDownloads < 100) {
    warnings.push(`Very low weekly downloads (${signals.weeklyDownloads})`);
  }
  if (signals.daysSinceLastUpdate > 365) {
    warnings.push(`Not updated in over a year (${signals.daysSinceLastUpdate} days)`);
  }
  if (signals.dependencyCount > 25) {
    warnings.push(`Large dependency tree (${signals.dependencyCount} deps)`);
  }
  if (signals.maintainerCount < 2) {
    warnings.push('Single maintainer');
  }

  return warnings;
}

export function score(signals: PackageSignals): RiskReport {
  const breakdown: ScoreBreakdown = {
    packageAge: scorePackageAge(signals.packageAgeDays),
    downloads: scoreDownloads(signals.weeklyDownloads),
    installScripts: scoreInstallScripts(signals.hasInstallScripts),
    dependencyCount: scoreDependencyCount(signals.dependencyCount),
    maintainerTrust: scoreMaintainerTrust(signals.maintainerCount, signals.versionCount),
    lastUpdated: scoreLastUpdated(signals.daysSinceLastUpdate),
  };

  const totalScore = Math.round(
    (breakdown.packageAge * WEIGHTS.packageAge +
      breakdown.downloads * WEIGHTS.downloads +
      breakdown.installScripts * WEIGHTS.installScripts +
      breakdown.dependencyCount * WEIGHTS.dependencyCount +
      breakdown.maintainerTrust * WEIGHTS.maintainerTrust +
      breakdown.lastUpdated * WEIGHTS.lastUpdated) /
      100,
  );

  const riskLevel = getRiskLevel(totalScore);
  const warnings = buildWarnings(signals, breakdown);

  return {
    packageName: signals.packageName,
    version: signals.version,
    score: totalScore,
    riskLevel,
    breakdown,
    signals,
    warnings,
  };
}
