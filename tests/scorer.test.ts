import { describe, it, expect } from 'vitest';
import { score } from '../src/scorer.js';
import type { PackageSignals, VersionSnapshot } from '../src/types.js';

function makeSnapshots(version = '1.0.0'): VersionSnapshot[] {
  return [
    {
      version,
      publishedAt: '2024-01-01T00:00:00.000Z',
      ageDays: 120,
      hasInstallScripts: false,
      installScriptNames: [],
      dependencyCount: 2,
      isPrerelease: false,
    },
  ];
}

function makeSignals(overrides: Partial<PackageSignals> = {}): PackageSignals {
  return {
    packageName: 'test-pkg',
    version: '1.0.0',
    packageAgeDays: 400,
    daysSinceLastUpdate: 10,
    latestVersionAgeDays: 10,
    latestVersionIsPrerelease: false,
    weeklyDownloads: 500_000,
    hasInstallScripts: false,
    installScriptNames: [],
    dependencyCount: 2,
    maintainerCount: 3,
    versionCount: 20,
    trustSignals: [],
    riskSignals: [],
    versionSnapshots: makeSnapshots(),
    ...overrides,
  };
}

describe('scorer', () => {
  it('gives high score to well-established packages', () => {
    const report = score(makeSignals());
    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.riskLevel).toBe('safe');
  });

  it('penalizes packages with install scripts', () => {
    const safe = score(makeSignals({ hasInstallScripts: false }));
    const risky = score(
      makeSignals({
        hasInstallScripts: true,
        installScriptNames: ['postinstall'],
      }),
    );
    expect(risky.score).toBeLessThan(safe.score);
    expect(risky.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Install-time scripts detected')]),
    );
  });

  it('penalizes very new packages', () => {
    const report = score(makeSignals({ packageAgeDays: 2, latestVersionAgeDays: 2 }));
    expect(report.breakdown.packageAge).toBeLessThanOrEqual(10);
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('day(s) old')]),
    );
  });

  it('penalizes low download counts', () => {
    const report = score(makeSignals({ weeklyDownloads: 5 }));
    expect(report.breakdown.downloads).toBeLessThanOrEqual(10);
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('low weekly downloads')]),
    );
  });

  it('penalizes abandoned packages', () => {
    const report = score(makeSignals({ daysSinceLastUpdate: 500, latestVersionAgeDays: 500 }));
    expect(report.breakdown.lastUpdated).toBeLessThanOrEqual(45);
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('No release')]),
    );
  });

  it('penalizes large dependency trees', () => {
    const small = score(makeSignals({ dependencyCount: 1 }));
    const large = score(makeSignals({ dependencyCount: 50 }));
    expect(large.breakdown.dependencyCount).toBeLessThan(small.breakdown.dependencyCount);
  });

  it('penalizes single maintainer', () => {
    const report = score(makeSignals({ maintainerCount: 1 }));
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Single maintainer')]),
    );
  });

  it('marks high-risk packages correctly', () => {
    const report = score(
      makeSignals({
        packageAgeDays: 1,
        latestVersionAgeDays: 1,
        weeklyDownloads: 2,
        hasInstallScripts: true,
        installScriptNames: ['preinstall', 'postinstall'],
        dependencyCount: 40,
        maintainerCount: 1,
        versionCount: 1,
        daysSinceLastUpdate: 0,
      }),
    );
    expect(report.riskLevel).toBe('high');
    expect(report.score).toBeLessThan(40);
  });

  it('score is always between 0 and 100', () => {
    const extremeLow = score(
      makeSignals({
        packageAgeDays: 0,
        latestVersionAgeDays: 0,
        weeklyDownloads: 0,
        hasInstallScripts: true,
        installScriptNames: ['postinstall'],
        dependencyCount: 100,
        maintainerCount: 0,
        versionCount: 0,
        daysSinceLastUpdate: 999,
      }),
    );
    expect(extremeLow.score).toBeGreaterThanOrEqual(0);
    expect(extremeLow.score).toBeLessThanOrEqual(100);

    const extremeHigh = score(makeSignals());
    expect(extremeHigh.score).toBeGreaterThanOrEqual(0);
    expect(extremeHigh.score).toBeLessThanOrEqual(100);
  });

  it('report includes correct package name and version', () => {
    const report = score(makeSignals({ packageName: 'my-pkg', version: '2.3.4' }));
    expect(report.packageName).toBe('my-pkg');
    expect(report.version).toBe('2.3.4');
  });

  it('preserves a recommendation in the final report', () => {
    const report = score(
      makeSignals({
        recommendation: {
          version: '0.9.0',
          publishedAt: '2024-01-01T00:00:00.000Z',
          ageDays: 90,
          reasons: ['latest release is only 2 day(s) old'],
        },
      }),
    );

    expect(report.recommendation?.version).toBe('0.9.0');
  });
});
