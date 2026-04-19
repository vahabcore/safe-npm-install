import { describe, it, expect } from 'vitest';
import { analyze } from '../src/analyzer.js';
import type { NpmPackageData, NpmDownloadData } from '../src/types.js';

function makePkgData(overrides: Partial<NpmPackageData> = {}): NpmPackageData {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    'dist-tags': { latest: '1.0.0' },
    time: {
      created: '2022-01-01T00:00:00.000Z',
      modified: new Date().toISOString(),
      '1.0.0': '2022-06-01T00:00:00.000Z',
    },
    versions: {
      '1.0.0': {
        name: 'test-pkg',
        version: '1.0.0',
        scripts: {},
        dependencies: { lodash: '^4.0.0' },
      },
    },
    maintainers: [{ name: 'alice' }, { name: 'bob' }],
    ...overrides,
  };
}

function makeDlData(overrides: Partial<NpmDownloadData> = {}): NpmDownloadData {
  return {
    downloads: 100000,
    start: '2024-01-01',
    end: '2024-01-07',
    package: 'test-pkg',
    ...overrides,
  };
}

describe('analyzer', () => {
  it('extracts basic signals', () => {
    const signals = analyze(makePkgData(), makeDlData());
    expect(signals.packageName).toBe('test-pkg');
    expect(signals.version).toBe('1.0.0');
    expect(signals.weeklyDownloads).toBe(100000);
    expect(signals.dependencyCount).toBe(1);
    expect(signals.maintainerCount).toBe(2);
    expect(signals.versionCount).toBe(1);
    expect(signals.trustSignals).toEqual(
      expect.arrayContaining([expect.stringContaining('Popular package')]),
    );
  });

  it('detects install scripts', () => {
    const pkg = makePkgData({
      versions: {
        '1.0.0': {
          name: 'test-pkg',
          version: '1.0.0',
          scripts: { postinstall: 'node exploit.js', test: 'vitest' },
          dependencies: {},
        },
      },
    });
    const signals = analyze(pkg, makeDlData());
    expect(signals.hasInstallScripts).toBe(true);
    expect(signals.installScriptNames).toContain('postinstall');
    expect(signals.installScriptNames).not.toContain('test');
  });

  it('reports no install scripts when none exist', () => {
    const pkg = makePkgData({
      versions: {
        '1.0.0': {
          name: 'test-pkg',
          version: '1.0.0',
          scripts: { test: 'vitest', build: 'tsc' },
          dependencies: {},
        },
      },
    });
    const signals = analyze(pkg, makeDlData());
    expect(signals.hasInstallScripts).toBe(false);
    expect(signals.installScriptNames).toHaveLength(0);
  });

  it('calculates package age correctly', () => {
    const signals = analyze(makePkgData(), makeDlData());
    // Package created 2022-01-01, so age should be > 365 days
    expect(signals.packageAgeDays).toBeGreaterThan(365);
  });

  it('handles missing dependencies', () => {
    const pkg = makePkgData({
      versions: {
        '1.0.0': {
          name: 'test-pkg',
          version: '1.0.0',
        },
      },
    });
    const signals = analyze(pkg, makeDlData());
    expect(signals.dependencyCount).toBe(0);
  });

  it('recommends an older stable version when the latest release is fresh and has install scripts', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const pkg = makePkgData({
      'dist-tags': { latest: '1.1.0' },
      time: {
        created: '2022-01-01T00:00:00.000Z',
        modified: twoDaysAgo,
        '1.0.0': ninetyDaysAgo,
        '1.1.0': twoDaysAgo,
      },
      versions: {
        '1.0.0': {
          name: 'test-pkg',
          version: '1.0.0',
          scripts: {},
          dependencies: {},
        },
        '1.1.0': {
          name: 'test-pkg',
          version: '1.1.0',
          scripts: { postinstall: 'node setup.js' },
          dependencies: {},
        },
      },
    });

    const signals = analyze(pkg, makeDlData());

    expect(signals.version).toBe('1.1.0');
    expect(signals.latestVersionAgeDays).toBeLessThanOrEqual(2);
    expect(signals.riskSignals).toEqual(
      expect.arrayContaining([expect.stringContaining('Install-time scripts detected')]),
    );
    expect(signals.recommendation?.version).toBe('1.0.0');
    expect(signals.recommendation?.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('install-time scripts')]),
    );
  });
});
