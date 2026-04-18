import type { NpmPackageData, NpmDownloadData, PackageSignals } from './types.js';

const INSTALL_SCRIPT_KEYS = ['preinstall', 'postinstall', 'install'];

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export function analyze(
  pkg: NpmPackageData,
  downloads: NpmDownloadData,
): PackageSignals {
  const latestVersion = pkg['dist-tags']?.latest ?? Object.keys(pkg.versions).pop()!;
  const versionData = pkg.versions[latestVersion];
  const now = new Date();

  const createdDate = pkg.time?.created;
  const packageAgeDays = createdDate ? daysBetween(createdDate, now) : 0;

  const modifiedDate = pkg.time?.modified ?? pkg.time?.[latestVersion];
  const daysSinceLastUpdate = modifiedDate ? daysBetween(modifiedDate, now) : 999;

  const scripts = versionData?.scripts ?? {};
  const installScriptNames = INSTALL_SCRIPT_KEYS.filter((key) => key in scripts);

  const deps = versionData?.dependencies ?? {};
  const dependencyCount = Object.keys(deps).length;

  return {
    packageName: pkg.name,
    version: latestVersion,
    packageAgeDays,
    daysSinceLastUpdate,
    weeklyDownloads: downloads.downloads ?? 0,
    hasInstallScripts: installScriptNames.length > 0,
    installScriptNames,
    dependencyCount,
    maintainerCount: pkg.maintainers?.length ?? 0,
    versionCount: Object.keys(pkg.versions).length,
  };
}
