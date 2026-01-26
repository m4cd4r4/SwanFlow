const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath;

  // Strip query parameters
  const urlWithoutQuery = req.url.split('?')[0];

  // Route mapping (mimicking vercel.json)
  // Dashboard is now at / (landing page removed)
  if (urlWithoutQuery === '/' || urlWithoutQuery === '' || urlWithoutQuery === '/dashboard') {
    filePath = path.join(__dirname, 'frontend/web-dashboard/index.html');
  } else if (urlWithoutQuery.startsWith('/dashboard/')) {
    // Remove /dashboard prefix and serve from web-dashboard folder
    const subPath = urlWithoutQuery.substring('/dashboard/'.length);
    filePath = path.join(__dirname, 'frontend/web-dashboard', subPath);
  } else {
    // Default: serve from web-dashboard folder
    const cleanPath = urlWithoutQuery.startsWith('/') ? urlWithoutQuery.substring(1) : urlWithoutQuery;
    filePath = path.join(__dirname, 'frontend/web-dashboard', cleanPath);
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      console.log(`404: ${req.url} → ${filePath}`);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✓ Dev server running at http://localhost:${PORT}`);
  console.log(`  Dashboard: http://localhost:${PORT}/`);
  console.log(`  Knowledge: http://localhost:${PORT}/knowledge.html`);
});
