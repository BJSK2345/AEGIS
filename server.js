// Local dev server for AEGIS (zero-dependency).
// Serves the static app AND the same /api/ai-* endpoints the Vercel
// functions expose, so the browser code is identical in both places.
// On Vercel this file is NOT used — api/ai-*.js run as serverless functions.
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env locally so `node server.js` can use a cloud key without exporting it.
// (On Vercel, env vars are injected by the platform and there is no .env file.)
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  env.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* no .env, fine */ }

const { aiStatus, aiGenerate } = require('./lib/ai');

const PORT = process.env.PORT || 4178;
const ROOT = __dirname;
const TYPES = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon'
};
function sendJSON(res, code, obj){ res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); }

http.createServer((req, res) => {
  if (req.method==='GET' && req.url==='/api/ai-status'){
    aiStatus().then(s=>sendJSON(res,200,s)).catch(()=>sendJSON(res,200,{available:false,source:'offline',model:null}));
    return;
  }
  if (req.method==='POST' && req.url==='/api/ai-generate'){
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
      let p; try{ p=JSON.parse(body); }catch(e){ return sendJSON(res,400,{ok:false,error:'bad json'}); }
      aiGenerate(p.prompt||'', p.system||'')
        .then(r=> r ? sendJSON(res,200,{ok:true,source:r.source,model:r.model,response:r.text})
                    : sendJSON(res,200,{ok:false,source:'offline'}))
        .catch(err=> sendJSON(res,200,{ok:false,error:String((err&&err.message)||err)}));
    });
    return;
  }

  // static files
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.join(ROOT, path.normalize(url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('AEGIS demo on http://localhost:' + PORT));
