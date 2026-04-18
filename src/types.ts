// ─── npm Registry Data ───

export interface NpmPackageData {
  name: string;
  version: string;
  description?: string;
  time: Record<string, string>; // version → ISO date, plus "created" & "modified"
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

// ─── Analysis Signals ───

export interface PackageSignals {
  packageName: string;
  version: string;
  /** Days since first publish */
  packageAgeDays: number;
  /** Days since latest version publish */
  daysSinceLastUpdate: number;
  /** Weekly download count */
  weeklyDownloads: number;
  /** Whether preinstall/postinstall scripts exist */
  hasInstallScripts: boolean;
  /** Names of detected install scripts */
  installScriptNames: string[];
  /** Total production dependency count */
  dependencyCount: number;
  /** Number of maintainers */
  maintainerCount: number;
  /** Number of published versions */
  versionCount: number;
}

// ─── Scoring ───

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

// ─── CLI Options ───

export interface CliOptions {
  packages: string[];
  strict: boolean;
  json: boolean;
}
