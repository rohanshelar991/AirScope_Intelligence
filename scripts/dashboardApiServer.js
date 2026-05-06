const http = require('http');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const publicDataDir = path.join(appRoot, 'public', 'data');
const port = Number(process.env.API_PORT || 8081);
const host = process.env.API_HOST || '127.0.0.1';

function readJson(filename) {
  const filePath = path.join(publicDataDir, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload, null, 2));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/health') {
    const latest = readJson('environment-latest.json');
    sendJson(response, 200, {
      ok: Boolean(latest),
      checkedAt: new Date().toISOString(),
      hasLatestSnapshot: Boolean(latest),
    });
    return;
  }

  if (url.pathname === '/api/dashboard') {
    const latest = readJson('environment-latest.json');
    const history = readJson('environment-history.json');
    const alerts = readJson('alerts.json');

    if (!latest || !history || !alerts) {
      sendJson(response, 503, {
        ok: false,
        message: 'Pipeline outputs are not available yet. Run npm run pipeline:demo or npm run pipeline:run first.',
      });
      return;
    }

    sendJson(response, 200, {
      latest,
      history,
      alerts,
    });
    return;
  }

  if (url.pathname === '/api/latest') {
    const latest = readJson('environment-latest.json');
    sendJson(response, latest ? 200 : 404, latest || { ok: false, message: 'Latest snapshot not found.' });
    return;
  }

  if (url.pathname === '/api/history') {
    const history = readJson('environment-history.json');
    sendJson(response, history ? 200 : 404, history || { ok: false, message: 'History not found.' });
    return;
  }

  if (url.pathname === '/api/alerts') {
    const alerts = readJson('alerts.json');
    sendJson(response, alerts ? 200 : 404, alerts || { ok: false, message: 'Alerts not found.' });
    return;
  }

  sendJson(response, 404, {
    ok: false,
    message: 'Endpoint not found.',
    available: ['/api/health', '/api/dashboard', '/api/latest', '/api/history', '/api/alerts'],
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Dashboard API server could not start because ${host}:${port} is already in use.`);
    process.exit(1);
  }

  console.error(`Dashboard API server failed on ${host}:${port}: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Dashboard API server listening on http://${host}:${port}`);
});
