const instancesDiv = document.querySelector('.instances');
const eventsDiv = document.querySelector('.events');
const refreshBtn = document.getElementById('refreshBtn');
const createBtn = document.getElementById('createBtn');
const apiCreateBtn = document.getElementById('apiCreateBtn');
const exitBtn = document.getElementById('exitBtn');
const createPopup = document.querySelector('.createPopup');
const confirmPopup = document.querySelector('.confirmPopup');
const confirmBtn = document.getElementById('confirmBtn');

var events = []
var eventsIndex = 0

//---EVENTS---
function createEvent(name, type, message = 'pending') {
  const event = {
    id: eventsIndex++,
    name: name,
    message: message,
    type: type,
    time: new Date().toLocaleTimeString()
  };
  
  events.unshift(event);
    
  if (events.length > 50) {
    events.pop();
    }
    
  renderEvents();
  return event.id;
}

function renderEvents() {
  
    eventsDiv.innerHTML = events.map(event => `
            <div class="event">
              <div>Instance: ${event.name}</div>
              <div>Task: ${event.type} </div>
              <div id="event-status">Status: ${event.message} </div>
              <div>Timestamp: ${event.time}</div>
            </div>
    `).join('');
}

function updateEvent(id, data) {
   const event = events.find(e => e.id === id);
    if (event) {
        event.message = data;
        renderEvents();
    }
}

//--------

//---INSTANCES---
function displayInstances(instances) {
  if (instances.length === 0) {
    instancesDiv.innerHTML = "No instances found, try 'REFRESH' or 'CREATE'";
    return;
  }

  const html = instances.map(instances => `
    <div class="instance" >
      <strong>${instances.name}</strong> - ${instances.status}
      <button data-name="${instances.name}" data-action="delete" class="instanceBtn">DELETE</button>
      ${instances.status === 'Running' ? 
        `<button class="instanceBtn" data-name="${instances.name}" data-action="stop">STOP</button>` :
        `<button class="instanceBtn" data-name="${instances.name}" data-action="start">START</button>`
      }
      <button class="instanceBtn" onclick="openConsole('${instances.name}')">CONSOLE</button>
    </div>
  `).join('');
  
  instancesDiv.innerHTML = html;
}

async function loadInstances() {
  try {
    instancesDiv.innerHTML = 'Loading...';
    
    const response = await fetch('/api/instances');
    const result = await response.json();
    
    if (result.success) {
      displayInstances(result.data || []);
    } else {
      instancesDiv.innerHTML = `Error: ${result.error}`;
    }
  } catch (error) {
    instancesDiv.innerHTML = `Connection error: ${error.message}`;
  }
}

function openConsole(instanceName) {
    window.location.href = `/console/?instance=${instanceName}`;
}

instancesDiv.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('instanceBtn')) {
    return;
  }
  
  const instanceName = e.target.dataset.name;
  const action = e.target.dataset.action;
  
  if (action === 'delete') {
    showConfirmDialog(instanceName);
  } else if (action === 'start' || action === 'stop') {
    await controlInstance(instanceName, action);
  }
});

async function deleteInstance(name) {
  eventId = createEvent(name,"Delete Instance");
  try {
    
    const response = await fetch(`/api/instances`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const result = await response.json();
    if (result.success) {
      updateEvent(eventId,'Instance ' + name +' deleted')
      loadInstances();
    } else {
      updateEvent(eventId,'Error: ' + result.error)
    }
  } catch (error) {
    updateEvent(eventId,'Connection error: ' + error.message)
  }
}

async function createInstance(name, server, alias, type) {
    eventId = createEvent(name,"Create Instance");
    try {
        updateEvent(eventId, "Creating Instance " + name);
        const response = await fetch('api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, server, alias, type})
        });
        
        const result = await response.json();
        if (result.success) {
            updateEvent(eventId, "Instance " + name + " created");
            loadInstances();
        } else {
            updateEvent(eventId, "Error: " + result.error );
        }
    } catch (error) {
        updateEvent(eventId, "Connection error: " + error.message );
}
}

async function controlInstance(name, data) {
  eventId = createEvent(name,data);  
  try {
        const response = await fetch('/api/instances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data })
        });
        
        const result = await response.json();
        if (result.success) {
            updateEvent(eventId, result.data)
            loadInstances();
        } else {
            updateEvent(eventId, "Error: " + result.error)
        }
    } catch (error) {
        updateEvent(eventId, "Connection error: " + error.message)
    }
}
//------------

//---POP UP---

//Confirm
function showConfirmDialog(instanceName) {
  confirmPopup.style.visibility= "visible";
  confirmBtn.dataset.name = instanceName;
}

function hideConfirmDialog() {
  delete confirmBtn.dataset.name;
  confirmPopup.style.visibility= "hidden";
}

confirmPopup.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('confirmBtns')) {
    return;
  }

  const action = e.target.dataset.action;
  const instanceName = e.target.dataset.name;
  
  if (action === 'delete') {
    deleteInstance(instanceName)
    hideConfirmDialog();
  } else if (action === 'cancel') {
    hideConfirmDialog();
  }
});

//CREATE
function showCreateDialog() {
  createPopup.style.visibility= "visible";
}

function hideCreateDialog() {
  createPopup.style.visibility= "hidden";
}

createPopup.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('createBtns')) {
    return;
  }

  const action = e.target.dataset.action;
  
  if (action === 'create') {
    const name = document.getElementById('name').value;
    const server = document.getElementById('server').value;
    const alias = document.getElementById('alias').value;

    const typeRadio = document.querySelector('input[name="radio"]:checked');
    const type = typeRadio ? typeRadio.value : 'container';

    createInstance(name, server,alias, type);
    hideCreateDialog();
  } else if (action === 'exit') {
    hideCreateDialog();
  }
});

//-----------

refreshBtn.addEventListener('click', loadInstances);
createBtn.addEventListener('click', showCreateDialog);

document.addEventListener('DOMContentLoaded', loadInstances);