import type {
  NpmPackageData,
  NpmDownloadData,
  NpmVersionData,
  PackageSignals,
  VersionRecommendation,
  VersionSnapshot,
} from './types.js';

const INSTALL_SCRIPT_KEYS = ['preinstall', 'postinstall', 'install'];

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function isPrereleaseVersion(version: string): boolean {
  return version.includes('-');
}

function buildVersionSnapshot(
  version: string,
  versionData: NpmVersionData | undefined,
  publishedAt: string | undefined,
  now: Date,
): VersionSnapshot {
  const scripts = versionData?.scripts ?? {};
  const installScriptNames = INSTALL_SCRIPT_KEYS.filter((key) => key in scripts);
  const dependencies = versionData?.dependencies ?? {};

  return {
    version,
    publishedAt,
    ageDays: publishedAt ? daysBetween(publishedAt, now) : Number.MAX_SAFE_INTEGER,
    hasInstallScripts: installScriptNames.length > 0,
    installScriptNames,
    dependencyCount: Object.keys(dependencies).length,
    isPrerelease: isPrereleaseVersion(version),
  };
}

function findRecommendedVersion(
  versionSnapshots: VersionSnapshot[],
  latestSnapshot: VersionSnapshot,
): VersionRecommendation | undefined {
  const reasons: string[] = [];

  if (latestSnapshot.hasInstallScripts) {
    reasons.push(
      `latest release runs install-time scripts (${latestSnapshot.installScriptNames.join(', ')})`,
    );
  }

  if (latestSnapshot.ageDays < 14) {
    reasons.push(`latest release is only ${latestSnapshot.ageDays} day(s) old`);
  }

  if (latestSnapshot.isPrerelease) {
    reasons.push('latest release is a prerelease');
  }

  if (reasons.length === 0) {
    return undefined;
  }

  const candidate =
    versionSnapshots.find(
      (snapshot) =>
        snapshot.version !== latestSnapshot.version &&
        !snapshot.isPrerelease &&
        !snapshot.hasInstallScripts &&
        snapshot.ageDays >= 30,
    ) ??
    versionSnapshots.find(
      (snapshot) =>
        snapshot.version !== latestSnapshot.version &&
        !snapshot.isPrerelease &&
        !snapshot.hasInstallScripts &&
        snapshot.ageDays >= 14,
    ) ??
    versionSnapshots.find(
      (snapshot) =>
        snapshot.version !== latestSnapshot.version &&
        !snapshot.isPrerelease &&
        !snapshot.hasInstallScripts,
    );

  if (!candidate) {
    return undefined;
  }

  return {
    version: candidate.version,
    publishedAt: candidate.publishedAt,
    ageDays: candidate.ageDays,
    reasons,
  };
}

function buildTrustSignals(
  packageAgeDays: number,
  weeklyDownloads: number,
  maintainerCount: number,
  versionCount: number,
  latestSnapshot: VersionSnapshot,
): string[] {
  const trustSignals: string[] = [];

  if (weeklyDownloads >= 100_000) {
    trustSignals.push(`Popular package (${formatNumber(weeklyDownloads)} weekly downloads)`);
  } else if (weeklyDownloads >= 1_000) {
    trustSignals.push(`Active package (${formatNumber(weeklyDownloads)} weekly downloads)`);
  }

  if (packageAgeDays >= 365) {
    trustSignals.push('Package has been on npm for over a year');
  }

  if (maintainerCount >= 2) {
    trustSignals.push(`${maintainerCount} maintainers listed`);
  }

  if (versionCount >= 10) {
    trustSignals.push(`Established release history (${versionCount} versions)`);
  }

  if (!latestSnapshot.hasInstallScripts) {
    trustSignals.push('No install-time scripts on the latest release');
  }

  if (latestSnapshot.ageDays >= 30 && latestSnapshot.ageDays <= 365) {
    trustSignals.push('Latest release has had time for ecosystem scrutiny');
  }

  return trustSignals;
}

function buildRiskSignals(
  packageAgeDays: number,
  weeklyDownloads: number,
  maintainerCount: number,
  latestSnapshot: VersionSnapshot,
): string[] {
  const riskSignals: string[] = [];

  if (packageAgeDays < 30) {
    riskSignals.push(`Package is only ${packageAgeDays} day(s) old`);
  }

  if (latestSnapshot.ageDays < 7) {
    riskSignals.push(`Latest release was published ${latestSnapshot.ageDays} day(s) ago`);
  } else if (latestSnapshot.ageDays < 30) {
    riskSignals.push(`Latest release is still fresh (${latestSnapshot.ageDays} day(s) old)`);
  }

  if (latestSnapshot.hasInstallScripts) {
    riskSignals.push(
      `Install-time scripts detected: ${latestSnapshot.installScriptNames.join(', ')}`,
    );
  }

  if (latestSnapshot.isPrerelease) {
    riskSignals.push('Latest release is a prerelease');
  }

  if (weeklyDownloads < 100) {
    riskSignals.push(`Very low weekly downloads (${weeklyDownloads})`);
  }

  if (latestSnapshot.dependencyCount > 25) {
    riskSignals.push(
      `Latest release pulls in ${latestSnapshot.dependencyCount} direct dependencies`,
    );
  }

  if (maintainerCount < 2) {
    riskSignals.push('Single maintainer');
  }

  if (latestSnapshot.ageDays > 365) {
    riskSignals.push(`No release in over a year (${latestSnapshot.ageDays} days)`);
  }

  return riskSignals;
}

export function analyze(
  pkg: NpmPackageData,
  downloads: NpmDownloadData,
): PackageSignals {
  const latestVersion = pkg['dist-tags']?.latest ?? Object.keys(pkg.versions).at(-1) ?? pkg.version;
  const now = new Date();

  const createdDate = pkg.time?.created;
  const packageAgeDays = createdDate ? daysBetween(createdDate, now) : 0;

  const versionSnapshots = Object.entries(pkg.versions)
    .map(([version, versionData]) =>
      buildVersionSnapshot(version, versionData, pkg.time?.[version], now),
    )
    .sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
      return rightTime - leftTime;
    });

  const latestSnapshot =
    versionSnapshots.find((snapshot) => snapshot.version === latestVersion) ??
    buildVersionSnapshot(latestVersion, pkg.versions[latestVersion], pkg.time?.[latestVersion], now);

  const latestVersionAgeDays = latestSnapshot.ageDays;
  const daysSinceLastUpdate = latestVersionAgeDays;
  const trustSignals = buildTrustSignals(
    packageAgeDays,
    downloads.downloads ?? 0,
    pkg.maintainers?.length ?? 0,
    Object.keys(pkg.versions).length,
    latestSnapshot,
  );
  const riskSignals = buildRiskSignals(
    packageAgeDays,
    downloads.downloads ?? 0,
    pkg.maintainers?.length ?? 0,
    latestSnapshot,
  );
  const recommendation = findRecommendedVersion(versionSnapshots, latestSnapshot);

  return {
    packageName: pkg.name,
    version: latestVersion,
    packageAgeDays,
    daysSinceLastUpdate,
    latestVersionAgeDays,
    latestVersionIsPrerelease: latestSnapshot.isPrerelease,
    weeklyDownloads: downloads.downloads ?? 0,
    hasInstallScripts: latestSnapshot.hasInstallScripts,
    installScriptNames: latestSnapshot.installScriptNames,
    dependencyCount: latestSnapshot.dependencyCount,
    maintainerCount: pkg.maintainers?.length ?? 0,
    versionCount: Object.keys(pkg.versions).length,
    trustSignals,
    riskSignals,
    versionSnapshots,
    recommendation,
  };
}
