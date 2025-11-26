import { useState } from 'react';
import Button from '../components/Button';
import api, { API_BASE } from '../api';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  

  function validate(u: string) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate(url)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      const created = await api.createLink({ target_url: url });
      // If server indicates the URL already exists, show a clear message instead
      if ((created as any).existing) {
        setError(`Short link already exists: ${API_BASE}/api/r/${created.short_code}`);
      } else {
        // Show the backend redirect URL so clicks go to the server (which will redirect)
        setSuccess(`${API_BASE}/api/r/${created.short_code}`);
        setUrl('');
      }
    } catch (err: any) {
      // Show a friendly message for known server responses, otherwise show the message
      const message = err?.message || 'Failed to create link';
      if (message.includes('Could not generate a unique short link')) {
        setError('Could not create a unique short link right now. Please try again in a moment.');
      } else if (message.toLowerCase().includes('database')) {
        setError('Server database error. Please try again later.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      
      <h2>Create a short link</h2>
      <form onSubmit={handleSubmit} className="card form-card">
        <label>
          Target URL
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <div className="controls">
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
        </div>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Created: <a href={success}>{success}</a></div>}
      </form>
    </section>
  );
}
