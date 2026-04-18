import type { NpmPackageData, NpmDownloadData } from './types.js';
import { getCached, setCache } from './cache.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_API = 'https://api.npmjs.org';
const REQUEST_TIMEOUT_MS = 15_000;

class FetchError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new FetchError(res.status, `HTTP ${res.status} for ${url}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch full package metadata from the npm registry.
 */
export async function fetchPackageData(packageName: string): Promise<NpmPackageData> {
  const cacheKey = `pkg_${packageName}`;
  const cached = getCached<NpmPackageData>(cacheKey);
  if (cached) return cached;

  // Encode scoped packages: @scope/name → @scope%2Fname
  const encoded = packageName.startsWith('@')
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);

  const data = await fetchJson<NpmPackageData>(`${NPM_REGISTRY}/${encoded}`);
  setCache(cacheKey, data);
  return data;
}

/**
 * Fetch weekly download count from the npm downloads API.
 */
export async function fetchDownloads(packageName: string): Promise<NpmDownloadData> {
  const cacheKey = `dl_${packageName}`;
  const cached = getCached<NpmDownloadData>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(packageName);
  const data = await fetchJson<NpmDownloadData>(
    `${NPM_API}/downloads/point/last-week/${encoded}`,
  );
  setCache(cacheKey, data);
  return data;
}
