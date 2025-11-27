// Use VITE_API_URL when provided. Otherwise default to relative paths (''),
// so in development Vite's proxy forwards `/api/*` to the local backend and
// in production the requests are relative to the same origin (/api/*).
const envApi = import.meta.env.VITE_API_URL;
export const API_BASE = typeof envApi !== 'undefined' && envApi !== '' ? envApi : '';

type LinkCreate = { target_url: string };
type Link = { id: number; short_code: string; target_url: string; click_count: number; last_clicked: string | null; existing?: boolean };

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const message = data?.error || data?.message || text || res.statusText;
    const err: any = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  // Some endpoints (DELETE) return 204 No Content — avoid calling res.json() on empty responses
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function createLink(body: LinkCreate): Promise<Link> {
  return request<Link>('/api/links', { method: 'POST', body: JSON.stringify(body) });
}

export async function listLinks(): Promise<Link[]> {
  return request<Link[]>('/api/links');
}

export async function getLink(id: number): Promise<Link> {
  return request<Link>(`/api/links/${id}`);
}

export async function deleteLink(id: number): Promise<void> {
  await request<void>(`/api/links/${id}`, { method: 'DELETE' });
}

type Health = { status: string; uptime?: number; timestamp?: string; checks?: Record<string, string> };

export async function getHealth(): Promise<Health> {
  return request<Health>('/api/healthz');
}

export async function getReady(): Promise<Health> {
  return request<Health>('/api/ready');
}

export default { createLink, listLinks, getLink, deleteLink };
