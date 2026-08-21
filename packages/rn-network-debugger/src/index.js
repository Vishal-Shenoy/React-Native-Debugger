import { NetworkInterceptor } from './interceptor';
import { ConsoleInterceptor } from './console-interceptor';
import { WebSocketInterceptor } from './ws-interceptor';
import { DebugWebSocketClient } from './websocket-client';

let interceptor = null;
let consoleInterceptor = null;
let wsInterceptor = null;
let client = null;

/**
 * Starts the network debugger.
 * This should only be called in development environments.
 */
export function startDebugger(config = {}) {
    // Hard constraint: only run in development
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }

    // Check if already started
    if (interceptor) return;

    const {
        port = 9000,
        captureFetch = true,
        captureXHR = true,
        captureConsole = true,
        captureAxios = true, // handled by XHR/Fetch usually
        captureWebSocket = true,
        maxPayloadSize = 1000000,
        maskedHeaders = ['Authorization', 'Cookie', 'Set-Cookie', 'X-Auth-Token'],
        host = 'localhost',
    } = config;

    let targetHost = host;

    // Auto-resolve host for Android emulators if using localhost
    if (targetHost === 'localhost') {
        const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
        if (isAndroid) {
            targetHost = '10.0.2.2';
        }
    }

    client = new DebugWebSocketClient({ port, host: targetHost });
    client.connect();

    if (captureWebSocket) {
        wsInterceptor = new WebSocketInterceptor((event) => {
            // Redundant logging for visibility in Console tab as well
            if (event.event === 'message_sent' || event.event === 'message_received') {
                console.log(`[WS-${event.event === 'message_sent' ? 'OUT' : 'IN'}] ${event.url || ''}`, event.data);
            } else if (event.event !== 'connect') {
                console.log(`[WS-${event.event.toUpperCase()}] ${event.url || ''}`);
            }
            client.send(event);
        });
        wsInterceptor.enable({
            ignoreUrls: [`ws://${targetHost}:${port}`]
        });
    }

    interceptor = new NetworkInterceptor((event) => {
        console.log(`[NetworkDebugger] Capturing ${event.type}: ${event.url || event.method || ''}`);
        client.send(event);
    });

    interceptor.enable({
        captureFetch,
        captureXHR,
        maskedHeaders,
    });

    if (captureConsole) {
        consoleInterceptor = new ConsoleInterceptor((event) => {
            client.send(event);
        });
        consoleInterceptor.enable();
    }

    console.log('🚀 Network Debugger Initialized. Port:', port, 'Target Host:', targetHost);
}
