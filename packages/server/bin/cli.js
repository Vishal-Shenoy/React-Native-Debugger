#!/usr/bin/env node

const { startServer } = require('../src/index');

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
let port = 9000;

if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1], 10);
}

startServer(port);
