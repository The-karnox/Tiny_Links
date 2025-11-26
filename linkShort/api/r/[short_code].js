const { pool } = require('../_db');

module.exports = async (req, res) => {
  const short_code = req.query.short_code || req.url.split('/').pop();
  if (!short_code) return res.status(400).send('invalid code');

  if (!pool) return res.status(500).send('DATABASE_URL not configured');

  try {
    const find = await pool.query('SELECT id, short_code, target_url FROM links WHERE short_code = $1', [short_code]);
    const row = find.rows[0];
    if (!row) return res.status(404).send('Not found');

    await pool.query('UPDATE links SET click_count = click_count + 1, last_clicked = NOW() WHERE id = $1', [row.id]);

    res.writeHead(307, { Location: row.target_url });
    return res.end();
  } catch (err) {
    console.error('DB error on redirect', err);
    return res.status(500).send('server error');
  }
};
