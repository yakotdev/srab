import type {
  ThemeRuntimeMethod,
  ThemeRuntimeRequestEnvelope,
  ThemeRuntimeResponseEnvelope,
} from './types';

const DEFAULT_TIMEOUT_MS = 45_000;
let requestSeq = 0;

function nextRequestId(): string {
  requestSeq += 1;
  return `tr_${Date.now()}_${requestSeq}`;
}

/**
 * Cross-origin parent iframe — theme cannot call storefront `/api` directly (PNA / cookies).
 */
export function isCrossOriginIframe(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.parent === window) return false;
  try {
    void window.parent.location.origin;
    return false;
  } catch {
    return true;
  }
}

/** Use host runtime bridge when theme is embedded in parent (any iframe). */
export function shouldUseThemeRuntimeBridge(): boolean {
  if (typeof window === 'undefined') return false;
  return window.parent !== window;
}

export class ThemeRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ThemeRuntimeError';
  }
}

function getRuntimeTarget(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.parent !== window ? window.parent : null;
}

/**
 * Call storefront host via postMessage. Parent must reply with STORIFY_RUNTIME_RESPONSE.
 */
export async function themeRuntimeCall<T = unknown>(
  method: ThemeRuntimeMethod,
  params?: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const target = getRuntimeTarget();
  if (!target) {
    throw new ThemeRuntimeError('NO_PARENT', 'Theme runtime requires an embedded parent window');
  }

  const requestId = nextRequestId();
  const envelope: ThemeRuntimeRequestEnvelope = {
    type: 'STORIFY_RUNTIME_REQUEST',
    requestId,
    method,
    params,
  };

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new ThemeRuntimeError('TIMEOUT', `Runtime request timed out: ${method}`));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      const data = event.data as ThemeRuntimeResponseEnvelope | undefined;
      if (!data || data.type !== 'STORIFY_RUNTIME_RESPONSE' || data.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      if (data.ok) {
        resolve(data.result as T);
      } else {
        reject(
          new ThemeRuntimeError(
            String(data.error?.code ?? 'ERROR'),
            String(data.error?.message ?? 'Request failed'),
          ),
        );
      }
    };

    window.addEventListener('message', onMessage);
    try {
      target.postMessage(envelope, '*');
    } catch (e) {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      reject(e instanceof Error ? e : new ThemeRuntimeError('POST_FAILED', String(e)));
    }
  });
}
