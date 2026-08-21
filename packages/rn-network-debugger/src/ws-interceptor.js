/**
 * Interceptor for WebSockets in React Native
 */

const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to sanitize data for the debugger
const sanitizeData = (data) => {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') return data;
  
  // Try to capture text from binary data (ArrayBuffer, TypedArrays)
  if (data instanceof ArrayBuffer || (data && data.buffer instanceof ArrayBuffer && data.byteLength !== undefined)) {
    try {
      let text;
      if (typeof TextDecoder !== 'undefined') {
        text = new TextDecoder('utf-8').decode(data);
      } else {
        // Fallback for environments without TextDecoder
        text = Array.from(new Uint8Array(data)).map(b => String.fromCharCode(b)).join('');
      }
      
      // If it doesn't contain null bytes or control characters, it's likely text
      if (!/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(text)) {
        return text;
      }
    } catch (e) {
      // Ignore failures
    }
    return `[Binary Data: ${data.byteLength} bytes]`;
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return `[Blob: ${data.size} bytes]`;
  }
  
  try {
    return JSON.stringify(data);
  } catch (e) {
    return String(data);
  }
};

export class WebSocketInterceptor {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.originalWebSocket = global.WebSocket;
  }

  enable({ ignoreUrls = [] } = {}) {
    const self = this;
    if (!this.originalWebSocket) return;
    
    console.log('[NetworkDebugger] Monkey-patching global.WebSocket with Proxy-style interceptor...');
    
    const OriginalWS = this.originalWebSocket;

    function PatchedWebSocket(url, protocols) {
      const ws = new OriginalWS(url, protocols);
      
      const shouldIgnore = ignoreUrls.some(ignoreUrl => {
          if (typeof ignoreUrl === 'string') return url.includes(ignoreUrl);
          if (ignoreUrl instanceof RegExp) return ignoreUrl.test(url);
          return false;
      });

      if (shouldIgnore) return ws;

      const networkId = generateId();
      
      // Notify about connection attempt
      self.onEvent({
        id: networkId,
        type: 'websocket',
        event: 'connect',
        url: url,
        timestamp: Date.now(),
      });

      // ── Robust Listener Capture ──
      const addProxyListener = (eventName, eventType) => {
        ws.addEventListener(eventName, (e) => {
          self.onEvent({
            id: networkId,
            type: 'websocket',
            event: eventType,
            data: eventType === 'message_received' ? sanitizeData(e.data) : undefined,
            code: e.code,
            reason: e.reason,
            url: url,
            timestamp: Date.now(),
          });
        });
      };

      addProxyListener('open', 'open');
      addProxyListener('message', 'message_received');
      addProxyListener('close', 'close');
      addProxyListener('error', 'error');

      // ── Send Capture ──
      const originalSend = ws.send;
      ws.send = function(data) {
        try {
          self.onEvent({
            id: networkId,
            type: 'websocket',
            event: 'message_sent',
            data: sanitizeData(data),
            url: url,
            timestamp: Date.now(),
          });
        } catch (e) {
          // Fail gracefully — don't crash the user app because of a logger error
          console.error('[NetworkDebugger] Capture error:', e);
        }
        return originalSend.apply(this, arguments);
      };

      return ws;
    }

    // Ensure inheritance and static properties work
    PatchedWebSocket.prototype = OriginalWS.prototype;
    Object.assign(PatchedWebSocket, OriginalWS);

    global.WebSocket = PatchedWebSocket;
  }
}
