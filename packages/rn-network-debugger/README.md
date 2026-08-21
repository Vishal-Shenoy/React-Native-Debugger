# rn-network-debugger-console

Zero-native network debugging for React Native. Intercept `fetch` and `XHR` requests and view them in a real-time web dashboard.

## Installation

```bash
npm install rn-network-debugger-console
```

## Usage

```javascript
import { startDebugger } from 'rn-network-debugger-console';

if (__DEV__) {
  startDebugger();
}
```

Then run:
```bash
npx rn-network-debugger-console
```

Open [http://localhost:9000](http://localhost:9000) to see your logs.

## Features
- Real-time network log streaming
- Zero native code (Pure JS)
- Request/Response body inspection
- Header masking
- Compatible with iOS, Android, and Web

## API

`startDebugger(options)`
- `port`: (number) Bridge server port (default: 9000)
- `host`: (string) Bridge server host (default: localhost)
- `maskedHeaders`: (string[]) Headers to mask (default: Authorization, Cookie)

License: MIT
