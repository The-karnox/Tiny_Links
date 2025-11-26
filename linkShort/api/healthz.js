module.exports = (req, res) => {
  res.json({ status: 200, uptime: process.uptime(), timestamp: new Date().toISOString() });
};
