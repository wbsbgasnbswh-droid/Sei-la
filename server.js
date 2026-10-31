// Servidor básico do Arena Pixel.
// Cada jogador entra numa sala com um código e o servidor repassa
// as mensagens (posição, tiros, etc.) para os outros jogadores da mesma sala.

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Servidor Arena Pixel online');
});

const wss = new WebSocketServer({ server });
const rooms = {}; // código da sala -> conjunto de conexões
let nextId = 1;

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(code, obj, except) {
  if (!rooms[code]) return;
  for (const client of rooms[code]) {
    if (client !== except) send(client, obj);
  }
}

wss.on('connection', (ws) => {
  ws.id = nextId++;
  ws.room = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'join') {
      const code = String(msg.room || 'sala').slice(0, 12).toUpperCase();
      ws.room = code;
      rooms[code] = rooms[code] || new Set();
      rooms[code].add(ws);
      send(ws, { type: 'joined', id: ws.id, room: code, players: rooms[code].size });
      broadcast(code, { type: 'players', count: rooms[code].size }, ws);
      return;
    }

    if (ws.room) {
      broadcast(ws.room, { ...msg, from: ws.id }, ws);
    }
  });

  ws.on('close', () => {
    const code = ws.room;
    if (!code || !rooms[code]) return;
    rooms[code].delete(ws);
    if (rooms[code].size === 0) {
      delete rooms[code];
    } else {
      broadcast(code, { type: 'players', count: rooms[code].size });
    }
  });
});

server.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});
