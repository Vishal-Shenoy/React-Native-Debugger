const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

function startServer(port = 9000) {
    const server = http.createServer((req, res) => {
        // Serve the Dashboard UI
        const publicPath = path.join(__dirname, '../dashboard');
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
        const remoteAddr = req.socket.remoteAddress;
        console.log(`[Server] New connection attempt from ${remoteAddr}`);

        // Basic protocol: first message can identify if it's a dashboard or an app
        ws.on('message', (message) => {
            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                console.error('[Server] Received non-JSON message');
                return;
            }

            if (data.type === 'IDENTIFY') {
                if (data.role === 'dashboard') {
                    dashboards.add(ws);
                    console.log(`[Server] Dashboard connected. Total dashboards: ${dashboards.size}`);
                } else {
                    clients.add(ws);
                    console.log(`[Server] Mobile client identified. Total clients: ${clients.size}`);
                }
                return;
            }

            // Relay messages from app to dashboards
            if (clients.has(ws) || !dashboards.has(ws)) {
                if (!clients.has(ws) && !dashboards.has(ws)) {
                    // Not identified yet but sending data? Auto-identify as client
                    clients.add(ws);
                    console.log(`[Server] Auto-identified client from traffic. Total clients: ${clients.size}`);
                }

                if (clients.has(ws)) {
                    console.log(`[Server] Relaying message from client: ${data.id || 'unknown'} (${data.type})`);
                    const payload = JSON.stringify(data);
                    dashboards.forEach(db => {
                        if (db.readyState === WebSocket.OPEN) {
                            db.send(payload);
                        }
                    });
                }
            }
        });

        ws.on('close', () => {
            if (clients.has(ws)) {
                clients.delete(ws);
                console.log('[Server] Client disconnected');
            }
            if (dashboards.has(ws)) {
                dashboards.delete(ws);
                console.log('[Server] Dashboard disconnected');
            }
        });
    });

    server.listen(port, () => {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        const addresses = [];
        for (const k in interfaces) {
            for (const k2 in interfaces[k]) {
                const address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }

        console.log(`
  🌐 Network Debugger Server started!
  -----------------------------------
  Dashboard: http://localhost:${port}
  SDK Port:  ${port}

  Possible host IPs for real devices:
  ${addresses.map(ip => `👉  ${ip}`).join('\n  ')}
  -----------------------------------
    `);
    });
}

module.exports = { startServer };
