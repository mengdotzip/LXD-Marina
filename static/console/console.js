const urlParams = new URLSearchParams(window.location.search);
const instanceName = urlParams.get('instance');
const terminal = document.getElementById('terminal');
const term = new Terminal({
    cursorBlink: true,
    fontSize: 12,
    fontFamily: 'Trebuchet MS", Tahoma, sans-serif',
    theme: {
        background: '#ffffffff',
        foreground: '#000000ff',
        cursor: '#000000ff'
    }
});
var currentWebsocket

if (!instanceName) {
    terminal.value = 'Error: No instance name provided in URL';
} else {
    connectConsole();
}

async function connectConsole() {
    //const instanceName = document.getElementById('instanceName').value;
    term.open(document.getElementById('terminal'));
    if (!instanceName) {
        alert('Please enter an instance name');
        return;
    }
    
    const wsUrl = `ws://${window.location.host}/api/console/${instanceName}`;
    websocket = new WebSocket(wsUrl);
    currentWebsocket = websocket;
    
    websocket.onopen = function() {
        connected = true;
        term.clear();
    };
    
    websocket.onmessage = function(event) {
        term.write(event.data); 
    };
    
    websocket.onclose = function() {
        connected = false;
        term.writeln('\r\n=== Connection closed ===');
    };
    
    // Send terminal input to WebSocket
    term.onData(data => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(data);
        }
    });
}

window.addEventListener('beforeunload', function() {
    if (currentWebsocket) {
        currentWebsocket.close();
    }
});