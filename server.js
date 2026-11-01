const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const port = process.env.PORT || 3000;
const root = __dirname;
const messagesFile = path.join(root, 'messages.json');
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
function sendJson(response, status, payload) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(payload)); }
function readBody(request) { return new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => { body += chunk; if (body.length > 10000) { reject(new Error('Request is too large.')); request.destroy(); } }); request.on('end', () => resolve(body)); request.on('error', reject); }); }
const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'POST' && requestUrl.pathname === '/api/contact') {
    try {
      const { name, email, message } = JSON.parse(await readBody(request));
      if (!name || !email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJson(response, 400, { error: 'Please provide a valid name, email, and message.' });
      let messages = [];
      if (fs.existsSync(messagesFile)) messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
      messages.push({ name, email, message, receivedAt: new Date().toISOString() });
      fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
      return sendJson(response, 201, { message: 'Thanks! Your message has been received.' });
    } catch (error) { console.error('Contact submission failed:', error.message); return sendJson(response, 400, { error: 'The message could not be submitted.' }); }
  }
  const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Not found' });
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});
server.listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));
