const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Use Postgres (Neon) when DATABASE_URL is provided, otherwise fallback to in-memory
const { Pool } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL });
  console.log('Using Postgres for persistence');
} else {
  console.log('No DATABASE_URL set — using in-memory store (dev only)');
}

// In-memory store for links (fallback)
const links = new Map(); // short_code -> { id, short_code, target_url, click_count, last_clicked }
let nextId = 1;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express server' });
});

function generateShortId() {
  return Math.random().toString(36).slice(2, 8);
}

// Example endpoint to shorten a URL (placeholder implementation)
app.post('/api/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const shortId = generateShortId();
  res.json({ short: shortId, original: url });
});

// Compatibility endpoints expected by the frontend
app.post('/links', async (req, res) => {
  const { target_url, url, original } = req.body;
  const incoming = target_url || url || original;
  if (!incoming) return res.status(400).json({ error: 'target_url is required' });

  const MAX_ATTEMPTS = 6;

  // Try to persist in DB with retry on unique-constraint violation
  if (pool) {
    // check if the target_url already exists
    try {
      const existing = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links WHERE target_url = $1 LIMIT 1', [incoming]);
      if (existing.rows.length > 0) {
        // return existing record and indicate it already existed
        const row = existing.rows[0];
        row.existing = true;
        return res.status(409).json({ error: 'already_exists', ...row });
      }
    } catch (err) {
      console.error('Error checking existing link in DB', { err, incoming });
      // continue to attempt insertion below
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const shortId = generateShortId();
      try {
        const result = await pool.query(
          'INSERT INTO links (short_code, target_url) VALUES ($1, $2) RETURNING id, short_code, target_url, click_count, last_clicked',
          [shortId, incoming]
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        // Unique violation: try again
        if (err && err.code === '23505' && attempt < MAX_ATTEMPTS) {
          console.warn(`short_code collision on attempt ${attempt}, retrying...`);
          continue;
        }
        // Log DB error details for debugging
        console.error('Error inserting link into DB', { attempt, err, incoming });
        return res.status(500).json({ error: 'Database error while creating link' });
      }
    }
    console.error(`Failed to generate unique short code after ${MAX_ATTEMPTS} attempts for incoming URL: ${incoming}`);
    return res.status(500).json({ error: 'Could not generate a unique short link. Please try again.' });
  }

  // fallback: in-memory, ensure uniqueness by regenerating as needed
  // in-memory: check for existing target_url
  const foundExisting = Array.from(links.values()).find((r) => r.target_url === incoming);
  if (foundExisting) {
    return res.status(409).json({ error: 'already_exists error (409)', ...foundExisting, existing: true });
  }

  let shortId = generateShortId();
  let attempts = 1;
  while (links.has(shortId) && attempts < MAX_ATTEMPTS) {
    shortId = generateShortId();
    attempts++;
  }
  if (links.has(shortId)) {
    return res.status(500).json({ error: 'failed to generate unique short code (in-memory)' });
  }
  const record = {
    id: nextId++,
    short_code: shortId,
    target_url: incoming,
    click_count: 0,
    last_clicked: null,
  };
  links.set(shortId, record);
  res.status(201).json(record);
});

app.get('/links', async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links ORDER BY id DESC');
      return res.json(result.rows);
    } catch (err) {
      console.error('Error fetching links from DB', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  const all = Array.from(links.values());
  res.json(all);
});

// Get a single link by id
app.get('/links/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  if (pool) {
    try {
      const result = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('DB error fetching link', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  const found = Array.from(links.values()).find((r) => r.id === id);
  if (!found) return res.status(404).json({ error: 'not found' });
  return res.json(found);
});

// Liveness probe
app.get('/healthz', (req, res) => {
  res.json({
    status: 200,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (checks DB connectivity if configured)
app.get('/ready', async (req, res) => {
  const result = { status: 'ok', checks: {} };
  if (pool) {
    try {
      await pool.query('SELECT 1');
      result.checks.db = 'ok';
      return res.json(result);
    } catch (err) {
      console.error('Readiness DB check failed', err);
      result.status = 'fail';
      result.checks.db = 'error';
      return res.status(503).json(result);
    }
  }

  // If no DB configured, mark DB as not-configured but still ready
  result.checks.db = 'not-configured';
  return res.json(result);
});

// Redirect endpoint: GET /:short_code -> redirects to target_url and increments counter
app.get('/:short_code', async (req, res) => {
  const { short_code } = req.params;

  if (pool) {
    try {
      const find = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links WHERE short_code = $1', [short_code]);
      const row = find.rows[0];
      if (!row) return res.status(404).send('Not found');

      // update stats
      await pool.query('UPDATE links SET click_count = click_count + 1, last_clicked = NOW() WHERE id = $1', [row.id]);

      return res.redirect(row.target_url);
    } catch (err) {
      console.error('DB error on redirect', err);
      return res.status(500).send('server error');
    }
  }

  const record = links.get(short_code);
  if (!record) {
    return res.status(404).send('Not found');
  }

  // update stats
  record.click_count = (record.click_count || 0) + 1;
  record.last_clicked = new Date().toISOString();
  links.set(short_code, record);

  // redirect to target
  return res.redirect(record.target_url);
});

// Delete a link by id
app.delete('/links/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  if (pool) {
    try {
      await pool.query('DELETE FROM links WHERE id = $1', [id]);
      return res.status(204).send();
    } catch (err) {
      console.error('DB error on delete', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  // fallback in-memory: find by id and delete
  const found = Array.from(links.values()).find((r) => r.id === id);
  if (!found) return res.status(404).json({ error: 'not found' });
  links.delete(found.short_code);
  return res.status(204).send();
});

// Liveness probe
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (checks DB connectivity if configured)
app.get('/ready', async (req, res) => {
  const result = { status: 'ok', checks: {} };
  if (pool) {
    try {
      await pool.query('SELECT 1');
      result.checks.db = 'ok';
      return res.json(result);
    } catch (err) {
      console.error('Readiness DB check failed', err);
      result.status = 'fail';
      result.checks.db = 'error';
      return res.status(503).json(result);
    }
  }

  // If no DB configured, mark DB as not-configured but still ready
  result.checks.db = 'not-configured';
  return res.json(result);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
