# Architecture: rn-network-debugger-console

## Overview
A zero-native-code network debugging SDK for React Native. It intercepts network traffic at the JavaScript level and streams it via WebSockets to a web-based dashboard.

## Components
1.  **SDK (`rn-network-debugger-console`)**: 
    - Intercepts `fetch` and `XMLHttpRequest`.
    - Detects environment (disables in production).
    - Manages WebSocket connection to the Debug Server.
    - Buffers logs if the server is temporarily unavailable.
2.  **Server**:
    - A Node.js WebSocket server that acts as a bridge.
    - Serves the Dashboard UI (Vite-built React app).
    - Manages multiple client connections (though usually 1-to-1).
3.  **Dashboard UI**:
    - React + Vite application.
    - Real-time visualization of requests.

    - Search, filtering, and deep inspection.

## Network Interception Strategy
- **Fetch**: Wraps `global.fetch`. Creates a unique ID for each request to track progress/completion.
- **XHR**: Wraps `XMLHttpRequest.prototype.open` and `send`. Hooks into `onreadystatechange` and `onload`.
- **Axios**: Since Axios uses XHR (or Fetch in some environments), intercepting both covers Axios without explicit logic, but we can add specific interception if needed for better metadata.

## Transport
- **WebSocket**: Bi-directional communication.
- **Auto-Discovery**: 
    - Android: Defaults to `10.0.2.2`.
    - iOS/Real Device: Defaults to `localhost` (requires `adb reverse` or similar) or attempts to find LAN IP.

## Performance & Safety
- **Payload Limits**: Truncates large bodies.
- **Sensitive Data**: Default masking for `Authorization`, `Cookie`, etc.
- **Non-Invasive**: Errors in the debugger should never crash the host app.
