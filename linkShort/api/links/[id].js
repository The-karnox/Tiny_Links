const { pool } = require('../_db');

module.exports = async (req, res) => {
  const id = Number(req.query.id || req.url.split('/').pop());
  if (!id) return res.status(400).json({ error: 'invalid id' });

  if (req.method === 'GET') {
    if (!pool) return res.status(500).json({ error: 'DATABASE_URL not configured' });
    try {
      const result = await pool.query('SELECT id, short_code, target_url, click_count, last_clicked FROM links WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('DB error fetching link', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  if (req.method === 'DELETE') {
    if (!pool) return res.status(500).json({ error: 'DATABASE_URL not configured' });
    try {
      await pool.query('DELETE FROM links WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      console.error('DB error deleting link', err);
      return res.status(500).json({ error: 'database error' });
    }
  }

  res.setHeader('Allow', 'GET, DELETE');
  res.status(405).end('Method Not Allowed');
};
