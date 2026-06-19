'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const FIXTURE_HTML = fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'sample.html'),
  'utf8'
);

/**
 * Start a tiny local HTTP server used to exercise NodeScraper against a
 * real request/response cycle without hitting the network.
 *
 * Routes:
 *  - GET /            -> 200 with the fixture HTML
 *  - GET /not-found    -> 404
 *  - GET /redirect      -> 302 to /
 *  - GET /blocked-ua    -> 403 unless a non-default User-Agent is sent
 *  - GET /slow          -> responds after a short delay (timeout testing)
 *
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
function startTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/not-found') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      if (url === '/redirect') {
        res.writeHead(302, { Location: '/' });
        res.end();
        return;
      }

      if (url === '/blocked-ua') {
        const ua = req.headers['user-agent'] || '';
        if (!ua || /^axios/i.test(ua)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(FIXTURE_HTML);
        return;
      }

      if (url === '/slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(FIXTURE_HTML);
        }, 300);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(FIXTURE_HTML);
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res))
      });
    });
  });
}

module.exports = { startTestServer };
