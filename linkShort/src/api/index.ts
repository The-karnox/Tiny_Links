// Use VITE_API_URL when provided. In production (Vercel) you can set it to an empty string
// to make requests relative to the same origin (e.g. `/api/links`). In dev fallback to localhost.
const envApi = import.meta.env.VITE_API_URL;
export const API_BASE = typeof envApi !== 'undefined' ? envApi : (import.meta.env.DEV ? 'http://localhost:3000' : '');

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
  return request<Link>('/links', { method: 'POST', body: JSON.stringify(body) });
}

export async function listLinks(): Promise<Link[]> {
  return request<Link[]>('/links');
}

export async function getLink(id: number): Promise<Link> {
  return request<Link>(`/links/${id}`);
}

export async function deleteLink(id: number): Promise<void> {
  await request<void>(`/links/${id}`, { method: 'DELETE' });
}

type Health = { status: string; uptime?: number; timestamp?: string; checks?: Record<string, string> };

export async function getHealth(): Promise<Health> {
  return request<Health>('/healthz');
}

export async function getReady(): Promise<Health> {
  return request<Health>('/ready');
}

export default { createLink, listLinks, getLink, deleteLink };
