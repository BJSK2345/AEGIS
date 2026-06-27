// Vercel serverless function: POST /api/ai-generate
const { aiGenerate } = require('../lib/ai');

function readRaw(req){ return new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d||'{}')); }); }

module.exports = async (req, res) => {
  let body = req.body;                                   // Vercel auto-parses JSON
  if (!body || typeof body === 'string'){
    try { body = JSON.parse(typeof body === 'string' ? body : await readRaw(req)); } catch(e){ body = {}; }
  }
  try {
    const r = await aiGenerate((body && body.prompt) || '', (body && body.system) || '');
    res.status(200).json(r ? { ok:true, source:r.source, model:r.model, response:r.text }
                            : { ok:false, source:'offline' });
  } catch (e) {
    res.status(200).json({ ok:false, error:String((e && e.message) || e) });
  }
};
