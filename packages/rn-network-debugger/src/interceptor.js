/**
 * Interceptor for Fetch and XHR in React Native
 */

const MAX_BODY_SIZE = 1000000; // 1MB limit for logs

const generateId = () => Math.random().toString(36).substring(2, 15);

export class NetworkInterceptor {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.originalFetch = global.fetch;
    this.originalXHR = global.XMLHttpRequest;
  }

  enable({ captureFetch = true, captureXHR = true, maskedHeaders = [] }) {
    if (captureFetch) this.interceptFetch(maskedHeaders);
    if (captureXHR) this.interceptXHR(maskedHeaders);
  }

  maskHeaders(headers, maskedList) {
    if (!headers) return headers;
    const masked = { ...headers };
    maskedList.forEach(key => {
      const lowerKey = key.toLowerCase();
      Object.keys(masked).forEach(h => {
        if (h.toLowerCase() === lowerKey) {
          masked[h] = '********';
        }
      });
    });
    return masked;
  }

  interceptFetch(maskedHeaders) {
    const self = this;
    console.log('[NetworkDebugger] Monkey-patching global.fetch...');
    global.fetch = async (...args) => {
      console.log('[NetworkDebugger] fetch() called');
      const id = generateId();
      const startTime = Date.now();
      const [input, init] = args;

      let url = '';
      let method = 'GET';
      let requestHeaders = {};
      let requestBody = null;

      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method;
        requestHeaders = Object.fromEntries(input.headers.entries());
      }

      if (init) {
        method = init.method || method;
        if (init.headers) {
          requestHeaders = { ...requestHeaders, ...(init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init.headers) };
        }
        requestBody = init.body;
      }

      this.onEvent({
        id,
        type: 'request',
        method,
        url,
        headers: this.maskHeaders(requestHeaders, maskedHeaders),
        requestBody: requestBody,
        timestamp: startTime,
      });

      try {
        const response = await this.originalFetch(...args);
        const endTime = Date.now();
        const responseClone = response.clone();

        let responseBody = '';
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('text/')) {
          responseBody = await responseClone.text();
          if (responseBody.length > MAX_BODY_SIZE) {
            responseBody = responseBody.substring(0, MAX_BODY_SIZE) + '... [Truncated]';
          }
        } else {
          responseBody = '[Binary Data]';
        }

        this.onEvent({
          id,
          type: 'response',
          status: response.status,
          responseHeaders: this.maskHeaders(Object.fromEntries(response.headers.entries()), maskedHeaders),
          responseBody: responseBody,
          duration: endTime - startTime,
          timestamp: endTime,
        });

        return response;
      } catch (error) {
        this.onEvent({
          id,
          type: 'error',
          error: error.message,
          timestamp: Date.now(),
        });
        throw error;
      }
    };
  }

  interceptXHR(maskedHeaders) {
    const self = this;
    const XMLHttpRequest = global.XMLHttpRequest;
    console.log('[NetworkDebugger] Monkey-patching XMLHttpRequest...');
    const send = XMLHttpRequest.prototype.send;
    const open = XMLHttpRequest.prototype.open;
    const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._network_id = generateId();
      this._network_method = method;
      this._network_url = url;
      this._network_request_headers = {};
      this._network_start_time = Date.now();
      return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      this._network_request_headers[header] = value;
      return setRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      self.onEvent({
        id: this._network_id,
        type: 'request',
        method: this._network_method,
        url: this._network_url,
        headers: self.maskHeaders(this._network_request_headers, maskedHeaders),
        requestBody: body,
        timestamp: this._network_start_time,
      });

      this.addEventListener('readystatechange', () => {
        if (this.readyState === 4) {
          const endTime = Date.now();
          let responseBody = '';
          try {
            responseBody = this.responseText;
            if (responseBody.length > MAX_BODY_SIZE) {
              responseBody = responseBody.substring(0, MAX_BODY_SIZE) + '... [Truncated]';
            }
          } catch (e) {
            responseBody = '[Non-text data]';
          }

          const responseHeaders = {};
          const headerString = this.getAllResponseHeaders();
          if (headerString) {
            headerString.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          self.onEvent({
            id: this._network_id,
            type: 'response',
            status: this.status,
            responseHeaders: self.maskHeaders(responseHeaders, maskedHeaders),
            responseBody: responseBody,
            duration: endTime - this._network_start_time,
            timestamp: endTime,
          });
        }
      });

      return send.apply(this, arguments);
    };
  }
}
