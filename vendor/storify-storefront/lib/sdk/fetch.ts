/**
 * SDK fetch: one place for API calls with correct base URL and X-Store-Id.
 */

import { getApiUrl, getStoreId } from './config';
import { withStoreIdInGetPath } from '../store-id';

function buildOptions(method: string, body?: unknown): RequestInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const storeId = getStoreId();
  if (storeId) (headers as Record<string, string>)['X-Store-Id'] = storeId;
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (body !== undefined) init.body = JSON.stringify(body);
  return init;
}

export async function sdkFetch<T>(endpoint: string): Promise<T> {
  const base = getApiUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const pathWithStoreId = withStoreIdInGetPath(path, getStoreId());
  const url = `${base}${pathWithStoreId}`;
  const res = await fetch(url, buildOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function sdkPost<T>(endpoint: string, body: unknown): Promise<T> {
  const base = getApiUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;
  const res = await fetch(url, buildOptions('POST', body));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}
