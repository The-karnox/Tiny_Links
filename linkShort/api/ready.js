const { pool } = require('./_db');

module.exports = async (req, res) => {
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
  result.checks.db = 'not-configured';
  return res.json(result);
};
