export interface NpmPackageData {
  name: string;
  version: string;
  description?: string;
  time: Record<string, string>;
  'dist-tags': Record<string, string>;
  versions: Record<string, NpmVersionData>;
  maintainers: NpmMaintainer[];
}

export interface NpmVersionData {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface NpmMaintainer {
  name: string;
  email?: string;
}

export interface NpmDownloadData {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

export interface PackageSignals {
  packageName: string;
  version: string;
  packageAgeDays: number;
  daysSinceLastUpdate: number;
  weeklyDownloads: number;
  hasInstallScripts: boolean;
  installScriptNames: string[];
  dependencyCount: number;
  maintainerCount: number;
  versionCount: number;
}

export type RiskLevel = 'safe' | 'moderate' | 'high';

export interface ScoreBreakdown {
  packageAge: number;
  downloads: number;
  installScripts: number;
  dependencyCount: number;
  maintainerTrust: number;
  lastUpdated: number;
}

export interface RiskReport {
  packageName: string;
  version: string;
  score: number;
  riskLevel: RiskLevel;
  breakdown: ScoreBreakdown;
  signals: PackageSignals;
  warnings: string[];
}

export interface CliOptions {
  packages: string[];
  strict: boolean;
  json: boolean;
}
