import { QueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "nx-qcache";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PERSIST_KEYS = [
  "/api/posts",
  "/api/photos",
  "/api/photos/today",
  "/api/notifications",
  "/api/friends",
  "/api/friend-requests",
  "/api/chats",
  "/api/auth/me",
];

interface CacheEntry {
  data: unknown;
  ts: number;
}

interface StoredCache {
  [key: string]: CacheEntry;
}

function readStorage(): StoredCache {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStorage(cache: StoredCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

export function restoreCache(queryClient: QueryClient) {
  const stored = readStorage();
  const now = Date.now();
  Object.entries(stored).forEach(([rawKey, entry]) => {
    if (now - entry.ts > MAX_AGE_MS) return;
    try {
      const queryKey = JSON.parse(rawKey);
      queryClient.setQueryData(queryKey, entry.data);
    } catch {}
  });
}

export function clearCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function persistCache(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();

  const save = () => {
    const stored = readStorage();
    const now = Date.now();
    cache.getAll().forEach((query) => {
      const key = query.queryKey;
      const keyStr = key[0] as string;
      if (!keyStr || !PERSIST_KEYS.some((k) => keyStr.startsWith(k))) return;
      if (query.state.status !== "success") return;
      stored[JSON.stringify(key)] = { data: query.state.data, ts: now };
    });
    const pruned: StoredCache = {};
    Object.entries(stored).forEach(([k, v]) => {
      if (now - v.ts < MAX_AGE_MS) pruned[k] = v;
    });
    writeStorage(pruned);
  };

  const unsub = cache.subscribe(() => {
    save();
  });

  return unsub;
}
