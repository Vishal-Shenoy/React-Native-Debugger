/**
 * Interceptor for global console methods
 */

export class ConsoleInterceptor {
    constructor(onEvent) {
        this.onEvent = onEvent;
        this.originalConsole = { ...console };
    }

    getCallerFile() {
        try {
            const err = new Error();
            const stack = err.stack?.split('\n') || [];

            let callerLine = '';
            let functionName = '';

            // 1. Find the first meaningful line in the stack
            for (let i = 1; i < stack.length; i++) {
                const line = stack[i];
                if (!line || typeof line !== 'string') continue;

                const lowerLine = line.toLowerCase();
                // Skip our own frames
                if (lowerLine.includes('console-interceptor.js') ||
                    lowerLine.includes('getcallerfile') ||
                    lowerLine.includes('console[level]') ||
                    lowerLine.includes('native code')) {
                    continue;
                }

                callerLine = line.trim();
                break;
            }

            if (!callerLine) return 'app:unknown';

            // 2. Parse the line based on engine format
            // Regex for: "at FunctionName (http://...:line:col)" or "at http://...:line:col"
            const v8Match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
                callerLine.match(/at\s+(.*):(\d+):(\d+)/);

            if (v8Match) {
                const fn = v8Match.length === 5 ? v8Match[1] : '';
                const path = v8Match.length === 5 ? v8Match[2] : v8Match[1];
                const line = v8Match.length === 5 ? v8Match[3] : v8Match[2];

                const fileName = path.split('/').pop()?.split('?')[0] || 'app';
                const cleanFile = fileName.includes('bundle') ? 'App' : fileName;

                return fn ? `${fn} (${cleanFile}:${line})` : `${cleanFile}:${line}`;
            }

            // Regex for Hermes/iOS: "FunctionName@http://...:line:col"
            const jscMatch = callerLine.match(/(.*)@(.*):(\d+):(\d+)/);
            if (jscMatch) {
                const fn = jscMatch[1];
                const path = jscMatch[2];
                const line = jscMatch[3];

                const fileName = path.split('/').pop()?.split('?')[0] || 'app';
                const cleanFile = fileName.includes('bundle') ? 'App' : fileName;

                return fn ? `${fn} (${cleanFile}:${line})` : `${cleanFile}:${line}`;
            }

            // Fallback for raw address lines: "address:line:col"
            const genericMatch = callerLine.match(/(.*?):(\d+):(\d+)/);
            if (genericMatch) {
                const path = genericMatch[1];
                const line = genericMatch[2];
                const fileName = path.split('/').pop()?.split('?')[0] || 'app';
                const cleanFile = fileName.includes('bundle') ? 'App' : fileName;
                return `${cleanFile}:${line}`;
            }

            // If it's just a string, return the last bit of it
            return callerLine.length > 30 ? '...' + callerLine.slice(-27) : callerLine;
        } catch (e) {
            return 'debug:err';
        }
    }

    enable() {
        const levels = ['log', 'warn', 'error', 'info', 'debug'];

        levels.forEach(level => {
            const original = this.originalConsole[level];
            console[level] = (...args) => {
                const fileInfo = this.getCallerFile();

                // Send to debugger
                this.onEvent({
                    id: Math.random().toString(36).substring(2, 11),
                    type: 'console',
                    level: level,
                    file: fileInfo,
                    payload: args.map(arg => {
                        try {
                            let str = typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                            // Strip ANSI escape codes (like [0m, [32m, etc.)
                            return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-z]/g, '');
                        } catch (e) {
                            return '[Unserializable Object]';
                        }
                    }),
                    timestamp: Date.now(),
                });

                // Call original
                original.apply(console, args);
            };
        });
    }
}
