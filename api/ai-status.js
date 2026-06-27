// Vercel serverless function: GET /api/ai-status
const { aiStatus } = require('../lib/ai');
module.exports = async (req, res) => {
  try { res.status(200).json(await aiStatus()); }
  catch (e) { res.status(200).json({ available:false, source:'offline', model:null }); }
};
