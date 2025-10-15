"use strict";
import { createEvent, updateEvent } from "./events.js";

const instancesDiv = document.getElementById('instancesDiv');

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
      <button class="instanceBtn" onclick="window.openConsole('${instances.name}')">CONSOLE</button>
      ${instances.type !== "container" ? `<button class="instanceBtn" onclick="window.downloadVga('${instances.name}')">VGA</button>` : ``}
    </div>
  `).join('');
  
  instancesDiv.innerHTML = html;
}

export async function loadInstances() {
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

window.openConsole = function(instanceName) {
  window.location.href = `/console/?instance=${instanceName}`;
}

window.downloadVga = function(instanceName) {
  window.location.href = `/api/vga/download/${instanceName}`;
}

instancesDiv.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('instanceBtn')) {
    return;
  }
  
  const instanceName = e.target.dataset.name;
  const action = e.target.dataset.action;
  
  if (action === 'delete') {
    window.showConfirmDialog(instanceName);
  } else if (action === 'start' || action === 'stop') {
    await controlInstance(instanceName, action);
  }
});

export async function deleteInstance(name) {
  const eventId = createEvent(name,"Delete Instance");
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

export async function createInstance(name, server, alias, type) {
    const eventId = createEvent(name,"Create Instance");
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
  const eventId = createEvent(name,data);  
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