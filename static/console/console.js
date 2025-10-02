const urlParams = new URLSearchParams(window.location.search);
const instanceName = urlParams.get('instance');
const terminal = document.getElementById('terminal');

var currentWebsocket

if (!instanceName) {
    terminal.value = 'Error: No instance name provided in URL';
} else {
    connectConsole();
}

function appendToTerminal(text) {
    terminal.value += text;
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    terminal.value = '';
}

async function connectConsole() {
    if (!instanceName) {
        alert('Please enter an instance name');
        return;
    }
    
    const wsUrl = `ws://${window.location.host}/api/console/${instanceName}`;
    
    console.log('Connecting to:', wsUrl);
    
    websocket = new WebSocket(wsUrl);
    currentWebsocket = websocket;
    
    websocket.onopen = function() {
        connected = true;
        appendToTerminal('Connected');
        terminal.readOnly = false;
        terminal.focus();
    };
    
    websocket.onmessage = function(event) {
        appendToTerminal(event.data);
    };
    
    websocket.onclose = function() {
        connected = false;
        appendToTerminal('\n=== Connection closed ===\n');
        websocket.send('exit \r')
        terminal.readOnly = true;
    };
    
    websocket.onerror = function(error) {
        console.error('WebSocket error:', error);
        appendToTerminal('Error');
    };
}

//Doing the terminal ourselve is such a mess, I will switch to xterm.js asap.
terminal.addEventListener('keydown', function(e) {
    if (!connected || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    e.preventDefault();
    
    let keyToSend = null;
    
    if (e.key === 'Enter') {
        keyToSend = '\r';
    } else if (e.key === 'Backspace') {
        keyToSend = '\x7f'; 
    } else if (e.key === 'Tab') {
        keyToSend = '\t';
    } else if (e.key === 'Escape') {
        keyToSend = '\x1b';
    } else if (e.key === 'ArrowUp') {
        keyToSend = '\x1b[A';
    } else if (e.key === 'ArrowDown') {
        keyToSend = '\x1b[B';
    } else if (e.key === 'ArrowRight') {
        keyToSend = '\x1b[C';
    } else if (e.key === 'ArrowLeft') {
        keyToSend = '\x1b[D';
    } else if (e.key === 'Home') {
        keyToSend = '\x1b[H';
    } else if (e.key === 'End') {
        keyToSend = '\x1b[F';
    } else if (e.key === 'Delete') {
        keyToSend = '\x1b[3~';
    } else if (e.key === 'PageUp') {
        keyToSend = '\x1b[5~';
    } else if (e.key === 'PageDown') {
        keyToSend = '\x1b[6~';
    } else if (e.ctrlKey) {

        if (e.key === 'c') {
            keyToSend = '\x03'; // Ctrl+C
        } else if (e.key === 'd') {
            keyToSend = '\x04'; // Ctrl+D
        } else if (e.key === 'z') {
            keyToSend = '\x1a'; // Ctrl+Z
        } else if (e.key === 'l') {
            keyToSend = '\x0c'; // Ctrl+L (clear screen)
        }
    } else if (e.key.length === 1) {
        // Regular printable characters
        keyToSend = e.key;
    }
    
    if (keyToSend !== null) {
        console.log('Sending key:', JSON.stringify(keyToSend));
        websocket.send(keyToSend);
    }
});

terminal.addEventListener('keypress', function(e) {
    e.preventDefault();
});

terminal.addEventListener('keyup', function(e) {
    e.preventDefault();
});

terminal.addEventListener('paste', function(e) {
    if (!connected || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    console.log('Pasting:', JSON.stringify(paste));
    websocket.send(paste);
});


terminal.addEventListener('paste', function(e) {
    if (!connected || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    console.log('Pasting:', JSON.stringify(paste));
    websocket.send(paste);
});

// Make sure terminal gets focus when clicked
terminal.addEventListener('click', function() {
    terminal.focus();
});

window.addEventListener('beforeunload', function() {
    if (currentWebsocket) {
        currentWebsocket.close();
    }
});