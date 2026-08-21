# Roadmap & Testing Strategy

## Testing Strategy

### 1. Interceptor Verification
- **Fetch Test**: Verify that `global.fetch` still returns a valid response while sending event data to the WebSocket.
- **XHR Test**: Test with libraries like `axios` and `frisbee` to ensure they work without modification.
- **Error Handling**: Simulate network failures (4xx, 5xx, or offline) and ensure the debugger captures the error without interfering with the app's error handling.
- **Binary Data**: Ensure fetching an image or a PDF doesn't crash the interceptor (should show "[Binary Data]").

### 2. Transport Reliability
- **Connection Loss**: Kill the server while the app is running. Verify that messages are queued in the SDK and flushed once the server is back online.
- **Reconnection**: Ensure the WebSocket client uses an exponential backoff or steady retry mechanism.

### 3. Dashboard Performance
- **Stress Test**: Inject 1000 requests per minute and verify that the UI remains responsive (using `useMemo` for filtering and limited list size).
- **Search/Filter**: Verify that typing in the search box filters the list in real-time.

---

## Roadmap

### MVP (Current)
- Basic Fetch/XHR interception.
- Real-time WebSocket streaming.
- Core Dashboard UI with Header/Payload/Response inspection.
- Sensitive header masking.
- Auto-host resolution for Android.

### v1.0 (Production Polish)
- Support for `multipart/form-data` (file uploads).
- Search within request/response bodies.
- Export logs as HAR file for sharing with backend teams.
- Configurable truncation limits per request.

### v1.5 (Advanced Features)
- **Request Replay**: Ability to "Re-run" a captured request from the dashboard (if the app is connected).
- **Conditional Breakpoints**: Pause the app execution when a specific URL or status code is encountered (requires deeper RN hooking).
- **Network Throttling**: Simulate slow 3G/GPRS speeds at the JS level.

### v2.0 (Remote Collaboration)
- **Cloud Proxy Mode**: Optional relay through a secure cloud server to debug real devices over the cellular network without LAN requirements.
- **Multi-client support**: Manage logs from multiple devices/simulators in a single dashboard session.
