// AEGIS shared AI logic — tiered and used by BOTH the local server (server.js)
// and the Vercel serverless functions (api/*.js):
//   1) on-device Ollama   — free & private, local dev only
//   2) cloud API (Anthropic) — used when Ollama isn't reachable (e.g. on Vercel)
//   3) null                — caller (browser) falls back to offline templates
// The API key is read from the environment and never reaches the browser.
const OLLAMA      = process.env.OLLAMA_HOST   || 'http://127.0.0.1:11434';
const MODEL       = process.env.AEGIS_MODEL   || 'llama3.2';
const CLOUD_KEY   = process.env.ANTHROPIC_API_KEY || process.env.AEGIS_API_KEY || '';
const CLOUD_MODEL = process.env.AEGIS_CLOUD_MODEL || 'claude-haiku-4-5-20251001';
const ALLOW_OLLAMA = !process.env.VERCEL;     // Ollama only exists on a local machine

async function withTimeout(fn, ms){
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fn(c.signal); } finally { clearTimeout(t); }
}
async function ollamaModels(){
  return withTimeout(async signal => {
    const r = await fetch(OLLAMA + '/api/tags', { signal });
    const j = await r.json();
    return (j.models || []).map(m => m.name);
  }, 1500);
}
async function ollamaGenerate(prompt, system){
  return withTimeout(async signal => {
    const r = await fetch(OLLAMA + '/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'}, signal,
      body: JSON.stringify({ model:MODEL, prompt, system, stream:false, options:{ temperature:0.4, num_predict:520 } })
    });
    const j = await r.json();
    return j.response || '';
  }, 60000);
}
async function cloudGenerate(prompt, system){
  return withTimeout(async signal => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', signal,
      headers:{ 'Content-Type':'application/json', 'x-api-key':CLOUD_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:CLOUD_MODEL, max_tokens:700, system, messages:[{ role:'user', content:prompt }] })
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'cloud error');
    return (j.content && j.content[0] && j.content[0].text) || '';
  }, 30000);
}

async function aiStatus(){
  if (ALLOW_OLLAMA){ try { const m = await ollamaModels(); if (m.length) return { available:true, source:'ollama', model:(m.find(x=>x.startsWith(MODEL))||m[0]) }; } catch(e){} }
  if (CLOUD_KEY) return { available:true, source:'cloud', model:CLOUD_MODEL };
  return { available:false, source:'offline', model:null };
}
async function aiGenerate(prompt, system){
  if (ALLOW_OLLAMA){ try { const m = await ollamaModels(); if (m.length){ const t = await ollamaGenerate(prompt, system);
    if (t && t.trim().length>10) return { source:'ollama', model:(m.find(x=>x.startsWith(MODEL))||m[0]), text:t.trim() }; } } catch(e){} }
  if (CLOUD_KEY){ try { const t = await cloudGenerate(prompt, system);
    if (t && t.trim().length>10) return { source:'cloud', model:CLOUD_MODEL, text:t.trim() }; } catch(e){} }
  return null; // browser uses offline templates
}

module.exports = { aiStatus, aiGenerate };
