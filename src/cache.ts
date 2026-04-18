import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.safe-npm-install', 'cache');
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKeyToFile(key: string): string {
  // Sanitize key for filesystem safety
  const safe = key.replace(/[^a-zA-Z0-9_\-.@]/g, '_');
  return join(CACHE_DIR, `${safe}.json`);
}

export function getCached<T>(key: string): T | null {
  const file = cacheKeyToFile(key);
  if (!existsSync(file)) return null;

  try {
    const raw = readFileSync(file, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  ensureCacheDir();
  const file = cacheKeyToFile(key);
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  try {
    writeFileSync(file, JSON.stringify(entry), 'utf-8');
  } catch {
    // Silently fail — cache is best-effort
  }
}
