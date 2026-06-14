const http = require('http');
const { WebSocketServer } = require('ws');
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Storm Royale relay OK'); });
const wss = new WebSocketServer({ server });
const rooms = {};
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
function newCode() { let c; do { c = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); } while (rooms[c]); return c; }
wss.on('connection', (ws) => {
  ws.room = null; ws.id = null; ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.t === 'create') { const code = newCode(); rooms[code] = new Set([ws]); ws.room = code; ws.id = m.id || ('h' + Math.random().toString(36).slice(2)); ws.send(JSON.stringify({ t: 'created', code })); return; }
    if (m.t === 'join') { const code = (m.code || '').toUpperCase(); const set = rooms[code]; if (!set) { ws.send(JSON.stringify({ t: 'nojoin' })); return; } set.add(ws); ws.room = code; ws.id = m.id || ('p' + Math.random().toString(36).slice(2)); ws.send(JSON.stringify({ t: 'joined', code })); return; }
    if (ws.room && rooms[ws.room]) { const raw = data.toString(); for (const peer of rooms[ws.room]) { if (peer !== ws && peer.readyState === 1) peer.send(raw); } }
  });
  ws.on('close', () => { const code = ws.room; if (code && rooms[code]) { rooms[code].delete(ws); const bye = JSON.stringify({ t: 'bye', from: ws.id }); for (const peer of rooms[code]) if (peer.readyState === 1) peer.send(bye); if (rooms[code].size === 0) delete rooms[code]; } });
});
setInterval(() => { wss.clients.forEach((ws) => { if (ws.isAlive === false) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) {} }); }, 25000);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Storm Royale relay sur le port ' + PORT));
