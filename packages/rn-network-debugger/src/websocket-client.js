/**
 * WebSocket client for the SDK to stream data to the debug server
 */

export class DebugWebSocketClient {
    constructor(options = {}) {
        this.port = options.port || 9000;
        this.host = options.host || 'localhost';
        this.ws = null;
        this.queue = [];
        this.reconnectTimer = null;
        this.isConnected = false;
    }

    connect() {
        const url = `ws://${this.host}:${this.port}`;
        console.log(`[NetworkDebugger] Connecting to ${url}...`);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log(`[NetworkDebugger] ✅ Connected to debug server at ${url}`);
                this.isConnected = true;
                // Identify as a mobile client
                this.send({ type: 'IDENTIFY', role: 'client' });
                this.flushQueue();
            };

            this.ws.onmessage = (e) => {
                // Handle potential commands from server
            };

            this.ws.onclose = (e) => {
                console.log(`[NetworkDebugger] 🔌 Connection closed: ${e.code} ${e.reason || 'No reason provided'}`);
                this.isConnected = false;
                this.scheduleReconnect();
            };

            this.ws.onerror = (e) => {
                console.log('[NetworkDebugger] ❌ WebSocket Error:', e.message || 'Check if server is running and port is correct');
                this.isConnected = false;
                this.scheduleReconnect();
            };
        } catch (err) {
            console.error('[NetworkDebugger] 💥 Critical error during connection:', err);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 3000);
    }

    send(data) {
        if (this.isConnected && this.ws) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (e) {
                console.error('[NetworkDebugger] Failed to stringify message:', e);
            }
        } else {
            this.queue.push(data);
            if (this.queue.length > 500) this.queue.shift(); // Prevent memory leak
        }
    }

    flushQueue() {
        while (this.queue.length > 0 && this.isConnected) {
            const data = this.queue.shift();
            try {
                this.ws.send(JSON.stringify(data));
            } catch (e) {
                console.error('[NetworkDebugger] Failed to stringify queued message:', e);
            }
        }
    }
}

