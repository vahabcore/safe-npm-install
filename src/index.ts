export { fetchPackageData, fetchDownloads } from './fetcher.js';
export { analyze } from './analyzer.js';
export { score } from './scorer.js';
export { reportText, reportJson } from './reporter.js';
export type {
  RiskReport,
  RiskLevel,
  PackageSignals,
  ScoreBreakdown,
  VersionRecommendation,
  VersionSnapshot,
  NpmPackageData,
  NpmDownloadData,
  CliOptions,
} from './types.js';
