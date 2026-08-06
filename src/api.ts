import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MatchingEngine } from './engine.js';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function createApi(engine: MatchingEngine, port = 3000): void {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const segments = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && segments[0] === 'book' && segments[1]) {
        return json(res, 200, engine.getSnapshot(segments[1]));
      }
      if (req.method === 'GET' && segments[0] === 'trades' && segments[1]) {
        return json(res, 200, engine.getTrades(segments[1]));
      }
      if (req.method === 'GET' && segments[0] === 'order' && segments[1]) {
        const order = engine.getOrder(segments[1]);
        return order
          ? json(res, 200, order)
          : json(res, 404, { error: 'not found' });
      }
      if (req.method === 'POST' && segments[0] === 'order') {
        const body = JSON.parse(await readBody(req));
        return json(res, 201, engine.placeOrder(body));
      }
      if (req.method === 'DELETE' && segments[0] === 'order' && segments[1]) {
        const ok = engine.cancelOrder(segments[1]);
        return json(res, ok ? 200 : 404, { cancelled: ok });
      }
      json(res, 404, { error: 'not found' });
    } catch (e: unknown) {
      json(res, 400, { error: (e as Error).message });
    }
  });

  server.listen(port, () =>
    console.log(`Pool matching engine listening on :${port}`)
  );
}
