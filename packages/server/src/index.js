const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function startServer(port = 9000) {
    const server = http.createServer((req, res) => {
        // Serve the Dashboard UI
        const publicPath = path.join(__dirname, '../../dashboard/dist');
        let filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);

        if (!fs.existsSync(filePath)) {
            filePath = path.join(publicPath, 'index.html'); // SPA fallback
        }

        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.svg': 'image/svg+xml',
        }[ext] || 'text/plain';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500);
                res.end(`Error: ${error.code}`);
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    const wss = new WebSocket.Server({ server });

    const clients = new Set();
    const dashboards = new Set();

    wss.on('connection', (ws, req) => {
        // Basic protocol: first message can identify if it's a dashboard or an app
        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'IDENTIFY') {
                if (data.role === 'dashboard') {
                    dashboards.add(ws);
                } else {
                    clients.add(ws);
                }
                return;
            }

            // Relay messages from app to dashboards
            if (clients.has(ws)) {
                const payload = JSON.stringify(data);
                dashboards.forEach(db => {
                    if (db.readyState === WebSocket.OPEN) {
                        db.send(payload);
                    }
                });
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            dashboards.delete(ws);
        });
    });

    server.listen(port, () => {
        console.log(`
  🌐 Network Debugger Server started!
  -----------------------------------
  Dashboard: http://localhost:${port}
  SDK Port:  ${port}
  -----------------------------------
    `);
    });
}

module.exports = { startServer };
