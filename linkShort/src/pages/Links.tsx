import { useEffect, useMemo, useState } from 'react';
import api, { API_BASE } from '../api';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function LinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [selectedStatsId, setSelectedStatsId] = useState<number | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.listLinks();
        setLinks(data);
        setError(null);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    load();

    // Refresh links when the page becomes visible again (so click counts updated after redirects)
    function onVisibility() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const filtered = useMemo(() => links.filter(l => l.target_url.includes(q) || l.short_code.includes(q)), [links, q]);
  const navigate = useNavigate();

  async function handleDelete(id: number) {
    if (!confirm('Delete this link?')) return;
    try {
      await api.deleteLink(id);
      // reload list from server to keep UI consistent
      const data = await api.listLinks();
      setLinks(data);
      if (selectedStatsId === id) {
        setSelectedStatsId(null);
        setStats(null);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function handleShowStats(id: number) {
    // toggle
    if (selectedStatsId === id) {
      setSelectedStatsId(null);
      setStats(null);
      return;
    }
    try {
      const data = await api.getLink(id);
      setSelectedStatsId(id);
      setStats(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }


  return (
    <section>
      <h2>Your links</h2>
      <div className="card">
        <div className="controls">
          <input placeholder="Filter by URL or code" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading && <div className="muted">Loading…</div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="links-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Target</th>
                  <th>Clicks</th>
                  <th>Last Clicked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <>
                    <tr key={l.id}>
                      <td><a href={`${API_BASE}/api/r/${l.short_code}`} target="_blank" rel="noopener noreferrer">{l.short_code}</a></td>
                      <td title={l.target_url}>{truncate(l.target_url)}</td>
                      <td>{l.click_count}</td>
                      <td>{l.last_clicked ? new Date(l.last_clicked).toLocaleString() : '—'}</td>
                      <td>
                        <Button variant="ghost" onClick={() => navigate('/')}>Add</Button>
                        <Button variant="ghost" onClick={() => handleShowStats(l.id)}>Stats</Button>
                        <Button variant="ghost" onClick={() => handleDelete(l.id)}>Delete</Button>
                      </td>
                    </tr>
                    {selectedStatsId === l.id && stats && (
                      <tr className="stats-row">
                        <td colSpan={5}>
                          <div className="stats-panel">
                            <div><strong>Short URL:</strong> <a href={`${API_BASE}/api/r/${stats.short_code}`} target="_blank" rel="noreferrer">{API_BASE}/api/r/{stats.short_code}</a></div>
                            <div><strong>Clicks:</strong> {stats.click_count}</div>
                            <div><strong>Last Clicked:</strong> {stats.last_clicked ? new Date(stats.last_clicked).toLocaleString() : '—'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && <div className="muted">No links yet.</div>}
      </div>
    </section>
  );
}
