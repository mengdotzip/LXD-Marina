"use strict";

import { Terminal } from 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/+esm';
import { FitAddon } from 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/+esm';

const urlParams = new URLSearchParams(window.location.search);
const instanceName = urlParams.get('instance');
const term = new Terminal({
    cursorBlink: true,
    fontSize: 12,
    fontFamily: 'monospace',
    rows: 30,
    cols: 140,
    theme: {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000'
    }
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
connectConsole();

async function connectConsole() {
    term.open(document.getElementById('terminal'));
    fitAddon.fit();
    
    if (!instanceName) {
        term.writeln('Error: No instance name provided');
        return;
    }
    
    const wsUrl = `ws://${window.location.host}/api/console/${instanceName}`;
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = function() {
        term.clear();
    };
    
    websocket.onmessage = function(event) {
        term.write(event.data);
    };
    
    websocket.onclose = function() {
        term.writeln('\r\n=== Connection closed ===');
    };
    
    term.onData(data => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(data);
        }
    });
    
    window.addEventListener('beforeunload', function() {
        if (websocket) {
            websocket.close();
        }
    });
    
    window.addEventListener('resize', () => {
        fitAddon.fit();
    });
}