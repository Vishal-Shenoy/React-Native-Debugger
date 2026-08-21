# 🚀 RN Network Debugger Console

[![npm version](https://img.shields.io/npm/v/rn-network-debugger-console.svg?style=flat-square)](https://www.npmjs.com/package/rn-network-debugger-console)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A **zero-native**, production-ready network debugging SDK for React Native. No `react-native link`, no native code modifications. Just pure JavaScript interception.

![RN Debugger Banner](./packages/dashboard/public/rndebugger.png)

## ✨ Features

- 🚀 **Zero Native Dependencies**: Works with Expo (Managed & Bare) and React Native CLI.
- 📱 **Real-time Streaming**: Network logs are streamed instantly via WebSockets.
- 🔍 **Deep Inspection**: View request/response headers, JSON payloads, and precise timing.
- 🛡️ **Privacy First**: Built-in header masking (Authorization, Cookies) and payload size limits.
- ⚡ **Lightweight**: Minimal performance impact on your application.
- 🎨 **Modern Dashboard**: Sleek, responsive UI for monitoring network traffic.

## 📦 Installation

```bash
npm install rn-network-debugger-console
# or
yarn add rn-network-debugger-console
```

## 🚀 Quick Start

### 1. Initialize the SDK

Add the following to your app's entry point (e.g., `App.js` or `index.js`):

```javascript
import { startDebugger } from 'rn-network-debugger-console';

if (__DEV__) {
  startDebugger({
    port: 9000,           // Optional: default is 9000
    host: 'localhost',    // Optional: host of the bridge server
    maskedHeaders: ['Authorization', 'Cookie'], // Optional
  });
}
```

### 2. Launch the Debugger Console

Run the following command in your terminal to start the bridge server and open the dashboard:

```bash
npx rn-network-debugger-console
```

The dashboard will be available at [http://localhost:9000](http://localhost:9000).

## 📱 Android Setup

If you're debugging on an Android emulator or a physical device via USB, you need to reverse the port so the app can reach the local bridge server:

```bash
adb reverse tcp:9000 tcp:9000
```

## ⚙️ Configuration API

`startDebugger(options: DebuggerOptions)`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `port` | `number` | `9000` | Port for the WebSocket bridge server. |
| `host` | `string` | `'localhost'` | Hostname/IP of the bridge server. |
| `captureFetch` | `boolean` | `true` | Whether to intercept `fetch` calls. |
| `captureXHR` | `boolean` | `true` | Whether to intercept `XMLHttpRequest` calls. |
| `maskedHeaders` | `string[]` | `['Authorization', 'Cookie']` | Headers to redact from the console. |
| `maxPayloadSize` | `number` | `1024 * 1024` (1MB) | Maximum body size to capture per request. |

## 🏗️ How it Works

1. **SDK**: Monkey-patches `global.fetch` and `XMLHttpRequest` to capture network events.
2. **Bridge Server**: A lightweight Node.js server that acts as a relay between the mobile app and the dashboard.
3. **Dashboard**: A React + Vite web application that provides a real-time table view of all network activity.

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a PR.

## 📜 License

MIT © [Antigravity](https://github.com)
