const instancesDiv = document.querySelector('.instances');
const refreshBtn = document.getElementById('refreshBtn');
const createBtn = document.getElementById('createBtn');

function displayContainers(containers) {
  if (containers.length === 0) {
    instancesDiv.innerHTML = "No instances found, try 'REFRESH' or 'CREATE'";
    return;
  }

  const html = containers.map(container => `
    <div style="padding: 10px; border-bottom: 1px solid">
      <strong>${container.name}</strong> - ${container.status}
    </div>
  `).join('');
  
  instancesDiv.innerHTML = html;
}

function showCreateDialog() {
    const name = prompt('Container name:');
    if (!name) return;
    const image = prompt('Image (e.g. ubuntu:22.04):');
    if (!image) return;
    createContainer(name, image);
}

async function loadContainers() {
  try {
    instancesDiv.innerHTML = 'Loading...';
    
    const response = await fetch('http://192.168.129.119:8080/api/instances');
    const result = await response.json();
    
    if (result.success) {
      displayContainers(result.data || []);
    } else {
      instancesDiv.innerHTML = `Error: ${result.error}`;
    }
  } catch (error) {
    instancesDiv.innerHTML = `Connection error: ${error.message}`;
  }
}

async function createContainer(name, image) {
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
            setTimeout(loadContainers, 10000);
        } else {
            instancesDiv.innerHTML = `Error: ${result.error}`;
        }
    } catch (error) {
        instancesDiv.innerHTML = `Connection error: ${error.message}`;
}
}

refreshBtn.addEventListener('click', loadContainers);
createBtn.addEventListener('click', showCreateDialog);

// on startup
document.addEventListener('DOMContentLoaded', loadContainers);