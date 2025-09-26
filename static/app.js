const instancesDiv = document.querySelector('.instances');
const refreshBtn = document.getElementById('refreshBtn');
const createBtn = document.getElementById('createBtn');


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
    </div>
  `).join('');
  
  instancesDiv.innerHTML = html;
}

instancesDiv.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('instanceBtn')) {
    return;
  }
  
  const instanceName = e.target.dataset.name;
  const action = e.target.dataset.action;
  
  if (action === 'delete') {
    await deleteInstance(instanceName);
  } else if (action === 'start' || action === 'stop') {
    await controlInstance(instanceName, action);
  }
});


async function deleteInstance(name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) {
    return;
  }
  
  try {
    instancesDiv.innerHTML = `Deleting ${name}...`;
    
    const response = await fetch(`http://192.168.129.119:8080/api/instances`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const result = await response.json();
    if (result.success) {
      instancesDiv.innerHTML = `Instance "${name}" deleted!`;
      setTimeout(loadInstances, 2000);
    } else {
      instancesDiv.innerHTML = `Error: ${result.error}`;
    }
  } catch (error) {
    instancesDiv.innerHTML = `Connection error: ${error.message}`;
  }
}

function showCreateDialog() {
    const name = prompt('instances name:');
    if (!name) return;
    const image = prompt('Image (e.g. ubuntu:22.04):');
    if (!image) return;
    createInstance(name, image);
}

async function loadInstances() {
  try {
    instancesDiv.innerHTML = 'Loading...';
    
    const response = await fetch('http://192.168.129.119:8080/api/instances');
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

async function createInstance(name, image) {
    try {
        instancesDiv.innerHTML = `Creating container "${name}"...`;
        const response = await fetch('http://192.168.129.119:8080/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image })
        });
        
        const result = await response.json();
        if (result.success) {
            instancesDiv.innerHTML = `Container "${name}" created!`;
            setTimeout(loadInstances, 2000);
        } else {
            instancesDiv.innerHTML = `Error: ${result.error}`;
        }
    } catch (error) {
        instancesDiv.innerHTML = `Connection error: ${error.message}`;
}
}

async function controlInstance(name, data) {
    try {
        instancesDiv.innerHTML = `${data === 'start' ? 'Starting' : 'Stopping'} ${name}...`;
        const response = await fetch('http://192.168.129.119:8080/api/instances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data })
        });
        
        const result = await response.json();
        if (result.success) {
            instancesDiv.innerHTML = `${result.data}`;
            setTimeout(loadInstances, 2000);
        } else {
            instancesDiv.innerHTML = `Error: ${result.error}`;
        }
    } catch (error) {
        instancesDiv.innerHTML = `Connection error: ${error.message}`;
    }
}


refreshBtn.addEventListener('click', loadInstances);
createBtn.addEventListener('click', showCreateDialog);

// on startup
document.addEventListener('DOMContentLoaded', loadInstances);