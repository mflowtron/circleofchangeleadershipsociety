/**
 * Lightweight structured logger for auth + routing flows.
 *
 * Emits grep-friendly lines like:
 *   2026-05-17T00:35:12.301Z [auth] profile_fetch_success user=6d8fab70 role=admin is_approved=true
 *
 * Only the first 8 chars of any user_id are emitted (no PII beyond that).
 * If a future user gets stuck on /pending-approval, ask them to copy their
 * browser console — the full decision trace will be visible.
 */

export type AuthTag = 'auth' | 'routing' | 'callback' | 'pending';

type Fields = Record<string, unknown> | undefined;

function shortId(id: unknown): string | undefined {
  if (typeof id !== 'string' || !id) return undefined;
  return id.slice(0, 8);
}

function format(tag: AuthTag, event: string, fields?: Fields): string {
  const ts = new Date().toISOString();
  const parts: string[] = [`${ts} [${tag}] ${event}`];
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      const value = k === 'user_id' || k === 'user' ? shortId(v) ?? String(v) : v;
      parts.push(`${k}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
    }
  }
  return parts.join(' ');
}

export function authLog(tag: AuthTag, event: string, fields?: Fields): void {
  // eslint-disable-next-line no-console
  console.info(format(tag, event, fields));
}

export function authWarn(tag: AuthTag, event: string, fields?: Fields): void {
  // eslint-disable-next-line no-console
  console.warn(format(tag, event, fields));
}

export function authError(tag: AuthTag, event: string, fields?: Fields, err?: unknown): void {
  // eslint-disable-next-line no-console
  console.error(format(tag, event, fields), err ?? '');
}
