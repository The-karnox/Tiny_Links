const { pool } = require('../_db');

const MAX_ATTEMPTS = 6;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!pool) return res.json([]);
    try {
      const result = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links ORDER BY id DESC');
      return res.json(result.rows);
    } catch (err) {
      console.error('Error fetching links', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  if (req.method === 'POST') {
    const { target_url, url, original } = req.body || {};
    const incoming = target_url || url || original;
    if (!incoming) return res.status(400).json({ error: 'target_url is required' });

    if (!pool) {
      return res.status(500).json({ error: 'DATABASE_URL not configured for serverless API' });
    }

    // check existing
    try {
      const existing = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links WHERE target_url = $1 LIMIT 1', [incoming]);
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return res.status(409).json({ error: 'already_exists', ...row });
      }
    } catch (err) {
      console.error('Error checking existing link', err);
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const shortId = Math.random().toString(36).slice(2, 8);
      try {
        const result = await pool.query(
          'INSERT INTO links (short_code, target_url) VALUES ($1, $2) RETURNING id, short_code, target_url, click_count, last_clicked',
          [shortId, incoming]
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        if (err && err.code === '23505' && attempt < MAX_ATTEMPTS) {
          console.warn(`short_code collision on attempt ${attempt}, retrying...`);
          continue;
        }
        console.error('Error inserting link', err);
        return res.status(500).json({ error: 'Database error while creating link' });
      }
    }
    return res.status(500).json({ error: 'Could not generate a unique short link. Please try again.' });
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
};
